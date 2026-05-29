#!/usr/bin/env python3
"""
Taiwan Maami — Bank Statement & Corporate Credit Card Ingestion Module V2
Updated with corrected categorisation rules based on operational knowledge.

Tables written: bank_transactions (upsert by idempotency_key)
"""

import os
import csv
import re
import hashlib
import logging
from datetime import datetime
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("maami-bank-ingestion")


class BankIngestion:
    def __init__(self):
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        self.supabase = create_client(url, key)

        # ============================================================================
        # CATEGORISATION RULES
        # Order matters — first match wins. Most specific first, generic last.
        # ============================================================================
        self.rules = [
            # ── EXCLUDED FROM P&L (balance_sheet) ──────────────────────
            (r"ATD/Auto Debit CC|CREDIT.*CARD.*PAYMENT|AUTO.*DEBIT.*CC|CC.*SETTLEMENT", "balance_sheet", "cc_settlement", True),
            (r"ANNUAL.*INTEREST|LOAN.*INTEREST|CRSantha|PRINCIPAL.*REPAY|LOAN.*EMI|TERM.*LOAN", "balance_sheet", "loan_repayment", True),
            (r"GST.*PAYMENT|GSTR|GST.*RETURN|INPUT.*GST|gsticicipayment", "balance_sheet", "gst_payment", True),
            (r"TDS|TAX.*DEDUCTED|WITHHOLDING|tax.*payment|tds.*return", "balance_sheet", "tax_payment", True),
            (r"FIXED.*DEPOSIT|FD|INVESTMENT|MUTUAL.*FUND", "balance_sheet", "investments", True),
            (r"POS.*REVERSAL|refund|reversal", "balance_sheet", "pos_reversal", True),

            # ── COGS — Imported ingredients ─────────────────────────────
            (r"TAPIOCA|BOBA.*PEARL|PEARLS.*IMPORT|EVERMAK|BOBA.*DIRECT", "cogs", "imported_ingredients", False),
            (r"TEA.*LEAVES.*IMPORT|OOLONG.*IMPORT|TEA.*IMPORT", "cogs", "imported_ingredients", False),
            (r"RICE.*FLOUR.*IMPORT|JAPANESE.*FLOUR|MOCHI.*FLOUR.*IMPORT", "cogs", "imported_ingredients", False),
            (r"CARGO|FREIGHT|CUSTOMS.*DUTY|IMPORT.*DUTY|SHIPPING.*IMPORT", "cogs", "import_shipping", False),
            (r"FOREIGN.*REMITTANCE|TT.*PAYMENT|SWIFT|WIRE.*TRANSFER.*IMPORT", "cogs", "import_payment", False),

            # ── COGS — Local ingredients ────────────────────────────────
            (r"MILK|DAIRY|AMUL|AASHIRVAAD|NANDINI|HATSUN", "cogs", "local_ingredients", False),
            (r"SUGAR|SYRUP|FRUCTOSE|HONEY|CREME.*CARAMEL|caramel|CARAMEL", "cogs", "local_ingredients", False),
            (r"VEGETABLE|PRODUCE|ONION|GARLIC|GINGER|TOMATO", "cogs", "local_ingredients", False),
            (r"CHICKEN|MEAT|POULTRY|EGG|BROILER", "cogs", "local_proteins", False),
            (r"PRAWN|SEAFOOD|FISH|TIGER.*PRAWN", "cogs", "local_proteins", False),
            (r"NOODLES|FLOUR|WHEAT|RICE.*LOCAL|VERMICELLI", "cogs", "local_ingredients", False),
            (r"OIL|SOY.*SAUCE|VINEGAR|SEASONING|SESAME.*OIL|CHILI.*OIL", "cogs", "local_ingredients", False),
            (r"BUTTER|CREAM|CHEESE|MOZZARELLA|PARMESAN", "cogs", "local_ingredients", False),
            (r"brioche|BRIOCHE|supplier.*payment.*local", "cogs", "local_ingredients", False),

            # ── COGS — Packaging ────────────────────────────────────────
            (r"PACKAGING|CUPS|LIDS|STRAWS|BAGS|BOX|PAPER.*CUP|PLASTIC.*CUP", "cogs", "packaging", False),
            (r"PRINTING|LABEL|STICKER|BRANDING.*MAT|MENU.*PRINT", "cogs", "packaging", False),

            # ── REVENUE ─────────────────────────────────────────────────
            (r"SWIGGY|ZOMATO|AGGREGATOR.*SETTLEMENT", "revenue", "aggregator_settlement", False),
            (r"PETPOOJA.*SETTLEMENT|PAYTM.*SETTLEMENT|PHONEPE.*SETTLEMENT", "revenue", "direct_payment", False),
            (r"CASH.*DEPOSIT.*SALES|CASH.*SALES", "revenue", "cash_sales", False),

            # ── OPEX — Rent (outlet only — staff accommodation separate) ─
            (r"RENT|LEASE|PROPERTY.*MANAGEMENT|LANDLORD|DEPOSIT", "opex", "rent", False),

            # ── OPEX — Staff accommodation ──────────────────────────────
            (r"rent.*staff|staff.*rent|accommodation|housing.*staff|room.*rent.*staff", "opex", "staff_accommodation", False),

            # ── OPEX — Salaries & Payroll ───────────────────────────────
            (r"SALARY|PAYROLL|PF.*CONTRIBUTION|ESI|GRATUITY|WAGES.*MONTHLY", "opex", "salaries", False),
            (r"DirRemuneration|DIRECTOR.*REMUNERATION|DIRECTOR.*SALARY", "opex", "director_remuneration", False),

            # ── OPEX — Wages & Daily Labour ─────────────────────────────
            (r"WAGES|DAILY.*WAGE|TEMP.*WORKER|CASUAL.*LABOUR", "opex", "wages", False),

            # ── OPEX — Utilities ────────────────────────────────────────
            (r"ELECTRICITY|EB.*BILL|TANGEDCO|POWER.*BILL|TNEB", "opex", "utilities_electricity", False),
            (r"WATER.*BILL|METROWATER|WATER.*CHARGE", "opex", "utilities_water", False),
            (r"INTERNET|WIFI|BROADBAND|JIO.*FIBER|AIRTEL.*FIBER|ACT.*FIBER", "opex", "utilities_internet", False),
            (r"GAS|LPG|COMMERCIAL.*GAS|INDANE|HP.*GAS", "opex", "utilities_gas", False),

            # ── OPEX — Marketing ────────────────────────────────────────
            (r"INSTAGRAM|FACEBOOK|META.*ADS|GOOGLE.*ADS|DIGITAL.*MARKETING", "opex", "marketing_digital", False),
            (r"INFLUENCER|COLLAB|PROMOTION|CAMPAIGN|BRAND.*PARTNER", "opex", "marketing", False),
            (r"SWIGGY.*ADS|ZOMATO.*ADS|AGGREGATOR.*ADS|FOOD.*ADS", "opex", "marketing_aggregator", False),

            # ── OPEX — Technology ───────────────────────────────────────
            (r"SUPABASE|DIGITALOCEAN|SERVER|HOSTING|DOMAIN|VERCEL", "opex", "technology", False),
            (r"SOFTWARE|SAAS|SUBSCRIPTION|NOTION|SLACK|GITHUB", "opex", "technology", False),
            (r"PETPOOJA.*LICENSE|POS.*SOFTWARE|MANUS|ERP.*LICENSE", "opex", "technology", False),

            # ── OPEX — Professional Services ────────────────────────────
            (r"ACCOUNTANT|CA\s|AUDIT|TAX.*FILING|GST.*CONSULT|COMPANY.*SECRETARY", "opex", "professional_services", False),
            (r"LEGAL|LAWYER|TRADEMARK|COMPLIANCE|REGISTRATION", "opex", "professional_services", False),

            # ── OPEX — Equipment & Maintenance ──────────────────────────
            (r"EQUIPMENT|APPLIANCE|FRIDGE|BLENDER|SEALER|MIXER|GRINDER", "opex", "equipment", False),
            (r"REPAIR|MAINTENANCE|SERVICE.*CHARGE|AMC|ANNUAL.*MAINTENANCE", "opex", "maintenance_repairs", False),

            # ── OPEX — Staff Welfare & Uniforms ─────────────────────────
            (r"EmployeeofMonth|EMPLOYEE.*MONTH|BEST.*EMPLOYEE|STAFF.*REWARD", "opex", "staff_welfare", False),
            (r"UNIFORM|APRONS|CHEF.*COAT|CAPS.*STAFF", "opex", "uniforms", False),
            (r"SSELLADURAI|SSEL.*HOTELS|HOTEL.*SUPPLY", "opex", "staff_welfare", False),
            (r"CLEANING|HOUSEKEEPING|PEST.*CONTROL|SANITATION", "opex", "housekeeping", False),
            (r"STAFF.*MEAL|MEAL.*STAFF|FOOD.*STAFF|LUNCH.*STAFF", "opex", "staff_meals", False),

            # ── OPEX — Training & Development ───────────────────────────
            (r"TRAINING|WORKSHOP|COURSE|CERTIFICATION|BOOKS.*STAFF", "opex", "training_and_development", False),
            (r"CROSSWORD.*BOOK|BOOKSTORE|AMAZON.*BOOK|KINDLE", "opex", "miscellaneous", False),

            # ── OPEX — Expense Reimbursements ───────────────────────────
            (r"expensesclaim|expense.*claim|expense.*reimburse|reimbursement", "opex", "expense_reimbursement", False),
            (r"kipgenboichong|staff.*reimburse|team.*reimburse|petty.*cash", "opex", "expense_reimbursement", False),
            (r"anandeeswar.*expense|anandeeswar.*claim", "opex", "expense_reimbursement", False),

            # ── OPEX — Facilities & Misc ────────────────────────────────
            (r"STATIONERY|OFFICE.*SUPPLY|PEN|PAPER|PRINT.*A4", "opex", "office_supplies", False),
            (r"TRANSPORT|CAB|AUTO|FUEL|DIESEL|PETROL|OLA|UBER", "opex", "logistics", False),
            (r"BANK.*CHARGE|NEFT.*CHARGE|IMPS.*FEE|MIN.*BAL|CashDep.*Chgs", "opex", "bank_charges", False),
            (r"TELECOM|PHONE.*BILL|MOBILE.*RECHARGE|AIRTEL|JIO|VODAFONE", "opex", "telecom", False),
            (r"PARKING|TOLL|FASTAG", "opex", "parking", False),
            (r"UNIFORM.*SUPPLIER|UNIFORM.*STORE", "opex", "uniforms", False),

            # ── Fallback: catch common merchants ────────────────────────
            (r"paidbalance|ASSPL.*Bangalore", "opex", "miscellaneous", False),
            (r"SWIGGY|ZOMATO|DUNZO", "opex", "food_delivery_staff", False),
            (r"AMAZON|FLIPKART|NYKAA|RETAIL.*CC", "opex", "miscellaneous", False),
        ]

    # ──────────────────────────────────────────────────────────────────
    # PARSERS
    # ──────────────────────────────────────────────────────────────────

    def parse_icici_current_account(self, filepath, statement_month):
        transactions = []
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        data_start = 0
        for i, line in enumerate(lines):
            if 'Transaction Date' in line or ('Date' in line and 'Debit' in line):
                data_start = i
                break

        reader = csv.DictReader(lines[data_start:])
        for row in reader:
            try:
                txn_date = self._parse_date(row.get('Transaction Date', row.get('Date', '')))
                desc = row.get('Transaction Remarks', row.get('Description', row.get('Remarks', '')))
                debit = self._parse_amount(row.get('Debit Amount', row.get('Debit', '0')))
                credit = self._parse_amount(row.get('Credit Amount', row.get('Credit', '0')))
                balance = self._parse_amount(row.get('Balance', '0'))

                if not desc or (debit == 0 and credit == 0):
                    continue

                ledger, category, excluded = self._categorise(desc)

                key = hashlib.md5(
                    f"icici_ca_{statement_month}_{txn_date}_{desc}_{debit}_{credit}".encode()
                ).hexdigest()

                transactions.append({
                    'idempotency_key': key,
                    'account_type': 'current_account',
                    'account_number': 'icici_ca',
                    'transaction_date': txn_date,
                    'value_date': txn_date,
                    'description': desc[:200],
                    'merchant_name': self._extract_merchant(desc),
                    'debit_amount': debit if debit > 0 else None,
                    'credit_amount': credit if credit > 0 else None,
                    'balance': balance if balance != 0 else None,
                    'ledger_type': ledger,
                    'category': category,
                    'is_excluded_from_pl': excluded,
                    'statement_month': statement_month,
                    'source_file': os.path.basename(filepath),
                })
            except Exception as e:
                logger.warning(f"Skipping row: {e}")
                continue

        logger.info(f"Parsed {len(transactions)} CA transactions")
        return transactions

    def parse_icici_credit_card(self, filepath, statement_month):
        transactions = []
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        data_start = 0
        for i, line in enumerate(lines):
            if 'Date' in line and 'Amount' in line:
                data_start = i
                break

        reader = csv.DictReader(lines[data_start:])
        for row in reader:
            try:
                txn_date = self._parse_date(row.get('Date', row.get('Transaction Date', '')))
                desc = row.get('Description', row.get('Details', row.get('Transaction Details', '')))
                amount = self._parse_amount(row.get('Amount', row.get('Transaction Amount', '0')))
                cardholder = row.get('Cardholder', row.get('Card Member', 'corporate'))

                if not desc or amount == 0:
                    continue

                ledger, category, excluded = self._categorise(desc)
                is_excluded = excluded or ('AUTO DEBIT' in desc.upper())

                key = hashlib.md5(
                    f"icici_cc_{statement_month}_{txn_date}_{desc}_{amount}".encode()
                ).hexdigest()

                transactions.append({
                    'idempotency_key': key,
                    'account_type': 'credit_card',
                    'account_number': f"icici_cc_{cardholder.lower().replace(' ', '_')}",
                    'transaction_date': txn_date,
                    'value_date': txn_date,
                    'description': desc[:200],
                    'merchant_name': self._extract_merchant(desc),
                    'debit_amount': amount,
                    'credit_amount': None,
                    'balance': None,
                    'ledger_type': ledger,
                    'category': category,
                    'is_excluded_from_pl': is_excluded,
                    'statement_month': statement_month,
                    'source_file': os.path.basename(filepath),
                })
            except Exception as e:
                logger.warning(f"Skipping CC row: {e}")
                continue

        logger.info(f"Parsed {len(transactions)} CC transactions")
        return transactions

    # ──────────────────────────────────────────────────────────────────
    # CATEGORISATION
    # ──────────────────────────────────────────────────────────────────

    def _categorise(self, description):
        desc_upper = description.upper()
        for pattern, ledger, category, excluded in self.rules:
            if re.search(pattern, desc_upper):
                return ledger, category, excluded
        return 'uncategorised', None, False

    def _parse_date(self, raw):
        raw = raw.strip()
        for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%y', '%m/%d/%Y']:
            try:
                return datetime.strptime(raw, fmt).date().isoformat()
            except ValueError:
                continue
        raise ValueError(f"Cannot parse date: {raw}")

    def _parse_amount(self, raw):
        if not raw:
            return 0.0
        cleaned = raw.replace(',', '').replace('Rs.', '').replace('INR', '').strip()
        if cleaned.startswith('(') and cleaned.endswith(')'):
            cleaned = '-' + cleaned[1:-1]
        try:
            return float(cleaned) if cleaned else 0.0
        except ValueError:
            return 0.0

    def _extract_merchant(self, description):
        patterns = [
            r'POS\s+([A-Z][A-Z\s&]+?)\s+[A-Z]{2,}',
            r'UPI/([^@\s]+)@?',
            r'NEFT/[^/]+/([^/]+)',
            r'IMPS/[^/]+/([^/]+)',
        ]
        for p in patterns:
            m = re.search(p, description.upper())
            if m:
                return m.group(1).strip().title()
        return None

    # ──────────────────────────────────────────────────────────────────
    # SUPABASE
    # ──────────────────────────────────────────────────────────────────

    def upsert_transactions(self, transactions, batch_size=100):
        if not transactions:
            return 0
        count = 0
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i + batch_size]
            self.supabase.table("bank_transactions").upsert(batch, on_conflict="idempotency_key").execute()
            count += len(batch)
        logger.info(f"Upserted {count} transactions")
        return count

    def get_uncategorised(self, statement_month):
        response = self.supabase.table("bank_transactions") \
            .select("*") \
            .eq("statement_month", statement_month) \
            .eq("ledger_type", "uncategorised") \
            .execute()
        return response.data

    # ──────────────────────────────────────────────────────────────────
    # COGS CORROBORATION
    # ──────────────────────────────────────────────────────────────────

    def corroborate_cogs(self, statement_month):
        response = self.supabase.table("cogs_corroboration") \
            .select("*") \
            .eq("month", f"{statement_month}-01") \
            .execute()

        if not response.data:
            logger.warning("No corroboration data. Run SQL views first.")
            return None

        row = response.data[0]
        logger.info(f"Recipe COGS:  ₹{row['recipe_cogs_inr']:,.2f}")
        logger.info(f"Bank COGS:    ₹{row['bank_cogs_inr']:,.2f}")
        logger.info(f"Coverage:     {row.get('bank_coverage_pct', 'N/A')}%")
        logger.info(f"Status:       {row['corroboration_status']}")
        logger.info(f"Action:       {row.get('recommended_action', 'N/A')}")
        return row

    # ──────────────────────────────────────────────────────────────────
    # P&L
    # ──────────────────────────────────────────────────────────────────

    def get_pl(self, statement_month):
        response = self.supabase.table("pl_summary") \
            .select("*") \
            .eq("month", f"{statement_month}-01") \
            .execute()
        return response.data[0] if response.data else None

    # ──────────────────────────────────────────────────────────────────
    # CLI
    # ──────────────────────────────────────────────────────────────────

    def run_cli(self):
        import argparse
        parser = argparse.ArgumentParser(description="Bank Statement Ingestion V2")
        parser.add_argument("--source", choices=["icici_ca", "icici_cc"], required=True)
        parser.add_argument("--file", required=True)
        parser.add_argument("--month", required=True, help="YYYY-MM")
        parser.add_argument("--corroborate", action="store_true")
        parser.add_argument("--pl", action="store_true")
        args = parser.parse_args()

        if args.source == "icici_ca":
            txns = self.parse_icici_current_account(args.file, args.month)
        else:
            txns = self.parse_icici_credit_card(args.file, args.month)

        self.upsert_transactions(txns)

        uncategorised = self.get_uncategorised(args.month)
        if uncategorised:
            logger.warning(f"⚠️ {len(uncategorised)} uncategorised transactions:")
            for u in uncategorised[:10]:
                logger.warning(f"  ₹{u['debit_amount']} — {u['description'][:60]}")
        else:
            logger.info("✅ All transactions categorised")

        if args.corroborate:
            self.corroborate_cogs(args.month)
        if args.pl:
            pl = self.get_pl(args.month)
            if pl:
                logger.info(f"\nP&L {args.month}: Rev ₹{pl['gross_revenue']:,.0f} | "
                            f"GM {pl['gross_margin_pct']}% | "
                            f"NM {pl['net_margin_pct']}%")


if __name__ == "__main__":
    BankIngestion().run_cli()
