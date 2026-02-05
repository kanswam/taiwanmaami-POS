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

// Search for Creme Caramel Oolong and Taro products
const [rows] = await connection.execute(`
  SELECT id, name, slug, subcategoryId 
  FROM products 
  WHERE name LIKE '%Crème Caramel%' 
     OR name LIKE '%Creme Caramel%'
     OR (name LIKE '%Caramel%' AND (name LIKE '%Oolong%' OR name LIKE '%Taro%'))
`);

console.log('Creme Caramel products:');
rows.forEach(r => console.log(`  ID: ${r.id}, Name: "${r.name}", SubcatId: ${r.subcategoryId}`));

// Also search for all products with 120xxx IDs (from earlier query)
const [rows2] = await connection.execute(`SELECT id, name FROM products WHERE id >= 120000 LIMIT 20`);
console.log('\nProducts with ID >= 120000:');
rows2.forEach(r => console.log(`  ${r.id}: ${r.name}`));

await connection.end();
