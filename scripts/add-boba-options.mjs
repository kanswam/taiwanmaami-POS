import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Add boba size options (Small and Big)
const bobaSize = [
  { name: 'Small Boba', chineseName: '小珍珠', type: 'boba_size', fixedPrice: 0, displayOrder: 1 },
  { name: 'Big Boba', chineseName: '大珍珠', type: 'boba_size', fixedPrice: 0, displayOrder: 2 },
];

// Add extra boba options with size-based pricing
const extraBoba = [
  { name: 'Extra Tapioca Pearls', chineseName: '加珍珠', type: 'extra_boba', pricePetite: 3000, priceRegular: 4000, priceLarge: 5000, displayOrder: 1 },
  { name: 'Extra Strawberry Popping Boba', chineseName: '加草莓爆爆珠', type: 'extra_boba', pricePetite: 3000, priceRegular: 4000, priceLarge: 5000, displayOrder: 2 },
  { name: 'Extra Blueberry Popping Boba', chineseName: '加藍莓爆爆珠', type: 'extra_boba', pricePetite: 3000, priceRegular: 4000, priceLarge: 5000, displayOrder: 3 },
  { name: 'Extra Mango Popping Boba', chineseName: '加芒果爆爆珠', type: 'extra_boba', pricePetite: 3000, priceRegular: 4000, priceLarge: 5000, displayOrder: 4 },
  { name: 'Extra Lychee Popping Boba', chineseName: '加荔枝爆爆珠', type: 'extra_boba', pricePetite: 3000, priceRegular: 4000, priceLarge: 5000, displayOrder: 5 },
  { name: 'Extra Passionfruit Popping Boba', chineseName: '加百香果爆爆珠', type: 'extra_boba', pricePetite: 3000, priceRegular: 4000, priceLarge: 5000, displayOrder: 6 },
];

// Insert boba size options
for (const item of bobaSize) {
  await connection.execute(
    `INSERT INTO addons (name, chineseName, type, fixedPrice, displayOrder, isActive) 
     VALUES (?, ?, ?, ?, ?, true)
     ON DUPLICATE KEY UPDATE name=name`,
    [item.name, item.chineseName, item.type, item.fixedPrice, item.displayOrder]
  );
}

// Insert extra boba options
for (const item of extraBoba) {
  await connection.execute(
    `INSERT INTO addons (name, chineseName, type, pricePetite, priceRegular, priceLarge, displayOrder, isActive) 
     VALUES (?, ?, ?, ?, ?, ?, ?, true)
     ON DUPLICATE KEY UPDATE name=name`,
    [item.name, item.chineseName, item.type, item.pricePetite, item.priceRegular, item.priceLarge, item.displayOrder]
  );
}

// Add Hot Coffee items that were missing
const hotCoffeeSubcat = await connection.execute(
  `SELECT id FROM subcategories WHERE slug = 'hot-coffee'`
);

if (hotCoffeeSubcat[0].length > 0) {
  const hotCoffeeId = hotCoffeeSubcat[0][0].id;
  
  // Check if hot coffee products exist
  const existingProducts = await connection.execute(
    `SELECT COUNT(*) as count FROM products WHERE subcategoryId = ?`,
    [hotCoffeeId]
  );
  
  console.log(`Hot Coffee subcategory ID: ${hotCoffeeId}, existing products: ${existingProducts[0][0].count}`);
}

console.log('Boba size options and extra boba add-ons added successfully!');
await connection.end();
