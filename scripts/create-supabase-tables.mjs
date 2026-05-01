// Create the four data lake tables in Supabase using direct PostgreSQL connection via pg
import pg from "pg";
const { Client } = pg;

// Supabase direct connection (session mode, port 5432)
const connectionString = `postgresql://postgres.ouktqqgmipygehhakoie:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

// Alternative: use the transaction pooler
const client = new Client({
  host: "db.ouktqqgmipygehhakoie.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  // If no DB password, try using the Supabase REST API to create tables via RPC
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.log("No SUPABASE_DB_PASSWORD set. Trying REST API approach...");
    await createViaREST();
    return;
  }

  console.log("Connecting to Supabase PostgreSQL...");
  await client.connect();
  console.log("Connected!");

  const sql = `
-- 1. Sales Facts
CREATE TABLE IF NOT EXISTS public.sales_facts (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_order_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  order_timestamp TIMESTAMPTZ NOT NULL,
  outlet TEXT NOT NULL,
  order_type TEXT NOT NULL,
  payment_method TEXT,
  payment_status TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  item_name TEXT NOT NULL,
  item_category TEXT,
  item_quantity INTEGER NOT NULL DEFAULT 1,
  item_unit_price_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_total_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_subtotal_rupees NUMERIC(10,2),
  order_tax_rupees NUMERIC(10,2),
  order_discount_rupees NUMERIC(10,2),
  order_total_rupees NUMERIC(10,2),
  aggregator TEXT,
  channel TEXT,
  raw_data JSONB,
  etl_batch_id TEXT NOT NULL,
  etl_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Stock Snapshots
CREATE TABLE IF NOT EXISTS public.stock_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  item_name TEXT NOT NULL,
  item_sku TEXT,
  category TEXT,
  current_quantity NUMERIC(10,3),
  unit TEXT,
  min_stock_level NUMERIC(10,3),
  is_low_stock BOOLEAN DEFAULT FALSE,
  outlet TEXT,
  raw_data JSONB,
  etl_batch_id TEXT NOT NULL,
  etl_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Wastage Facts
CREATE TABLE IF NOT EXISTS public.wastage_facts (
  id BIGSERIAL PRIMARY KEY,
  wastage_date DATE NOT NULL,
  item_name TEXT NOT NULL,
  item_sku TEXT,
  quantity NUMERIC(10,3) NOT NULL,
  unit TEXT,
  reason TEXT,
  reported_by TEXT,
  outlet TEXT,
  cost_rupees NUMERIC(10,2),
  raw_data JSONB,
  etl_batch_id TEXT NOT NULL,
  etl_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Data Completeness
CREATE TABLE IF NOT EXISTS public.data_completeness (
  id BIGSERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  outlet TEXT NOT NULL,
  pos_orders_count INTEGER DEFAULT 0,
  pos_orders_status TEXT NOT NULL DEFAULT 'missing',
  petpooja_csv_uploaded BOOLEAN DEFAULT FALSE,
  petpooja_csv_items_count INTEGER DEFAULT 0,
  petpooja_webhook_count INTEGER DEFAULT 0,
  inventory_stock_status TEXT NOT NULL DEFAULT 'missing',
  inventory_stock_items INTEGER DEFAULT 0,
  inventory_wastage_status TEXT NOT NULL DEFAULT 'missing',
  inventory_wastage_items INTEGER DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'incomplete',
  notes TEXT,
  etl_batch_id TEXT NOT NULL,
  etl_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_facts_date ON public.sales_facts(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_facts_outlet ON public.sales_facts(outlet);
CREATE INDEX IF NOT EXISTS idx_sales_facts_source ON public.sales_facts(source);
CREATE INDEX IF NOT EXISTS idx_sales_facts_batch ON public.sales_facts(etl_batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_date ON public.stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_wastage_facts_date ON public.wastage_facts(wastage_date);
CREATE INDEX IF NOT EXISTS idx_data_completeness_date ON public.data_completeness(report_date);
`;

  try {
    await client.query(sql);
    console.log("All tables and indexes created successfully!");
    
    // Verify tables exist
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sales_facts', 'stock_snapshots', 'wastage_facts', 'data_completeness')
      ORDER BY table_name;
    `);
    console.log("\nVerified tables:");
    res.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));
  } catch (err) {
    console.error("Error creating tables:", err.message);
  } finally {
    await client.end();
  }
}

async function createViaREST() {
  // Use Supabase REST API with service role key to create tables via RPC
  // First we need to create an exec_sql function
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Try creating tables by inserting a dummy row (which auto-creates via PostgREST)
  // This won't work for DDL. We need the SQL editor or direct connection.
  console.log("REST API cannot execute DDL statements.");
  console.log("Please either:");
  console.log("1. Set SUPABASE_DB_PASSWORD env var and re-run");
  console.log("2. Run the SQL in Supabase Dashboard > SQL Editor");
  console.log("3. Provide the database connection string");
}

main().catch(console.error);
