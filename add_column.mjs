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

// Check if column exists
const [cols] = await connection.execute(`SHOW COLUMNS FROM products LIKE 'availableSizes'`);
if (cols.length === 0) {
  console.log('Adding availableSizes column to products table...');
  await connection.execute(`ALTER TABLE products ADD COLUMN availableSizes JSON DEFAULT NULL`);
  console.log('Column added successfully!');
} else {
  console.log('Column already exists');
}

// Now update the two Creme Caramel products to only allow large size
console.log('\nUpdating Crème Caramel Milk Oolong (ID: 120001) to large only...');
await connection.execute(`UPDATE products SET availableSizes = '["large"]' WHERE id = 120001`);

console.log('Updating Crème Caramel Taro Latte (ID: 120002) to large only...');
await connection.execute(`UPDATE products SET availableSizes = '["large"]' WHERE id = 120002`);

// Verify the changes
const [updated] = await connection.execute(`SELECT id, name, availableSizes FROM products WHERE id IN (120001, 120002)`);
console.log('\nUpdated products:');
updated.forEach(p => console.log(`  ${p.id}: ${p.name} - sizes: ${p.availableSizes}`));

await connection.end();
console.log('\nDone!');
