#!/usr/bin/env python3
"""
Taiwan Maami — Enhanced Daily Intelligence Digest V2
Built against ACTUAL production schema (clean_sales, item_total_rupees, channel_label)

Usage:
  export SUPABASE_URL="your-url"
  export SUPABASE_SERVICE_KEY="your-key"
  python daily_digest_v2.py
"""

import os
from datetime import datetime, timedelta
from supabase import create_client


class DailyDigest:
    def __init__(self):
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        self.supabase = create_client(url, key)
        self.today = datetime.now().date()

    def fetch_summary(self):
        response = (
            self.supabase.table("daily_summary")
            .select("*")
            .eq("sale_date", self.today.isoformat())
            .execute()
        )
        return response.data

    def fetch_forecast(self):
        tomorrow = (self.today + timedelta(days=1)).isoformat()
        response = (
            self.supabase.table("forecasts")
            .select("*")
            .eq("forecast_date", tomorrow)
            .execute()
        )
        return response.data[0] if response.data else None

    def fetch_stars(self):
        response = (
            self.supabase.table("menu_engineering")
            .select("*")
            .eq("menu_class", "STAR")
            .order("total_revenue", desc=True)
            .limit(3)
            .execute()
        )
        return response.data

    def fetch_dogs(self):
        response = (
            self.supabase.table("menu_engineering")
            .select("*")
            .eq("menu_class", "DOG")
            .order("times_ordered")
            .limit(3)
            .execute()
        )
        return response.data

    def fetch_wastage(self):
        response = (
            self.supabase.table("production_wastage_summary")
            .select("*")
            .eq("summary_date", self.today.isoformat())
            .execute()
        )
        return response.data

    def fetch_pl(self):
        month = self.today.strftime("%Y-%m") + "-01"
        response = (
            self.supabase.table("pl_summary")
            .select("*")
            .eq("month", month)
            .execute()
        )
        return response.data[0] if response.data else None

    def fetch_corroboration(self):
        month = self.today.strftime("%Y-%m") + "-01"
        response = (
            self.supabase.table("cogs_corroboration")
            .select("*")
            .eq("month", month)
            .execute()
        )
        return response.data[0] if response.data else None

    def fetch_uncategorised_bank(self):
        month = self.today.strftime("%Y-%m")
        response = (
            self.supabase.table("bank_transactions")
            .select("*", count="exact")
            .eq("statement_month", month)
            .eq("ledger_type", "uncategorised")
            .execute()
        )
        return response.data

    # ──────────────────────────────────────────────────────────────
    # FORMATTERS
    # ──────────────────────────────────────────────────────────────

    def format_revenue(self, summary_rows):
        lines = [f"💰 REVENUE  —  {self.today.strftime('%A, %d %B %Y')}", ""]
        total_rev = 0
        total_orders = 0

        for row in summary_rows:
            outlet = row["outlet"].upper()
            channel = row["channel_label"]
            rev = row["revenue"]
            orders = row["orders"]
            aov = row["aov"]
            wow = row.get("revenue_wow_pct")
            total_rev += rev or 0
            total_orders += orders or 0

            wow_str = ""
            if wow is not None:
                arrow = "↑" if wow > 0 else "↓"
                wow_str = f" {arrow}{abs(wow):.0f}%"

            lines.append(f"  {outlet} ({channel}): ₹{rev or 0:,.0f} ({orders or 0} orders, AOV ₹{aov or 0:.0f}){wow_str}")

        lines.insert(1, f"  TOTAL: ₹{total_rev:,.0f} | {total_orders} orders")
        return "\n".join(lines)

    def format_forecast(self, forecast):
        if not forecast:
            return "\n📈 TOMORROW\n  Forecast not yet generated\n"
        return (f"\n📈 TOMORROW ({forecast['day_name']})\n"
                f"  Predicted: ₹{forecast['predicted_revenue_inr']:,}\n"
                f"  Range: ₹{forecast['lower_bound_inr']:,} - ₹{forecast['upper_bound_inr']:,}\n"
                f"  Confidence: {forecast['confidence']}\n")

    def format_menu(self, stars, dogs):
        lines = ["\n🍜 MENU INSIGHTS"]
        if stars:
            lines.append("  ⭐ STARS — promote these:")
            for s in stars[:3]:
                lines.append(f"     • {s['display_name']} — {s['times_ordered']} orders, GM {s['gross_margin_pct']}%")
        if dogs:
            lines.append("  ▼ DOGS — review:")
            for d in dogs[:3]:
                lines.append(f"     • {d['display_name']} — only {d['times_ordered']} orders")
        return "\n".join(lines)

    def format_wastage(self, wastage_rows):
        if not wastage_rows:
            return "\n🗑️ WASTAGE\n  (pending stock take sync)\n"
        lines = ["\n🗑️ WASTAGE TODAY"]
        for w in wastage_rows[:3]:
            status = "🔴" if w["status"] == "ABOVE_TARGET" else "⚠️" if w["status"] == "WATCH" else "✅"
            lines.append(f"  {status} {w['item_name']}: {w['wastage_pct']}% wasted "
                        f"({w['batches_expired']} expired)")
        return "\n".join(lines)

    def format_pl(self, pl):
        if not pl:
            return ""
        return (f"\n📊 MONTH P&L ({self.today.strftime('%B %Y')})\n"
                f"  Revenue:     ₹{pl['gross_revenue']:>10,.0f}\n"
                f"  COGS:        ₹{pl['cogs_inr']:>10,.0f} ({pl['gross_margin_pct']}% GM)\n"
                f"  OpEx:        ₹{pl['operating_expenses']:>10,.0f}\n"
                f"  Net Profit:  ₹{pl['net_profit']:>10,.0f} ({pl['net_margin_pct']}% NM)\n")

    def format_corroboration(self, corr):
        if not corr:
            return ""
        status = "✅" if corr["corroboration_status"] == "ALIGNED" else "⚠️"
        return (f"\n🔍 COGS CORROBORATION\n"
                f"  {status} Recipe COGS: ₹{corr['recipe_cogs_inr']:,.0f}\n"
                f"     Bank evidence: ₹{corr['bank_cogs_inr']:,.0f}\n"
                f"     Variance: {corr['variance_pct']}%\n"
                f"     Status: {corr['corroboration_status']}\n")

    def format_uncategorised_alert(self, uncategorised):
        if not uncategorised:
            return "\n📋 BANK REVIEW\n  All transactions categorised ✅\n"

        total = sum(u.get("debit_amount", 0) or 0 for u in uncategorised)
        lines = [f"\n📋 BANK REVIEW — {len(uncategorised)} uncategorised ({self.today.strftime('%B %Y')})"]
        for u in uncategorised[:5]:
            lines.append(f"  ⚠️ ₹{u.get('debit_amount', 0)} — {u['description'][:55]}")
        if len(uncategorised) > 5:
            lines.append(f"  ... and {len(uncategorised) - 5} more")
        lines.append(f"  Total: ₹{total:,.0f} — run bank_ingestion.py or review in Supabase")
        return "\n".join(lines)

    # ──────────────────────────────────────────────────────────────
    # GENERATE FULL DIGEST
    # ──────────────────────────────────────────────────────────────
    def generate(self):
        summary = self.fetch_summary()
        forecast = self.fetch_forecast()
        stars = self.fetch_stars()
        dogs = self.fetch_dogs()
        wastage = self.fetch_wastage()
        pl = self.fetch_pl()
        corr = self.fetch_corroboration()
        uncategorised = self.fetch_uncategorised_bank()

        sections = [
            f"🏪 Taiwan Maami — Daily Intelligence",
            self.format_revenue(summary),
            self.format_forecast(forecast),
            self.format_menu(stars, dogs),
            self.format_wastage(wastage),
            self.format_pl(pl),
            self.format_corroboration(corr),
            self.format_uncategorised_alert(uncategorised),
            "",
            "═" * 40,
            "Generated by Maami Intelligence Engine",
        ]

        return "\n".join(sections)

    def run(self):
        digest = self.generate()
        print(digest)
        return digest


if __name__ == "__main__":
    DailyDigest().run()
