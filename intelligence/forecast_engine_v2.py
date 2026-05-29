#!/usr/bin/env python3
"""
Taiwan Maami — Demand Forecasting & Intelligence Engine V2
Built against ACTUAL production schema (clean_sales, item_total_rupees, channel_label)

Runs daily via GitHub Actions (add to your existing ETL workflow)
Environment: SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import os
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("maami-forecast")


class MaamiIntelligenceEngine:
    def __init__(self):
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        self.supabase = create_client(url, key)
        self.outlets = ["palladium", "tnagar", "annanagar"]

    # ──────────────────────────────────────────────────────────────
    # 1. FETCH — Query clean_sales (never sales_facts directly)
    # ──────────────────────────────────────────────────────────────
    def fetch_sales(self, days=90):
        """Pull from clean_sales view per architecture rules."""
        start = (datetime.now() - timedelta(days=days)).isoformat()
        logger.info(f"Fetching clean_sales since {start[:10]}...")

        response = (
            self.supabase.table("clean_sales")
            .select("order_date, order_timestamp, outlet, channel_label, item_total_rupees, item_name, item_quantity")
            .gte("order_date", start[:10])
            .execute()
        )

        rows = response.data
        logger.info(f"Loaded {len(rows):,} line items")

        # Derive daily order-level aggregations
        days_data = defaultdict(lambda: {"revenue": 0, "items": 0, "orders": set()})
        outlet_days = defaultdict(lambda: {"revenue": 0, "items": 0, "orders": set()})
        hourly = defaultdict(lambda: {"orders": 0, "revenue": 0})
        items = defaultdict(lambda: {"qty": 0, "revenue": 0})

        for r in rows:
            day = r["order_date"]
            outlet = r.get("outlet", "unknown")
            channel = r.get("channel_label", "unknown")
            oid = r.get("source_order_id", f"{day}_{outlet}")

            # Daily totals
            days_data[day]["revenue"] += r.get("item_total_rupees", 0)
            days_data[day]["items"] += r.get("item_quantity", 1)
            days_data[day]["orders"].add(oid)

            # Outlet-channel daily
            key = (day, outlet, channel)
            outlet_days[key]["revenue"] += r.get("item_total_rupees", 0)
            outlet_days[key]["orders"].add(oid)

            # Hourly (from order_timestamp)
            ts = r.get("order_timestamp", "")
            if ts:
                try:
                    h = datetime.fromisoformat(ts.replace("Z", "+00:00")).hour
                    hourly[(h, outlet)]["orders"] += 1
                    hourly[(h, outlet)]["revenue"] += r.get("item_total_rupees", 0)
                except ValueError:
                    pass

            # Item-level
            item_key = r.get("item_name", "unknown").split("(")[0].strip()
            items[item_key]["qty"] += r.get("item_quantity", 1)
            items[item_key]["revenue"] += r.get("item_total_rupees", 0)

        return {
            "daily": [{"date": d, **v, "orders": len(v["orders"])} for d, v in days_data.items()],
            "outlet_daily": [{"date": k[0], "outlet": k[1], "channel": k[2], **v, "orders": len(v["orders"])} for k, v in outlet_days.items()],
            "hourly": [{"hour": k[0], "outlet": k[1], **v} for k, v in hourly.items()],
            "items": [{"name": k, **v} for k, v in items.items()],
        }

    # ──────────────────────────────────────────────────────────────
    # 2. FORECAST — 7-day ahead prediction
    # ──────────────────────────────────────────────────────────────
    def forecast_next_7_days(self, data):
        """Day-of-week average with 2-week trend adjustment."""
        daily = data["daily"]
        if not daily:
            logger.warning("No daily data for forecasting")
            return []

        # Day-of-week averages
        dow = defaultdict(list)
        for d in daily:
            dt = datetime.strptime(d["date"], "%Y-%m-%d")
            dow[dt.weekday()].append(d["revenue"])

        dow_avg = {}
        for day, revs in dow.items():
            avg = sum(revs) / len(revs)
            variance = sum((r - avg) ** 2 for r in revs) / len(revs)
            dow_avg[day] = {"avg": avg, "std": variance ** 0.5, "n": len(revs)}

        # Trend: last 14 days vs prior 14 days
        now = datetime.now().date()
        recent = [d for d in daily if (now - datetime.strptime(d["date"], "%Y-%m-%d").date()).days <= 14]
        older = [d for d in daily if 14 < (now - datetime.strptime(d["date"], "%Y-%m-%d").date()).days <= 28]

        recent_rev = sum(d["revenue"] for d in recent)
        older_rev = sum(d["revenue"] for d in older)
        trend = max(0.8, min(1.2, recent_rev / older_rev)) if older_rev > 0 else 1.0

        logger.info(f"Trend factor: {trend:.3f} (recent ₹{recent_rev:,.0f} vs older ₹{older_rev:,.0f})")

        # Build forecast
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        forecast = []
        for i in range(1, 8):
            future = now + timedelta(days=i)
            dow_idx = future.weekday()
            stats = dow_avg.get(dow_idx, {"avg": 0, "std": 0, "n": 0})

            base = stats["avg"] * trend
            std = stats["std"]

            forecast.append({
                "forecast_date": future.isoformat(),
                "day_name": day_names[dow_idx],
                "predicted_revenue_inr": round(base),
                "lower_bound_inr": round(max(base - std, base * 0.6)),
                "upper_bound_inr": round(base + std),
                "trend_factor": round(trend, 3),
                "confidence": "high" if stats["n"] >= 6 else "medium",
                "created_at": datetime.now().isoformat(),
            })

        return forecast

    # ──────────────────────────────────────────────────────────────
    # 3. BOBA BATCH SCHEDULE — Per outlet
    # ──────────────────────────────────────────────────────────────
    def boba_batch_schedule(self, data, outlet="tnagar"):
        """Recommend boba cooking times based on hourly demand patterns."""
        hourly = [h for h in data["hourly"] if h["outlet"] == outlet]
        if not hourly:
            return []

        # Top 4 peak hours by order volume
        by_orders = sorted(hourly, key=lambda x: x["orders"], reverse=True)[:4]

        schedule = []
        for peak in sorted(by_orders, key=lambda x: x["hour"]):
            cook_hour = max(0, int(peak["hour"] - 1.5))
            orders = peak["orders"]
            # ~150g boba per drink order, round up to 2kg min batch
            batch_kg = max(2, round(orders * 0.15))

            schedule.append({
                "outlet": outlet,
                "cook_at_hour": cook_hour,
                "ready_for_peak_hour": peak["hour"],
                "estimated_orders": orders,
                "recommended_boba_kg": batch_kg,
                "created_at": datetime.now().isoformat(),
            })

        return schedule

    # ──────────────────────────────────────────────────────────────
    # 4. SAVE TO SUPABASE
    # ──────────────────────────────────────────────────────────────
    def save_forecasts(self, forecasts):
        if not forecasts:
            return
        self.supabase.table("forecasts").upsert(forecasts, on_conflict="forecast_date").execute()
        logger.info(f"Saved {len(forecasts)} forecast records")

    def save_batch_schedule(self, schedule):
        if not schedule:
            return
        # Delete old schedules for today, insert new
        today = datetime.now().date().isoformat()
        self.supabase.table("batch_schedule").delete().gte("created_at", today).execute()
        self.supabase.table("batch_schedule").insert(schedule).execute()
        logger.info(f"Saved {len(schedule)} batch schedule records")

    # ──────────────────────────────────────────────────────────────
    # 5. MAIN PIPELINE
    # ──────────────────────────────────────────────────────────────
    def run(self):
        logger.info("=" * 50)
        logger.info("Taiwan Maami Intelligence Engine V2")
        logger.info(f"Run time: {datetime.now().isoformat()}")
        logger.info("=" * 50)

        data = self.fetch_sales(days=90)

        # Forecast
        forecast = self.forecast_next_7_days(data)
        logger.info("\n📈 7-Day Forecast:")
        for f in forecast:
            logger.info(f"  {f['day_name']:<10} {f['forecast_date']}  "
                        f"₹{f['predicted_revenue_inr']:>8,}  "
                        f"(₹{f['lower_bound_inr']:>7,} - ₹{f['upper_bound_inr']:>7,})  "
                        f"[{f['confidence']}]")

        # Boba schedule per outlet
        for outlet in ["tnagar", "palladium"]:
            schedule = self.boba_batch_schedule(data, outlet)
            if schedule:
                logger.info(f"\n🧋 {outlet} Boba Schedule:")
                for s in schedule:
                    logger.info(f"  Cook {s['recommended_boba_kg']}kg at {s['cook_at_hour']:02d}:00  "
                                f"-> ready for {s['ready_for_peak_hour']:02d}:00 peak")
                self.save_batch_schedule(schedule)

        # Save
        self.save_forecasts(forecast)

        logger.info("\n" + "=" * 50)
        logger.info("Pipeline complete")
        logger.info("=" * 50)

        return {"forecast": forecast}


if __name__ == "__main__":
    engine = MaamiIntelligenceEngine()
    engine.run()
