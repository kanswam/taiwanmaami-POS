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

const [rows] = await connection.execute(`SELECT id, name, availableSizes FROM products WHERE id IN (120001, 120002)`);
console.log('Products with availableSizes:');
rows.forEach(p => {
  console.log(`  ${p.id}: ${p.name}`);
  console.log(`    Raw value: ${JSON.stringify(p.availableSizes)}`);
  console.log(`    Type: ${typeof p.availableSizes}`);
  if (p.availableSizes) {
    const parsed = typeof p.availableSizes === 'string' ? JSON.parse(p.availableSizes) : p.availableSizes;
    console.log(`    Parsed: ${JSON.stringify(parsed)}`);
  }
});

await connection.end();
