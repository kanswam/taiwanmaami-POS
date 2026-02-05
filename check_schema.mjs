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

// Check products table columns
const [cols] = await connection.execute(`DESCRIBE products`);
console.log('Products table columns:');
cols.forEach(c => console.log(`  ${c.Field}: ${c.Type} ${c.Null === 'YES' ? '(nullable)' : ''}`));

// Check if there's a column for available sizes
const sizeColumns = cols.filter(c => c.Field.toLowerCase().includes('size') || c.Field.toLowerCase().includes('large'));
console.log('\nSize-related columns:', sizeColumns.length > 0 ? sizeColumns.map(c => c.Field) : 'None found');

await connection.end();
