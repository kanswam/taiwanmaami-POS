import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// First, get the Coffee category ID
const [categories] = await connection.execute(
  `SELECT id FROM categories WHERE slug = 'coffee'`
);

if (categories.length === 0) {
  console.log('Coffee category not found');
  process.exit(1);
}

const coffeeId = categories[0].id;

// Add Hot Coffee subcategory
const [result] = await connection.execute(
  `INSERT INTO subcategories (categoryId, name, chineseName, slug, hasSizeVariants, hasBobaOption, instoreOnly, displayOrder)
   VALUES (?, 'Hot Coffee', '熱咖啡', 'hot-coffee', false, false, true, 10)
   ON DUPLICATE KEY UPDATE name = VALUES(name)`,
  [coffeeId]
);

// Get the subcategory ID
const [subcats] = await connection.execute(
  `SELECT id FROM subcategories WHERE slug = 'hot-coffee'`
);

const hotCoffeeId = subcats[0].id;

// Add hot coffee products
const hotCoffeeProducts = [
  { name: 'Hot Americano', chineseName: '熱美式', price: 22000 },
  { name: 'Hot Latte', chineseName: '熱拿鐵', price: 25000 },
  { name: 'Hot Cappuccino', chineseName: '熱卡布奇諾', price: 25000 },
  { name: 'Hot Mocha', chineseName: '熱摩卡', price: 28000 },
  { name: 'Espresso Shot', chineseName: '濃縮咖啡', price: 15000 },
  { name: 'Double Espresso', chineseName: '雙份濃縮', price: 22000 },
];

for (const product of hotCoffeeProducts) {
  await connection.execute(
    `INSERT INTO products (subcategoryId, name, chineseName, slug, instorePrice, isAvailable, displayOrder)
     VALUES (?, ?, ?, ?, ?, true, 1)
     ON DUPLICATE KEY UPDATE instorePrice = VALUES(instorePrice)`,
    [hotCoffeeId, product.name, product.chineseName, product.name.toLowerCase().replace(/\s+/g, '-'), product.price]
  );
  console.log(`Added: ${product.name}`);
}

await connection.end();
console.log('Hot beverages added successfully!');
