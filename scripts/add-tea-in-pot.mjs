import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// First, get the Coffee category ID
const [cats] = await conn.execute('SELECT id FROM categories WHERE slug = "coffee"');
const coffeeId = cats[0]?.id;
console.log('Coffee category ID:', coffeeId);

// Check if Hot Beverages subcategory exists
let [subs] = await conn.execute('SELECT id FROM subcategories WHERE slug = "hot-beverages"');
let hotBevId = subs[0]?.id;

if (!hotBevId) {
  const [result] = await conn.execute(
    `INSERT INTO subcategories (categoryId, name, chineseName, slug, hasSizeVariants, hasBobaOption, availableInstore, availableDelivery, displayOrder) 
     VALUES (?, 'Hot Beverages', '熱飲', 'hot-beverages', false, false, true, false, 20)`,
    [coffeeId]
  );
  hotBevId = result.insertId;
  console.log('Created Hot Beverages subcategory:', hotBevId);
} else {
  console.log('Hot Beverages subcategory exists:', hotBevId);
}

// Add Tea in Pot products
const teaInPotProducts = [
  { name: 'Organic Rose Black Tea (Pot)', chineseName: '玫瑰紅茶', slug: 'organic-rose-black-tea-pot', price: 36000 },
  { name: 'Organic Jasmin Black Tea (Pot)', chineseName: '茉莉花紅茶', slug: 'organic-jasmin-black-tea-pot', price: 36000 },
  { name: 'Organic Masala Whole Leaf (Pot)', chineseName: '印式香料紅茶', slug: 'organic-masala-whole-leaf-pot', price: 36000 },
  { name: 'Hong Kong Style Yuen-Yeung Milk Tea', chineseName: '港式熱鴛鴦奶茶', slug: 'hk-yuen-yeung-milk-tea', price: 34000 },
  { name: 'Yuzu Honey', chineseName: '柚子蜜', slug: 'yuzu-honey-hot', price: 36000 },
  { name: 'Hot Chocolate', chineseName: '熱巧克力', slug: 'hot-chocolate', price: 34000 },
];

for (const product of teaInPotProducts) {
  try {
    await conn.execute(
      `INSERT INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, isInStock, availableInstore, availableDelivery) 
       VALUES (?, ?, ?, ?, ?, ?, true, true, false) 
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [hotBevId, product.name, product.chineseName, product.slug, product.price, product.price + 2000]
    );
    console.log('Added:', product.name);
  } catch (e) {
    console.log('Error:', product.name, e.message);
  }
}

await conn.end();
console.log('Done!');
