#!/usr/bin/env python3
"""
Taiwan Maami — Historical Data ETL
====================================
Loads 8 Petpooja + own-POS Excel files into Supabase sales_facts,
then deletes the 2 backfill blob records.

Usage:
    SUPABASE_URL=https://xxx.supabase.co \
    SUPABASE_KEY=service_role_key_here \
    python3 maami_historical_etl.py

Set DRY_RUN=1 to preview without writing to Supabase.
"""

import os
import sys
import hashlib
import pandas as pd
from datetime import datetime, timezone
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"
BATCH_SIZE = 200  # rows per upsert call

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "historical_data")

# Backfill blob IDs to delete after successful load
BACKFILL_IDS_TO_DELETE = [
    "backfill_palladium_instore_2024-03-29_2025-03-31",
    "backfill_palladium_instore_2025-04-01_2026-03-31",
]

# ── File manifest ─────────────────────────────────────────────────────────────

PETPOOJA_FILES = [
    # (filepath, outlet, channel)
    ("July_2024_to_31st_March_2025_Palladium_Delivery_Order_Palladium.xlsx",   "palladium", "delivery"),
    ("Apr2025_to_31st_March_2026_Delivery_Order_Palladium.xlsx",               "palladium", "delivery"),
    ("Apr2026_to_18May2026_Palladium_delivery.xlsx",                           "palladium", "delivery"),
    ("Palladium_instore_29Mar2024_to_31Mar2025.xlsx",                          "palladium", "instore"),
    ("Palladium_instore_1Apr2025_to_31Mar2026.xlsx",                           "palladium", "instore"),
    ("Palladium_instore_1Apr2026_to_18May2026.xlsx",                           "palladium", "instore"),
    ("TNagar_Sep2025_to_18thMay_2026_Petpooja.xlsx",                           "tnagar",    "petpooja"),
]

OWN_POS_FILES = [
    # (filepath, outlet)
    ("TNagar_Instore_POS_1Jan2026_to_18May2026.xlsx", "tnagar"),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def make_order_id(outlet: str, channel: str, invoice_no: str, dt: str) -> str:
    """Deterministic source_order_id — safe to re-run (idempotent upsert)."""
    raw = f"{outlet}_{channel}_{invoice_no}_{dt}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]

def to_utc_iso(dt_val) -> str | None:
    """Convert any date/datetime value to UTC ISO string."""
    if pd.isna(dt_val) or dt_val is None:
        return None
    if isinstance(dt_val, str):
        try:
            dt_val = pd.to_datetime(dt_val, dayfirst=False)
        except Exception:
            return None
    if isinstance(dt_val, pd.Timestamp):
        if dt_val.tzinfo is None:
            # Petpooja timestamps are IST — localise then convert
            dt_val = dt_val.tz_localize("Asia/Kolkata").tz_convert("UTC")
        return dt_val.isoformat()
    return None

def safe_float(val, default=0.0) -> float:
    try:
        return float(val) if not pd.isna(val) else default
    except Exception:
        return default

# ── Petpooja parser ───────────────────────────────────────────────────────────

def parse_petpooja_file(filepath: str, outlet: str, channel: str) -> list[dict]:
    """
    Petpooja Master Report format:
    - Rows 1-5: metadata + blank
    - Row 6: column headers
    - Rows 7-10: Total / Min / Max / Avg  ← skip
    - Row 11+: actual order data
    """
    df = pd.read_excel(filepath, header=5, skiprows=[6, 7, 8, 9])
    df.columns = df.columns.str.strip()

    # Drop summary/empty rows
    df = df[pd.to_numeric(df["Invoice No."], errors="coerce").notna()].copy()
    df = df[df["Status"].str.strip().str.lower() == "success"].copy()

    records = []
    for _, row in df.iterrows():
        invoice_no = str(int(row["Invoice No."]))
        raw_dt = row["Date"]
        ts_utc = to_utc_iso(raw_dt)
        if ts_utc is None:
            continue

        order_date = pd.to_datetime(raw_dt).date().isoformat()

        # Determine aggregator from Area / Sub Order Type
        area = str(row.get("Area", "") or "").lower()
        sub_type = str(row.get("Sub Order Type", "") or "").lower()
        if "zomato" in area or "zomato" in sub_type:
            aggregator = "zomato"
        elif "swiggy" in area or "swiggy" in sub_type:
            aggregator = "swiggy"
        else:
            aggregator = None

        # Determine order_type
        order_type_raw = str(row.get("Order Type", "") or "").lower()
        if "delivery" in order_type_raw or "parcel" in order_type_raw:
            order_type = "delivery"
        elif "dine" in order_type_raw or "instore" in order_type_raw:
            order_type = "instore"
        elif "takeaway" in order_type_raw or "pickup" in order_type_raw:
            order_type = "takeaway"
        else:
            order_type = order_type_raw

        # Payment method
        payment_raw = str(row.get("Payment Type", "") or "").lower()
        if "online" in payment_raw or "upi" in payment_raw:
            payment_method = "upi"
        elif "card" in payment_raw:
            payment_method = "card"
        elif "cash" in payment_raw:
            payment_method = "cash"
        else:
            payment_method = payment_raw

        my_amount = safe_float(row.get("My Amount (₹)", 0))
        discount = safe_float(row.get("Discount (₹)", 0))
        net_sales = safe_float(row.get("Net Sales (₹)(M.A - D)", my_amount - discount))
        total_tax = safe_float(row.get("Total Tax (₹)", 0))
        total = safe_float(row.get("Total (₹)", 0))

        source_order_id = make_order_id(outlet, channel, invoice_no, ts_utc)

        # One row per order (order-level, not item-level — Petpooja Master Report is order-level)
        records.append({
            "source": "petpooja_historical",
            "source_order_id": source_order_id,
            "order_date": order_date,
            "order_timestamp": ts_utc,
            "outlet": outlet,
            "order_type": order_type,
            "payment_method": payment_method,
            "payment_status": "completed",
            "customer_name": str(row.get("Name", "") or ""),
            "customer_phone": str(row.get("Phone", "") or ""),
            "item_name": None,
            "item_category": None,
            "item_quantity": None,
            "item_unit_price_rupees": None,
            "item_total_rupees": my_amount,
            "order_subtotal_rupees": net_sales,
            "order_tax_rupees": total_tax,
            "order_discount_rupees": discount,
            "order_total_rupees": total,
            "aggregator": aggregator,
            "channel": channel,
            "raw_data": None,
            "etl_batch_id": f"historical_import_{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            "etl_timestamp": datetime.now(timezone.utc).isoformat(),
            "is_backfill": True,
            "period_start": None,
            "period_end": None,
            "ingredient_cost_inr": None,
            "gross_margin_inr": None,
            "gross_margin_pct": None,
        })

    return records

# ── Own POS parser ────────────────────────────────────────────────────────────

def parse_own_pos_file(filepath: str, outlet: str) -> list[dict]:
    """
    Own POS export format (Sales Report sheet):
    - Row 1-3: title/period/blank
    - Row 4: headers
    - Row 5+: data
    Columns: S.No, Invoice No., Date, Time, Source, Order Type, Outlet,
             Taxable Amount, CGST, SGST, Total GST, Total Amount, Payment Method
    """
    df = pd.read_excel(filepath, sheet_name="Sales Report", header=3)
    df.columns = df.columns.str.strip()

    # Drop rows where Invoice No. is missing
    df = df[df["Invoice No."].notna()].copy()

    records = []
    for _, row in df.iterrows():
        invoice_no = str(row["Invoice No."]).strip()
        date_str = str(row["Date"]).strip()   # e.g. "03/01/2026"
        time_str = str(row["Time"]).strip()   # e.g. "8:50 PM"

        try:
            dt_ist = pd.to_datetime(f"{date_str} {time_str}", dayfirst=True)
            dt_utc = dt_ist.tz_localize("Asia/Kolkata").tz_convert("UTC")
            ts_utc = dt_utc.isoformat()
            order_date = dt_ist.date().isoformat()
        except Exception:
            continue

        order_type_raw = str(row.get("Order Type", "") or "").lower()
        if "delivery" in order_type_raw:
            order_type = "delivery"
        elif "dine" in order_type_raw:
            order_type = "instore"
        elif "takeaway" in order_type_raw or "pickup" in order_type_raw:
            order_type = "takeaway"
        else:
            order_type = order_type_raw

        payment_raw = str(row.get("Payment Method", "") or "").lower()
        if "upi" in payment_raw or "online" in payment_raw or "razorpay" in payment_raw:
            payment_method = "upi"
        elif "card" in payment_raw:
            payment_method = "card"
        elif "cash" in payment_raw:
            payment_method = "cash"
        elif "zomato" in payment_raw or "swiggy" in payment_raw:
            payment_method = "aggregator"
        else:
            payment_method = payment_raw or "unknown"

        taxable = safe_float(row.get("Taxable Amount", 0))
        cgst = safe_float(row.get("CGST", 0))
        sgst = safe_float(row.get("SGST", 0))
        total_gst = safe_float(row.get("Total GST", cgst + sgst))
        total = safe_float(row.get("Total Amount", 0))

        source_order_id = make_order_id(outlet, "instore_pos", invoice_no, ts_utc)

        records.append({
            "source": "own_pos_historical",
            "source_order_id": source_order_id,
            "order_date": order_date,
            "order_timestamp": ts_utc,
            "outlet": outlet,
            "order_type": order_type,
            "payment_method": payment_method,
            "payment_status": "completed",
            "customer_name": None,
            "customer_phone": None,
            "item_name": None,
            "item_category": None,
            "item_quantity": None,
            "item_unit_price_rupees": None,
            "item_total_rupees": total,
            "order_subtotal_rupees": taxable,
            "order_tax_rupees": total_gst,
            "order_discount_rupees": 0.0,
            "order_total_rupees": total,
            "aggregator": None,
            "channel": "instore",
            "raw_data": None,
            "etl_batch_id": f"historical_import_{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            "etl_timestamp": datetime.now(timezone.utc).isoformat(),
            "is_backfill": True,
            "period_start": None,
            "period_end": None,
            "ingredient_cost_inr": None,
            "gross_margin_inr": None,
            "gross_margin_pct": None,
        })

    return records

# ── Supabase uploader ─────────────────────────────────────────────────────────

def upsert_records(supabase, records: list[dict], label: str):
    total = len(records)
    print(f"  Upserting {total} records for {label}...")
    if DRY_RUN:
        print(f"  [DRY RUN] Would upsert {total} records. Sample:")
        for r in records[:2]:
            print(f"    {r['source_order_id']} | {r['order_date']} | {r['outlet']} | {r['channel']} | ₹{r['order_total_rupees']}")
        return

    success = 0
    errors = 0
    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table("sales_facts").upsert(
                batch,
                on_conflict="source_order_id"
            ).execute()
            success += len(batch)
            print(f"    ✓ {min(i + BATCH_SIZE, total)}/{total}")
        except Exception as e:
            errors += len(batch)
            print(f"    ✗ Batch {i}–{i+BATCH_SIZE} failed: {e}")

    print(f"  Done: {success} upserted, {errors} errors")

def delete_backfill_blobs(supabase):
    print("\n── Deleting backfill blob records ──────────────────────────────")
    for blob_id in BACKFILL_IDS_TO_DELETE:
        if DRY_RUN:
            print(f"  [DRY RUN] Would delete source_order_id = {blob_id}")
            continue
        try:
            result = supabase.table("sales_facts") \
                .delete() \
                .eq("source_order_id", blob_id) \
                .execute()
            print(f"  ✓ Deleted: {blob_id}")
        except Exception as e:
            print(f"  ✗ Failed to delete {blob_id}: {e}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_KEY environment variables.")
        sys.exit(1)

    print(f"Taiwan Maami Historical ETL — {'DRY RUN' if DRY_RUN else 'LIVE'}")
    print(f"Supabase: {SUPABASE_URL}")
    print()

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if not DRY_RUN else None

    all_records = []

    # ── Petpooja files ──
    print("── Petpooja files ──────────────────────────────────────────────")
    for filename, outlet, channel in PETPOOJA_FILES:
        filepath = os.path.join(UPLOAD_DIR, filename)
        print(f"\n  Parsing: {filename}")
        records = parse_petpooja_file(filepath, outlet, channel)
        print(f"  → {len(records)} valid orders parsed")
        all_records.extend(records)
        if not DRY_RUN:
            upsert_records(supabase, records, f"{outlet}/{channel} — {filename}")

    # ── Own POS files ──
    print("\n── Own POS files ───────────────────────────────────────────────")
    for filename, outlet in OWN_POS_FILES:
        filepath = os.path.join(UPLOAD_DIR, filename)
        print(f"\n  Parsing: {filename}")
        records = parse_own_pos_file(filepath, outlet)
        print(f"  → {len(records)} valid orders parsed")
        all_records.extend(records)
        if not DRY_RUN:
            upsert_records(supabase, records, f"{outlet}/instore_pos — {filename}")

    # ── Dry run summary ──
    if DRY_RUN:
        print(f"\n── DRY RUN SUMMARY ─────────────────────────────────────────────")
        print(f"  Total records to upsert: {len(all_records)}")
        by_outlet_channel = {}
        for r in all_records:
            key = f"{r['outlet']} / {r['channel']}"
            by_outlet_channel[key] = by_outlet_channel.get(key, 0) + 1
        for k, v in sorted(by_outlet_channel.items()):
            print(f"    {k}: {v} orders")

        # Date range check
        dates = [r["order_date"] for r in all_records if r["order_date"]]
        if dates:
            print(f"  Date range: {min(dates)} → {max(dates)}")

        # Duplicate source_order_id check
        ids = [r["source_order_id"] for r in all_records]
        dupes = len(ids) - len(set(ids))
        print(f"  Duplicate source_order_ids: {dupes} (will be deduplicated on upsert)")

        print("\n  Sample records:")
        for r in all_records[:3]:
            print(f"    {r['source_order_id']} | {r['order_date']} | "
                  f"{r['outlet']} | {r['channel']} | ₹{r['order_total_rupees']}")

        print("\n  Backfill blobs that would be deleted:")
        for b in BACKFILL_IDS_TO_DELETE:
            print(f"    {b}")
        return

    # ── Delete blobs only after successful upsert ──
    delete_backfill_blobs(supabase)

    print("\n── Complete ─────────────────────────────────────────────────────")
    print(f"  {len(all_records)} total records processed.")
    print("  Run the Supabase lull analysis queries to verify.")

if __name__ == "__main__":
    main()
