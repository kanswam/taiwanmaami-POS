import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await createConnection(url);

console.log('=== CATEGORIES ===');
const [cats] = await conn.execute('SELECT id, name, slug, isActive FROM categories ORDER BY id');
cats.forEach(c => console.log(JSON.stringify(c)));

console.log('\n=== SUBCATEGORIES ===');
const [subs] = await conn.execute('SELECT id, name, categoryId, isActive FROM subcategories ORDER BY categoryId, id');
subs.forEach(s => console.log(JSON.stringify(s)));

console.log('\n=== INACTIVE PRODUCTS ===');
const [inactive] = await conn.execute('SELECT p.id, p.name, p.isActive, p.subcategoryId, s.name as subcatName FROM products p JOIN subcategories s ON p.subcategoryId = s.id WHERE p.isActive = false');
inactive.forEach(p => console.log(JSON.stringify(p)));

console.log('\n=== PRODUCT COUNTS ===');
const [total] = await conn.execute('SELECT COUNT(*) as total FROM products');
const [active] = await conn.execute('SELECT COUNT(*) as active FROM products WHERE isActive = true');
const [inactiveCount] = await conn.execute('SELECT COUNT(*) as inactive FROM products WHERE isActive = false');
console.log('Total:', total[0].total, 'Active:', active[0].active, 'Inactive:', inactiveCount[0].inactive);

console.log('\n=== ICED BEVERAGES PRODUCTS ===');
const [icedBev] = await conn.execute(`
  SELECT p.id, p.name, p.isActive, s.name as subcatName, c.name as catName 
  FROM products p 
  JOIN subcategories s ON p.subcategoryId = s.id 
  JOIN categories c ON s.categoryId = c.id 
  WHERE c.slug = 'iced-beverages' 
  ORDER BY s.name, p.name
`);
icedBev.forEach(p => console.log(JSON.stringify(p)));

console.log('\n=== BIANG BIANG NOODLE ===');
const [biang] = await conn.execute("SELECT p.id, p.name, p.isActive, s.name as subcatName FROM products p JOIN subcategories s ON p.subcategoryId = s.id WHERE p.name LIKE '%Biang%' OR p.name LIKE '%biang%' OR p.name LIKE '%noodle%' OR p.name LIKE '%Noodle%'");
biang.forEach(p => console.log(JSON.stringify(p)));

await conn.end();
process.exit(0);
