import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { desc } from 'drizzle-orm';

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

// Use raw SQL since we can't import the schema easily
const [items] = await pool.query('SELECT id, orderId, productName, specialInstructions FROM order_items ORDER BY id DESC LIMIT 5');

console.log('Order items:');
items.forEach(item => {
  console.log('ID:', item.id, '| Product:', item.productName, '| Special Instructions:', JSON.stringify(item.specialInstructions));
});

await pool.end();
