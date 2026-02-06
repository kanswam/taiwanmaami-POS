import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const connection = await createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

// Find discount tables
const [tables] = await connection.execute(`SHOW TABLES`);
console.log('All tables:');
const tableNames = tables.map(t => Object.values(t)[0]).filter(t => t.toLowerCase().includes('discount') || t.toLowerCase().includes('coupon') || t.toLowerCase().includes('promo'));
console.log('Discount-related tables:', tableNames);

// Check each table
for (const table of tableNames) {
  console.log(`\n--- Table: ${table} ---`);
  const [rows] = await connection.execute(`SELECT * FROM \`${table}\``);
  console.log(JSON.stringify(rows, null, 2));
}

await connection.end();
