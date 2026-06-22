#!/usr/bin/env python3
"""
Taiwan Maami — Sales & GST Report (Daily / Weekly / Monthly)

Queries clean_sales in Supabase via table select, aggregates in Python,
builds an HTML table with outlet subtotals and grand total, then saves
the report as an HTML file (uploaded as GitHub Actions artifact).

Usage:
  python intelligence/sales_gst_report.py --period daily
  python intelligence/sales_gst_report.py --period weekly
  python intelligence/sales_gst_report.py --period monthly
  python intelligence/sales_gst_report.py --test  # hardcoded May 2026 test

Required env vars:
  SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import argparse
import os
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta

from supabase import create_client


# ─── Date range helpers ───────────────────────────────────────────────────────

def get_date_range(period: str) -> tuple[date, date, str]:
    """Return (start_date, end_date, period_label) based on cadence."""
    today = date.today()

    if period == "daily":
        d = today - timedelta(days=1)
        return d, d, d.strftime("%-d %B %Y")

    elif period == "weekly":
        # Previous Monday–Sunday
        days_since_monday = today.weekday()  # Mon=0
        last_monday = today - timedelta(days=days_since_monday + 7)
        last_sunday = last_monday + timedelta(days=6)
        label = f"Week of {last_monday.strftime('%-d')}–{last_sunday.strftime('%-d %B %Y')}"
        return last_monday, last_sunday, label

    elif period == "monthly":
        # Previous full calendar month
        first_of_this_month = today.replace(day=1)
        last_day_prev = first_of_this_month - timedelta(days=1)
        first_day_prev = last_day_prev.replace(day=1)
        label = first_day_prev.strftime("%B %Y")
        return first_day_prev, last_day_prev, label

    else:
        raise ValueError(f"Unknown period: {period}")


# ─── Data fetching & aggregation ─────────────────────────────────────────────

def fetch_data(start_date: date, end_date: date) -> list[dict]:
    """
    Fetch raw rows from clean_sales for the date range, then aggregate
    in Python to produce: outlet, channel_label, orders, revenue, gst_collected.
    
    Uses paginated fetches (Supabase default limit is 1000 rows).
    """
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    client = create_client(url, key)

    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    # Fetch all rows with pagination (Supabase returns max 1000 per request)
    all_rows = []
    page_size = 1000
    offset = 0

    while True:
        response = (
            client.table("clean_sales")
            .select("outlet, channel_label, source_order_id, item_total_rupees, item_sequence, order_tax_rupees")
            .gte("order_date", start_str)
            .lte("order_date", end_str)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    print(f"  Fetched {len(all_rows):,} line items from clean_sales")

    # Aggregate in Python:
    # GROUP BY outlet, channel_label
    # COUNT(DISTINCT source_order_id) as orders
    # SUM(item_total_rupees) as revenue
    # SUM(order_tax_rupees WHERE item_sequence = 0) as gst_collected
    groups = defaultdict(lambda: {"orders": set(), "revenue": 0.0, "gst_collected": 0.0})

    for row in all_rows:
        outlet = row.get("outlet") or "Unknown"
        channel = row.get("channel_label") or "Unknown"
        key_tuple = (outlet, channel)

        groups[key_tuple]["orders"].add(row.get("source_order_id"))
        groups[key_tuple]["revenue"] += float(row.get("item_total_rupees") or 0)

        # GST: only count once per order (item_sequence = 0)
        if row.get("item_sequence") == 0:
            groups[key_tuple]["gst_collected"] += float(row.get("order_tax_rupees") or 0)

    # Capitalise outlet names for display
    OUTLET_DISPLAY = {
        "palladium": "Palladium",
        "tnagar": "T.Nagar",
        "annanagar": "Anna Nagar",
    }

    # Convert to list of dicts, sorted by outlet then channel
    result = []
    for (outlet, channel), agg in sorted(groups.items()):
        display_name = OUTLET_DISPLAY.get(outlet, outlet.title())
        channel_display = channel.title() if channel else "Unknown"
        result.append({
            "outlet": display_name,
            "channel_label": channel_display,
            "orders": len(agg["orders"]),
            "revenue": agg["revenue"],
            "gst_collected": agg["gst_collected"],
        })

    return result


# ─── Report builder ──────────────────────────────────────────────────────────

def fmt_indian(amount: float) -> str:
    """Format a number in Indian numbering (e.g. 9,34,480.00)."""
    if amount < 0:
        return "-" + fmt_indian(-amount)
    integer_part = int(round(amount * 100)) // 100  # truncate to avoid float drift
    # Use proper rounding
    rounded = round(amount, 2)
    integer_part = int(rounded)
    decimal_part = f".{int(round((rounded - integer_part) * 100)):02d}"

    s = str(integer_part)
    if len(s) <= 3:
        return s + decimal_part
    result = s[-3:]
    s = s[:-3]
    while s:
        result = s[-2:] + "," + result
        s = s[:-2]
    return result + decimal_part


def build_html_report(rows: list[dict], period_label: str) -> str:
    """Build a clean HTML report with the sales table."""

    # Group by outlet (preserve order from sorted input)
    outlets: dict[str, list[dict]] = {}
    for row in rows:
        outlet = row["outlet"]
        outlets.setdefault(outlet, []).append(row)

    # Table rows
    table_rows = ""
    grand_orders = 0
    grand_revenue = 0.0
    grand_gst = 0.0

    for outlet, channel_rows in outlets.items():
        outlet_orders = 0
        outlet_revenue = 0.0
        outlet_gst = 0.0

        for r in channel_rows:
            orders = int(r["orders"])
            revenue = float(r["revenue"])
            gst = float(r["gst_collected"])
            outlet_orders += orders
            outlet_revenue += revenue
            outlet_gst += gst

            table_rows += f"""
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eee;">{outlet}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee;">{r['channel_label']}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:right;">{orders:,}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:right;">{fmt_indian(revenue)}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:right;">{fmt_indian(gst)}</td>
            </tr>"""

        grand_orders += outlet_orders
        grand_revenue += outlet_revenue
        grand_gst += outlet_gst

        # Outlet subtotal
        table_rows += f"""
        <tr style="background:#f8f8f8; font-weight:600;">
            <td style="padding:8px 12px; border-bottom:2px solid #ddd;">{outlet} Total</td>
            <td style="padding:8px 12px; border-bottom:2px solid #ddd;"></td>
            <td style="padding:8px 12px; border-bottom:2px solid #ddd; text-align:right;">{outlet_orders:,}</td>
            <td style="padding:8px 12px; border-bottom:2px solid #ddd; text-align:right;">{fmt_indian(outlet_revenue)}</td>
            <td style="padding:8px 12px; border-bottom:2px solid #ddd; text-align:right;">{fmt_indian(outlet_gst)}</td>
        </tr>"""

    # Grand total
    table_rows += f"""
    <tr style="background:#2d2d2d; color:#fff; font-weight:700;">
        <td style="padding:10px 12px;">GRAND TOTAL</td>
        <td style="padding:10px 12px;"></td>
        <td style="padding:10px 12px; text-align:right;">{grand_orders:,}</td>
        <td style="padding:10px 12px; text-align:right;">{fmt_indian(grand_revenue)}</td>
        <td style="padding:10px 12px; text-align:right;">{fmt_indian(grand_gst)}</td>
    </tr>"""

    html = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#333; padding:20px;">
    <h2 style="margin-bottom:4px;">Taiwan Maami &mdash; {period_label} Sales &amp; GST Summary</h2>
    <p style="color:#666; margin-top:0;">Generated on {datetime.now().strftime('%d %B %Y, %I:%M %p')}</p>
    <table style="border-collapse:collapse; width:100%; max-width:700px; font-size:14px;">
        <thead>
            <tr style="background:#9e0b0f; color:#fff;">
                <th style="padding:10px 12px; text-align:left;">Outlet</th>
                <th style="padding:10px 12px; text-align:left;">Channel</th>
                <th style="padding:10px 12px; text-align:right;">Orders</th>
                <th style="padding:10px 12px; text-align:right;">Revenue (&#8377;)</th>
                <th style="padding:10px 12px; text-align:right;">GST Collected (&#8377;)</th>
            </tr>
        </thead>
        <tbody>
            {table_rows}
        </tbody>
    </table>
    <p style="color:#999; font-size:12px; margin-top:20px;">
        This is an automated report from Taiwan Maami Intelligence.
    </p>
</body>
</html>"""
    return html


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Taiwan Maami Sales & GST Report")
    parser.add_argument(
        "--period",
        choices=["daily", "weekly", "monthly"],
        help="Report cadence: daily, weekly, or monthly",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run with hardcoded May 2026 test range (HTML saved to file)",
    )
    args = parser.parse_args()

    if args.test:
        # Hardcoded test: May 2026
        start_date = date(2026, 5, 1)
        end_date = date(2026, 5, 31)
        period_label = "May 2026"
        print(f"TEST MODE | Range: {start_date} → {end_date} | Label: {period_label}")

        rows = fetch_data(start_date, end_date)
        print(f"\nAggregated {len(rows)} outlet×channel groups:\n")
        for r in rows:
            print(f"  {r['outlet']:12s} {r['channel_label']:12s} orders={r['orders']:,}  revenue={fmt_indian(r['revenue'])}  gst={fmt_indian(r['gst_collected'])}")

        html = build_html_report(rows, period_label)
        output_path = "reports/sales_gst_test_may2026.html"
        os.makedirs("reports", exist_ok=True)
        with open(output_path, "w") as f:
            f.write(html)
        print(f"\n✓ Report saved: {output_path}")
        return

    if not args.period:
        parser.error("--period is required (unless using --test)")

    # For monthly: only proceed if run on the 1st of the month
    if args.period == "monthly" and date.today().day != 1:
        print("Monthly report: today is not the 1st — skipping.")
        sys.exit(0)

    start_date, end_date, period_label = get_date_range(args.period)
    print(f"Period: {args.period} | Range: {start_date} → {end_date} | Label: {period_label}")

    rows = fetch_data(start_date, end_date)
    if not rows:
        print("No data returned for this period. Saving empty report.")

    html = build_html_report(rows, period_label)

    # Save report to file (uploaded as GitHub Actions artifact)
    output_path = f"reports/sales_gst_{args.period}_{start_date.isoformat()}.html"
    os.makedirs("reports", exist_ok=True)
    with open(output_path, "w") as f:
        f.write(html)
    print(f"✓ Report saved: {output_path}")


if __name__ == "__main__":
    main()
