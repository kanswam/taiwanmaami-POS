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

// Check the products
const [rows] = await connection.execute(`
  SELECT id, name, availableSizes 
  FROM products 
  WHERE id IN (120001, 120002)
`);

console.log('Products in database:');
rows.forEach(p => {
  console.log(`  ID ${p.id}: ${p.name}`);
  console.log(`    availableSizes: ${JSON.stringify(p.availableSizes)}`);
  console.log(`    Type: ${typeof p.availableSizes}`);
});

await connection.end();
