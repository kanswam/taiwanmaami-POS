import { drizzle } from "drizzle-orm/mysql2";
import dotenv from "dotenv";

dotenv.config();

const toPaise = (rupees) => rupees * 100;

async function seedDatabase() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log("Seeding database...");

  // Seed Categories
  await db.execute(`INSERT IGNORE INTO categories (name, slug, description, displayOrder, isActive) VALUES 
    ('Bubble Tea', 'bubble-tea', 'Authentic Taiwanese bubble tea with imported tapioca pearls', 1, true),
    ('Coffee', 'coffee', 'Premium Lavazza coffee selections', 2, true),
    ('Mochis', 'mochis', 'Handcrafted Japanese-style mochi desserts', 3, true),
    ('Food', 'food', 'Authentic Asian street food', 4, true),
    ('Slush', 'slush', 'Refreshing fruit slush drinks', 5, true)
  `);

  // Seed Subcategories
  await db.execute(`INSERT IGNORE INTO subcategories (categoryId, name, chineseName, slug, 
    basePricePetiteWithBoba, basePricePetiteNoBoba, basePriceRegularWithBoba, basePriceRegularNoBoba,
    basePriceLargeWithBoba, basePriceLargeNoBoba, deliveryPriceRegularWithBoba, deliveryPriceRegularNoBoba,
    deliveryPriceLargeWithBoba, deliveryPriceLargeNoBoba, hasSizeVariants, hasBobaOption, displayOrder) VALUES 
    (1, 'Organic Black Tea', '原片有機紅茶', 'black-tea', ${toPaise(280)}, ${toPaise(250)}, ${toPaise(385)}, ${toPaise(345)}, ${toPaise(445)}, ${toPaise(395)}, ${toPaise(395)}, ${toPaise(360)}, ${toPaise(460)}, ${toPaise(415)}, true, true, 1),
    (1, 'Organic Oolong Tea', '原片有機烏龍', 'oolong-tea', ${toPaise(300)}, ${toPaise(270)}, ${toPaise(405)}, ${toPaise(365)}, ${toPaise(465)}, ${toPaise(415)}, ${toPaise(415)}, ${toPaise(375)}, ${toPaise(480)}, ${toPaise(430)}, true, true, 2),
    (1, 'Organic Green Tea', '原片有機綠茶', 'green-tea', ${toPaise(280)}, ${toPaise(250)}, ${toPaise(385)}, ${toPaise(345)}, ${toPaise(445)}, ${toPaise(395)}, ${toPaise(395)}, ${toPaise(360)}, ${toPaise(460)}, ${toPaise(415)}, true, true, 3),
    (1, 'Matcha Blend', '抹茶特調', 'matcha', ${toPaise(300)}, ${toPaise(270)}, ${toPaise(405)}, ${toPaise(365)}, ${toPaise(465)}, ${toPaise(415)}, ${toPaise(415)}, ${toPaise(375)}, ${toPaise(480)}, ${toPaise(430)}, true, true, 4),
    (1, 'Taro Blend', '香芋特調', 'taro', ${toPaise(300)}, ${toPaise(270)}, ${toPaise(405)}, ${toPaise(365)}, ${toPaise(465)}, ${toPaise(415)}, ${toPaise(415)}, ${toPaise(375)}, ${toPaise(480)}, ${toPaise(430)}, true, true, 5),
    (2, 'Iced Coffee', '冰咖啡', 'iced-coffee', ${toPaise(300)}, ${toPaise(270)}, ${toPaise(405)}, ${toPaise(365)}, ${toPaise(465)}, ${toPaise(415)}, ${toPaise(415)}, ${toPaise(375)}, ${toPaise(480)}, ${toPaise(430)}, true, true, 1),
    (2, 'Hot Coffee', '熱咖啡', 'hot-coffee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 2),
    (3, 'Fruit Mochi', '水果雪梅娘系列', 'fruit-mochi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 1),
    (3, 'Signature Mochi', '招牌雪莓娘系列', 'signature-mochi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 2),
    (4, 'Onigiri', '日式飯糰', 'onigiri', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 1),
    (4, 'Flat Bread', '蔥油餅', 'flat-bread', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 2),
    (4, 'Noodles', '麵食', 'noodles', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 3),
    (4, 'Pillow Brioche', '厚片吐司', 'pillow-brioche', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 4),
    (4, 'Desserts', '甜點', 'desserts', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 5),
    (5, 'Fruit Slush', '冰沙', 'fruit-slush', ${toPaise(300)}, ${toPaise(270)}, ${toPaise(405)}, ${toPaise(365)}, ${toPaise(465)}, ${toPaise(415)}, NULL, NULL, NULL, NULL, true, true, 1)
  `);

  // Seed Black Tea products
  const blackTeaProducts = [
    ['Classic Taiwan Milk Tea', '經典台式奶茶', 'classic-taiwan-milk-tea'],
    ['Rose Milk Tea', '玫瑰奶茶', 'rose-milk-tea'],
    ['Hazelnut Milk Tea', '榛果奶茶', 'hazelnut-milk-tea'],
    ['Caramel Milk Tea', '焦糖奶茶', 'caramel-milk-tea'],
    ['Classic Tea Latte', '經典紅茶拿鐵', 'classic-tea-latte'],
    ['English Cream Tea Latte', '英式奶油紅茶拿鐵', 'english-cream-tea-latte'],
    ['Mocha Tea Latte', '摩卡紅茶拿鐵', 'mocha-tea-latte'],
    ['Cinnamon Vanilla Tea Latte', '肉桂香草紅茶拿鐵', 'cinnamon-vanilla-tea-latte'],
    ['Black Forest Tea Latte', '黑森林紅茶拿鐵', 'black-forest-tea-latte'],
    ['Mint Lemon Tea', '薄荷檸檬紅茶', 'mint-lemon-tea'],
  ];
  
  for (let i = 0; i < blackTeaProducts.length; i++) {
    const [name, chineseName, slug] = blackTeaProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, isVegetarian) VALUES (1, '${name}', '${chineseName}', '${slug}', ${i + 1}, true)`);
  }

  // Seed Oolong Tea products
  const oolongProducts = [
    ['Classic Taiwan Milk Oolong', '經典台式烏龍奶茶', 'classic-taiwan-milk-oolong'],
    ['Saffron Milk Oolong', '番紅花烏龍奶茶', 'saffron-milk-oolong'],
    ['Butterscotch Milk Oolong', '奶油糖烏龍奶茶', 'butterscotch-milk-oolong'],
    ['Cinnamon Chocolate Milk Oolong', '肉桂巧克力烏龍奶茶', 'cinnamon-chocolate-milk-oolong'],
    ['Classic Oolong Latte', '經典烏龍拿鐵', 'classic-oolong-latte'],
    ['Tiramisu Oolong Latte', '提拉米蘇烏龍拿鐵', 'tiramisu-oolong-latte'],
    ['Crème Brûlée Oolong Latte', '烤布蕾烏龍拿鐵', 'creme-brulee-oolong-latte'],
    ['Rose Oolong Latte', '玫瑰烏龍拿鐵', 'rose-oolong-latte'],
  ];
  
  for (let i = 0; i < oolongProducts.length; i++) {
    const [name, chineseName, slug] = oolongProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, isVegetarian) VALUES (2, '${name}', '${chineseName}', '${slug}', ${i + 1}, true)`);
  }

  // Seed Green Tea products
  const greenTeaProducts = [
    ['Classic Taiwan Green Tea', '經典台式綠茶', 'classic-taiwan-green-tea'],
    ['Virgin Pina Colada Green Tea', '無酒精鳳梨可樂達綠茶', 'virgin-pina-colada-green-tea'],
    ['Virgin Mojito Green Tea', '無酒精莫希托綠茶', 'virgin-mojito-green-tea'],
    ['Mango Green Tea', '芒果綠茶', 'mango-green-tea'],
    ['Honey Lemon Green Tea', '蜂蜜檸檬綠茶', 'honey-lemon-green-tea'],
    ['Pink Guava Green Tea', '紅心芭樂綠茶', 'pink-guava-green-tea'],
    ['Strawberry Jelly Green Tea', '草莓果凍綠茶', 'strawberry-jelly-green-tea'],
    ['Kiwi Green Tea', '奇異果綠茶', 'kiwi-green-tea'],
    ['Lychee Green Tea', '荔枝綠茶', 'lychee-green-tea'],
    ['Yuzu Green Tea', '柚子蜜綠茶', 'yuzu-green-tea'],
  ];
  
  for (let i = 0; i < greenTeaProducts.length; i++) {
    const [name, chineseName, slug] = greenTeaProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, isVegetarian) VALUES (3, '${name}', '${chineseName}', '${slug}', ${i + 1}, true)`);
  }

  // Seed Matcha products
  const matchaProducts = [
    ['Classic Matcha Latte', '經典抹茶拿鐵', 'classic-matcha-latte'],
    ['Curacao Matcha Latte', '藍柑抹茶拿鐵', 'curacao-matcha-latte'],
    ['Strawberry Matcha Latte', '草莓抹茶拿鐵', 'strawberry-matcha-latte'],
    ['Vanilla Matcha Latte', '香草抹茶拿鐵', 'vanilla-matcha-latte'],
    ['Coconut Matcha Latte', '椰奶抹茶拿鐵', 'coconut-matcha-latte'],
    ['Rose Matcha Latte', '玫瑰抹茶拿鐵', 'rose-matcha-latte'],
    ['Banoffee Matcha Latte', '香蕉太妃抹茶拿鐵', 'banoffee-matcha-latte'],
  ];
  
  for (let i = 0; i < matchaProducts.length; i++) {
    const [name, chineseName, slug] = matchaProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, isVegetarian) VALUES (4, '${name}', '${chineseName}', '${slug}', ${i + 1}, true)`);
  }

  // Seed Taro products
  const taroProducts = [
    ['Classic Taro Latte', '經典香芋拿鐵', 'classic-taro-latte'],
    ['Crème Brulee Taro Latte', '烤布蕾香芋拿鐵', 'creme-brulee-taro-latte'],
    ['Black Forest Taro Latte', '黑森林香芋拿鐵', 'black-forest-taro-latte'],
    ['Taro Matcha Latte', '香芋抹茶拿鐵', 'taro-matcha-latte'],
    ['Coconut Taro Latte', '椰奶香芋拿鐵', 'coconut-taro-latte'],
    ['Butterscotch Taro Latte', '奶油糖香芋拿鐵', 'butterscotch-taro-latte'],
  ];
  
  for (let i = 0; i < taroProducts.length; i++) {
    const [name, chineseName, slug] = taroProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, isVegetarian) VALUES (5, '${name}', '${chineseName}', '${slug}', ${i + 1}, true)`);
  }

  // Seed Iced Coffee products
  const icedCoffeeProducts = [
    ['Iced Black Americano', '冰美式黑咖啡', 'iced-black-americano'],
    ['Iced Caffe Latte', '冰拿鐵', 'iced-caffe-latte'],
    ['Iced Caffe Mocha', '冰摩卡', 'iced-caffe-mocha'],
    ['Iced Hong Kong Style Yuen-Yeung', '港式凍鴛鴦奶茶', 'iced-hong-kong-yuen-yeung'],
  ];
  
  for (let i = 0; i < icedCoffeeProducts.length; i++) {
    const [name, chineseName, slug] = icedCoffeeProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, isVegetarian) VALUES (6, '${name}', '${chineseName}', '${slug}', ${i + 1}, true)`);
  }

  // Seed Hot Coffee products (fixed prices, in-store only)
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, displayOrder, availableDelivery, isVegetarian) VALUES 
    (7, 'Americano', '熱美式黑咖啡', 'hot-americano', ${toPaise(225)}, 1, false, true),
    (7, 'Latte', '熱拿鐵', 'hot-latte', ${toPaise(245)}, 2, false, true),
    (7, 'Cappuccino', '熱卡布奇諾', 'hot-cappuccino', ${toPaise(245)}, 3, false, true),
    (7, 'Mocha', '熱摩卡', 'hot-mocha', ${toPaise(280)}, 4, false, true),
    (7, 'Single Espresso', '義式單杯咖啡濃縮', 'single-espresso', ${toPaise(115)}, 5, false, true),
    (7, 'Double Espresso', '義式雙杯咖啡濃縮', 'double-espresso', ${toPaise(215)}, 6, false, true)
  `);

  // Seed Fruit Mochis
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, deliveryUnitMultiplier, displayOrder, isVegetarian) VALUES 
    (8, 'Strawberry Mochi', '草莓', 'strawberry-mochi', ${toPaise(185)}, ${toPaise(385)}, 2, 1, true),
    (8, 'Pineapple Mochi', '鳳梨', 'pineapple-mochi', ${toPaise(185)}, ${toPaise(385)}, 2, 2, true),
    (8, 'Mango Mochi', '芒果', 'mango-mochi', ${toPaise(185)}, ${toPaise(385)}, 2, 3, true),
    (8, 'Blueberry Mochi', '藍莓', 'blueberry-mochi', ${toPaise(185)}, ${toPaise(385)}, 2, 4, true),
    (8, 'Cherry Mochi', '櫻桃', 'cherry-mochi', ${toPaise(185)}, ${toPaise(385)}, 2, 5, true)
  `);

  // Seed Signature Mochis
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, deliveryUnitMultiplier, displayOrder, isVegetarian) VALUES 
    (9, 'Rocher Mochi', '金沙巧克力', 'rocher-mochi', ${toPaise(270)}, ${toPaise(550)}, 2, 1, true),
    (9, 'Banoffee Mochi', '香蕉太妃', 'banoffee-mochi', ${toPaise(270)}, ${toPaise(550)}, 2, 2, true),
    (9, 'Dragon Speck Mochi', '橙醬火龍果', 'dragon-speck-mochi', ${toPaise(270)}, ${toPaise(550)}, 2, 3, true)
  `);

  // Seed Food - Onigiri
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, displayOrder, isVegetarian) VALUES 
    (10, 'Yaki Onigiri', '烤飯糰', 'yaki-onigiri', ${toPaise(450)}, ${toPaise(450)}, 1, true)
  `);

  // Seed Food - Flat Bread
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, displayOrder, isVegetarian, containsEgg) VALUES 
    (11, 'Original Çong Yoú Bǐng', '原味蔥油餅', 'original-cong-you-bing', ${toPaise(285)}, ${toPaise(285)}, 1, true, false),
    (11, 'Egg Çong Yoú Bǐng', '蔥油餅加蛋', 'egg-cong-you-bing', ${toPaise(315)}, ${toPaise(315)}, 2, false, true),
    (11, 'Cheesy Corn Çong Yoú Bǐng', '玉米起司蔥油餅', 'cheesy-corn-cong-you-bing', ${toPaise(340)}, ${toPaise(340)}, 3, true, false),
    (11, 'Egg Cheesy Corn Çong Yoú Bǐng', '玉米起司蔥油餅加蛋', 'egg-cheesy-corn-cong-you-bing', ${toPaise(360)}, ${toPaise(360)}, 4, false, true),
    (11, 'Stir-fried Veg Çong Yoú Bǐng', '蔥油餅炒時蔬', 'stirfried-veg-cong-you-bing', ${toPaise(435)}, ${toPaise(435)}, 5, true, false)
  `);

  // Seed Food - Noodles
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, displayOrder, isVegetarian, containsEgg) VALUES 
    (12, '8-Tomato Noodle Soup', '茄汁湯麵', 'tomato-noodle-soup', ${toPaise(435)}, ${toPaise(435)}, 1, true, false),
    (12, 'Vinegar-Spiced Noodle Soup', '酸辣湯麵', 'vinegar-spiced-noodle-soup', ${toPaise(435)}, ${toPaise(435)}, 2, true, false),
    (12, 'Biang Biang Noodles', '油潑麵', 'biang-biang-noodles', ${toPaise(395)}, ${toPaise(395)}, 3, true, false),
    (12, 'Velvety Aubergine Stew Noodle', '茄子拌麵', 'aubergine-stew-noodle', ${toPaise(435)}, ${toPaise(435)}, 4, true, false),
    (12, 'Omunoodles', '蛋包麵', 'omunoodles', ${toPaise(435)}, ${toPaise(435)}, 5, false, true),
    (12, 'Omurice', '蛋包飯', 'omurice', ${toPaise(435)}, ${toPaise(435)}, 6, false, true)
  `);

  // Seed Food - Pillow Brioche
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, displayOrder, isVegetarian) VALUES 
    (13, 'Savoury Pillow Brioche', '厚片吐司(鹹)', 'savoury-pillow-brioche', ${toPaise(395)}, ${toPaise(395)}, 1, true),
    (13, 'Sweet Pillow Brioche', '厚片吐司(甜)', 'sweet-pillow-brioche', ${toPaise(395)}, ${toPaise(395)}, 2, true)
  `);

  // Seed Food - Desserts
  await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, instorePrice, deliveryPrice, displayOrder, isVegetarian, containsEgg) VALUES 
    (14, 'Boba Creme Caramel', '粉圓布丁', 'boba-creme-caramel', ${toPaise(250)}, ${toPaise(275)}, 1, true, false),
    (14, 'Omelette', '日式奄列', 'omelette', ${toPaise(435)}, ${toPaise(435)}, 2, false, true)
  `);

  // Seed Slush (in-store only)
  const slushProducts = [
    ['Mango Slush', '芒果冰沙', 'mango-slush'],
    ['Strawberry Slush', '草莓冰沙', 'strawberry-slush'],
    ['Lychee Slush', '荔枝冰沙', 'lychee-slush'],
    ['Kiwi Slush', '奇異果冰沙', 'kiwi-slush'],
    ['Cherry Slush', '櫻桃冰沙', 'cherry-slush'],
    ['Watermelon Slush', '西瓜冰沙', 'watermelon-slush'],
    ['Virgin Piña Colada Slush', '無酒精鳳梨可樂達冰沙', 'virgin-pina-colada-slush'],
    ['Virgin Mojito Slush', '無酒精莫希托冰沙', 'virgin-mojito-slush'],
  ];
  
  for (let i = 0; i < slushProducts.length; i++) {
    const [name, chineseName, slug] = slushProducts[i];
    await db.execute(`INSERT IGNORE INTO products (subcategoryId, name, chineseName, slug, displayOrder, availableDelivery, isVegetarian, isVegan) VALUES (15, '${name}', '${chineseName}', '${slug}', ${i + 1}, false, true, true)`);
  }

  // Seed Add-ons
  await db.execute(`INSERT IGNORE INTO addons (name, chineseName, type, pricePetite, priceRegular, priceLarge, fixedPrice, displayOrder) VALUES 
    ('Tapioca Pearls', '粉圓', 'boba_flavor', 0, 0, 0, NULL, 1),
    ('Strawberry Popping Boba', '草莓爆爆珠', 'boba_flavor', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 2),
    ('Blueberry Popping Boba', '藍莓爆爆珠', 'boba_flavor', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 3),
    ('Mango Popping Boba', '芒果爆爆珠', 'boba_flavor', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 4),
    ('Lychee Popping Boba', '荔枝爆爆珠', 'boba_flavor', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 5),
    ('Passionfruit Popping Boba', '百香果爆爆珠', 'boba_flavor', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 6),
    ('Oat Milk', '燕麥奶', 'vegan_milk', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 1),
    ('Almond Milk', '杏仁奶', 'vegan_milk', ${toPaise(30)}, ${toPaise(40)}, ${toPaise(50)}, NULL, 2),
    ('Egg', '蛋', 'food_addon', NULL, NULL, NULL, ${toPaise(20)}, 1),
    ('Cheese', '起司', 'food_addon', NULL, NULL, NULL, ${toPaise(40)}, 2)
  `);

  // Seed customization options
  await db.execute(`INSERT IGNORE INTO customization_options (type, value, displayOrder) VALUES 
    ('sugar_level', '0%', 1),
    ('sugar_level', '25%', 2),
    ('sugar_level', '50%', 3),
    ('sugar_level', '75%', 4),
    ('sugar_level', '100%', 5),
    ('ice_level', 'No Ice', 1),
    ('ice_level', 'Less Ice', 2),
    ('ice_level', 'Regular Ice', 3),
    ('ice_level', 'Extra Ice', 4)
  `);

  // Seed store locations
  await db.execute(`INSERT IGNORE INTO store_locations (name, address, area, pincode, phone, openingHours) VALUES 
    ('Taiwan Maami - Palladium Mall', 'Palladium Mall, 1st Floor, Velachery Main Road', 'Velachery', '600042', '+91 98765 43210', '11:00 AM - 10:00 PM'),
    ('Taiwan Maami - T Nagar', 'Shop No. 5, Ground Floor, Pondy Bazaar', 'T Nagar', '600017', '+91 98765 43211', '11:00 AM - 10:00 PM')
  `);

  // Seed delivery areas
  await db.execute(`INSERT IGNORE INTO delivery_areas (areaName, pincode, deliveryCharge) VALUES 
    ('T Nagar', '600017', ${toPaise(30)}),
    ('Velachery', '600042', ${toPaise(30)}),
    ('Adyar', '600020', ${toPaise(40)}),
    ('Anna Nagar', '600040', ${toPaise(50)}),
    ('Mylapore', '600004', ${toPaise(40)}),
    ('Triplicane', '600005', ${toPaise(40)}),
    ('Nungambakkam', '600034', ${toPaise(40)}),
    ('Alwarpet', '600018', ${toPaise(35)})
  `);

  console.log("Database seeded successfully!");
  process.exit(0);
}

seedDatabase().catch(console.error);
