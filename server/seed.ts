import { drizzle } from "drizzle-orm/mysql2";
import { categories, subcategories, products, addons, customizationOptions, storeLocations, deliveryAreas } from "../drizzle/schema";

// Helper to convert rupees to paise
const toPaise = (rupees: number) => rupees * 100;

export async function seedDatabase() {
  const db = drizzle(process.env.DATABASE_URL!);

  // Seed Categories
  const categoryData = [
    { name: "Bubble Tea", slug: "bubble-tea", description: "Authentic Taiwanese bubble tea with imported tapioca pearls", displayOrder: 1 },
    { name: "Coffee", slug: "coffee", description: "Premium Lavazza coffee selections", displayOrder: 2 },
    { name: "Mochis", slug: "mochis", description: "Handcrafted Japanese-style mochi desserts", displayOrder: 3 },
    { name: "Food", slug: "food", description: "Authentic Asian street food", displayOrder: 4 },
    { name: "Slush", slug: "slush", description: "Refreshing fruit slush drinks", displayOrder: 5 },
  ];
  await db.insert(categories).values(categoryData).onDuplicateKeyUpdate({ set: { name: categoryData[0].name } });

  // Seed Subcategories with base pricing
  const subcategoryData = [
    // Bubble Tea subcategories
    { categoryId: 1, name: "Organic Black Tea", chineseName: "原片有機紅茶", slug: "black-tea", 
      basePricePetiteWithBoba: toPaise(280), basePricePetiteNoBoba: toPaise(250),
      basePriceRegularWithBoba: toPaise(385), basePriceRegularNoBoba: toPaise(345),
      basePriceLargeWithBoba: toPaise(445), basePriceLargeNoBoba: toPaise(395),
      deliveryPriceRegularWithBoba: toPaise(395), deliveryPriceRegularNoBoba: toPaise(360),
      deliveryPriceLargeWithBoba: toPaise(460), deliveryPriceLargeNoBoba: toPaise(415),
      hasSizeVariants: true, hasBobaOption: true, displayOrder: 1 },
    { categoryId: 1, name: "Organic Oolong Tea", chineseName: "原片有機烏龍", slug: "oolong-tea",
      basePricePetiteWithBoba: toPaise(300), basePricePetiteNoBoba: toPaise(270),
      basePriceRegularWithBoba: toPaise(405), basePriceRegularNoBoba: toPaise(365),
      basePriceLargeWithBoba: toPaise(465), basePriceLargeNoBoba: toPaise(415),
      deliveryPriceRegularWithBoba: toPaise(415), deliveryPriceRegularNoBoba: toPaise(375),
      deliveryPriceLargeWithBoba: toPaise(480), deliveryPriceLargeNoBoba: toPaise(430),
      hasSizeVariants: true, hasBobaOption: true, displayOrder: 2 },
    { categoryId: 1, name: "Organic Green Tea", chineseName: "原片有機綠茶", slug: "green-tea",
      basePricePetiteWithBoba: toPaise(280), basePricePetiteNoBoba: toPaise(250),
      basePriceRegularWithBoba: toPaise(385), basePriceRegularNoBoba: toPaise(345),
      basePriceLargeWithBoba: toPaise(445), basePriceLargeNoBoba: toPaise(395),
      deliveryPriceRegularWithBoba: toPaise(395), deliveryPriceRegularNoBoba: toPaise(360),
      deliveryPriceLargeWithBoba: toPaise(460), deliveryPriceLargeNoBoba: toPaise(415),
      hasSizeVariants: true, hasBobaOption: true, displayOrder: 3 },
    { categoryId: 1, name: "Matcha Blend", chineseName: "抹茶特調", slug: "matcha",
      basePricePetiteWithBoba: toPaise(300), basePricePetiteNoBoba: toPaise(270),
      basePriceRegularWithBoba: toPaise(405), basePriceRegularNoBoba: toPaise(365),
      basePriceLargeWithBoba: toPaise(465), basePriceLargeNoBoba: toPaise(415),
      deliveryPriceRegularWithBoba: toPaise(415), deliveryPriceRegularNoBoba: toPaise(375),
      deliveryPriceLargeWithBoba: toPaise(480), deliveryPriceLargeNoBoba: toPaise(430),
      hasSizeVariants: true, hasBobaOption: true, displayOrder: 4 },
    { categoryId: 1, name: "Taro Blend", chineseName: "香芋特調", slug: "taro",
      basePricePetiteWithBoba: toPaise(300), basePricePetiteNoBoba: toPaise(270),
      basePriceRegularWithBoba: toPaise(405), basePriceRegularNoBoba: toPaise(365),
      basePriceLargeWithBoba: toPaise(465), basePriceLargeNoBoba: toPaise(415),
      deliveryPriceRegularWithBoba: toPaise(415), deliveryPriceRegularNoBoba: toPaise(375),
      deliveryPriceLargeWithBoba: toPaise(480), deliveryPriceLargeNoBoba: toPaise(430),
      hasSizeVariants: true, hasBobaOption: true, displayOrder: 5 },
    // Coffee subcategories
    { categoryId: 2, name: "Iced Coffee", chineseName: "冰咖啡", slug: "iced-coffee",
      basePricePetiteWithBoba: toPaise(300), basePricePetiteNoBoba: toPaise(270),
      basePriceRegularWithBoba: toPaise(405), basePriceRegularNoBoba: toPaise(365),
      basePriceLargeWithBoba: toPaise(465), basePriceLargeNoBoba: toPaise(415),
      deliveryPriceRegularWithBoba: toPaise(415), deliveryPriceRegularNoBoba: toPaise(375),
      deliveryPriceLargeWithBoba: toPaise(480), deliveryPriceLargeNoBoba: toPaise(430),
      hasSizeVariants: true, hasBobaOption: true, displayOrder: 1 },
    { categoryId: 2, name: "Hot Coffee", chineseName: "熱咖啡", slug: "hot-coffee",
      hasSizeVariants: false, hasBobaOption: false, availableDelivery: false, displayOrder: 2 },
    // Mochi subcategories
    { categoryId: 3, name: "Fruit Mochi", chineseName: "水果雪梅娘系列", slug: "fruit-mochi",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 1 },
    { categoryId: 3, name: "Signature Mochi", chineseName: "招牌雪莓娘系列", slug: "signature-mochi",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 2 },
    // Food subcategories
    { categoryId: 4, name: "Onigiri", chineseName: "日式飯糰", slug: "onigiri",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 1 },
    { categoryId: 4, name: "Flat Bread", chineseName: "蔥油餅", slug: "flat-bread",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 2 },
    { categoryId: 4, name: "Noodles", chineseName: "麵食", slug: "noodles",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 3 },
    { categoryId: 4, name: "Pillow Brioche", chineseName: "厚片吐司", slug: "pillow-brioche",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 4 },
    { categoryId: 4, name: "Desserts", chineseName: "甜點", slug: "desserts",
      hasSizeVariants: false, hasBobaOption: false, displayOrder: 5 },
    // Slush subcategory (in-store only)
    { categoryId: 5, name: "Fruit Slush", chineseName: "冰沙", slug: "fruit-slush",
      basePricePetiteWithBoba: toPaise(300), basePricePetiteNoBoba: toPaise(270),
      basePriceRegularWithBoba: toPaise(405), basePriceRegularNoBoba: toPaise(365),
      basePriceLargeWithBoba: toPaise(465), basePriceLargeNoBoba: toPaise(415),
      hasSizeVariants: true, hasBobaOption: true, availableDelivery: false, displayOrder: 1 },
  ];
  
  for (const sub of subcategoryData) {
    await db.insert(subcategories).values(sub).onDuplicateKeyUpdate({ set: { name: sub.name } });
  }

  // Seed Products - Black Tea flavors
  const blackTeaProducts = [
    { name: "Classic Taiwan Milk Tea", chineseName: "經典台式奶茶", slug: "classic-taiwan-milk-tea" },
    { name: "Rose Milk Tea", chineseName: "玫瑰奶茶", slug: "rose-milk-tea" },
    { name: "Hazelnut Milk Tea", chineseName: "榛果奶茶", slug: "hazelnut-milk-tea" },
    { name: "Caramel Milk Tea", chineseName: "焦糖奶茶", slug: "caramel-milk-tea" },
    { name: "Classic Tea Latte", chineseName: "經典紅茶拿鐵", slug: "classic-tea-latte" },
    { name: "English Cream Tea Latte", chineseName: "英式奶油紅茶拿鐵", slug: "english-cream-tea-latte" },
    { name: "Mocha Tea Latte", chineseName: "摩卡紅茶拿鐵", slug: "mocha-tea-latte" },
    { name: "Cinnamon Vanilla Tea Latte", chineseName: "肉桂香草紅茶拿鐵", slug: "cinnamon-vanilla-tea-latte" },
    { name: "Black Forest Tea Latte", chineseName: "黑森林紅茶拿鐵", slug: "black-forest-tea-latte" },
    { name: "Mint Lemon Tea", chineseName: "薄荷檸檬紅茶", slug: "mint-lemon-tea" },
  ];
  for (let i = 0; i < blackTeaProducts.length; i++) {
    await db.insert(products).values({ ...blackTeaProducts[i], subcategoryId: 1, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: blackTeaProducts[i].name } });
  }

  // Oolong Tea flavors
  const oolongProducts = [
    { name: "Classic Taiwan Milk Oolong", chineseName: "經典台式烏龍奶茶", slug: "classic-taiwan-milk-oolong" },
    { name: "Saffron Milk Oolong", chineseName: "番紅花烏龍奶茶", slug: "saffron-milk-oolong" },
    { name: "Butterscotch Milk Oolong", chineseName: "奶油糖烏龍奶茶", slug: "butterscotch-milk-oolong" },
    { name: "Cinnamon Chocolate Milk Oolong", chineseName: "肉桂巧克力烏龍奶茶", slug: "cinnamon-chocolate-milk-oolong" },
    { name: "Classic Oolong Latte", chineseName: "經典烏龍拿鐵", slug: "classic-oolong-latte" },
    { name: "Tiramisu Oolong Latte", chineseName: "提拉米蘇烏龍拿鐵", slug: "tiramisu-oolong-latte" },
    { name: "Crème Brûlée Oolong Latte", chineseName: "烤布蕾烏龍拿鐵", slug: "creme-brulee-oolong-latte" },
    { name: "Rose Oolong Latte", chineseName: "玫瑰烏龍拿鐵", slug: "rose-oolong-latte" },
    { name: "Blueberry Lemon Oolong", chineseName: "藍莓檸檬純烏龍", slug: "blueberry-lemon-oolong" },
  ];
  for (let i = 0; i < oolongProducts.length; i++) {
    await db.insert(products).values({ ...oolongProducts[i], subcategoryId: 2, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: oolongProducts[i].name } });
  }

  // Green Tea flavors
  const greenTeaProducts = [
    { name: "Classic Taiwan Green Tea", chineseName: "經典台式綠茶", slug: "classic-taiwan-green-tea" },
    { name: "Virgin Pina Colada Green Tea", chineseName: "無酒精鳳梨可樂達綠茶", slug: "virgin-pina-colada-green-tea" },
    { name: "Virgin Mojito Green Tea", chineseName: "無酒精莫希托綠茶", slug: "virgin-mojito-green-tea" },
    { name: "Mango Green Tea", chineseName: "芒果綠茶", slug: "mango-green-tea" },
    { name: "Honey Lemon Green Tea", chineseName: "蜂蜜檸檬綠茶", slug: "honey-lemon-green-tea" },
    { name: "Pink Guava Green Tea", chineseName: "紅心芭樂綠茶", slug: "pink-guava-green-tea" },
    { name: "Strawberry Jelly Green Tea", chineseName: "草莓果凍綠茶", slug: "strawberry-jelly-green-tea" },
    { name: "Kiwi Green Tea", chineseName: "奇異果綠茶", slug: "kiwi-green-tea" },
    { name: "Lychee Green Tea", chineseName: "荔枝綠茶", slug: "lychee-green-tea" },
    { name: "Yuzu Green Tea", chineseName: "柚子蜜綠茶", slug: "yuzu-green-tea" },
  ];
  for (let i = 0; i < greenTeaProducts.length; i++) {
    await db.insert(products).values({ ...greenTeaProducts[i], subcategoryId: 3, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: greenTeaProducts[i].name } });
  }

  // Matcha flavors
  const matchaProducts = [
    { name: "Classic Matcha Latte", chineseName: "經典抹茶拿鐵", slug: "classic-matcha-latte" },
    { name: "Curacao Matcha Latte", chineseName: "藍柑抹茶拿鐵", slug: "curacao-matcha-latte" },
    { name: "Strawberry Matcha Latte", chineseName: "草莓抹茶拿鐵", slug: "strawberry-matcha-latte" },
    { name: "Vanilla Matcha Latte", chineseName: "香草抹茶拿鐵", slug: "vanilla-matcha-latte" },
    { name: "Coconut Matcha Latte", chineseName: "椰奶抹茶拿鐵", slug: "coconut-matcha-latte" },
    { name: "Rose Matcha Latte", chineseName: "玫瑰抹茶拿鐵", slug: "rose-matcha-latte" },
    { name: "Banoffee Matcha Latte", chineseName: "香蕉太妃抹茶拿鐵", slug: "banoffee-matcha-latte" },
  ];
  for (let i = 0; i < matchaProducts.length; i++) {
    await db.insert(products).values({ ...matchaProducts[i], subcategoryId: 4, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: matchaProducts[i].name } });
  }

  // Taro flavors
  const taroProducts = [
    { name: "Classic Taro Latte", chineseName: "經典香芋拿鐵", slug: "classic-taro-latte" },
    { name: "Crème Brulee Taro Latte", chineseName: "烤布蕾香芋拿鐵", slug: "creme-brulee-taro-latte" },
    { name: "Black Forest Taro Latte", chineseName: "黑森林香芋拿鐵", slug: "black-forest-taro-latte" },
    { name: "Taro Matcha Latte", chineseName: "香芋抹茶拿鐵", slug: "taro-matcha-latte" },
    { name: "Coconut Taro Latte", chineseName: "椰奶香芋拿鐵", slug: "coconut-taro-latte" },
    { name: "Butterscotch Taro Latte", chineseName: "奶油糖香芋拿鐵", slug: "butterscotch-taro-latte" },
  ];
  for (let i = 0; i < taroProducts.length; i++) {
    await db.insert(products).values({ ...taroProducts[i], subcategoryId: 5, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: taroProducts[i].name } });
  }

  // Iced Coffee
  const icedCoffeeProducts = [
    { name: "Iced Black Americano", chineseName: "冰美式黑咖啡", slug: "iced-black-americano" },
    { name: "Iced Caffe Latte", chineseName: "冰拿鐵", slug: "iced-caffe-latte" },
    { name: "Iced Caffe Mocha", chineseName: "冰摩卡", slug: "iced-caffe-mocha" },
    { name: "Iced Hong Kong Style Yuen-Yeung", chineseName: "港式凍鴛鴦奶茶", slug: "iced-hong-kong-yuen-yeung" },
  ];
  for (let i = 0; i < icedCoffeeProducts.length; i++) {
    await db.insert(products).values({ ...icedCoffeeProducts[i], subcategoryId: 6, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: icedCoffeeProducts[i].name } });
  }

  // Hot Coffee (fixed prices)
  const hotCoffeeProducts = [
    { name: "Americano", chineseName: "熱美式黑咖啡", slug: "hot-americano", instorePrice: toPaise(225) },
    { name: "Latte", chineseName: "熱拿鐵", slug: "hot-latte", instorePrice: toPaise(245) },
    { name: "Cappuccino", chineseName: "熱卡布奇諾", slug: "hot-cappuccino", instorePrice: toPaise(245) },
    { name: "Mocha", chineseName: "熱摩卡", slug: "hot-mocha", instorePrice: toPaise(280) },
    { name: "Single Espresso", chineseName: "義式單杯咖啡濃縮", slug: "single-espresso", instorePrice: toPaise(115) },
    { name: "Double Espresso", chineseName: "義式雙杯咖啡濃縮", slug: "double-espresso", instorePrice: toPaise(215) },
  ];
  for (let i = 0; i < hotCoffeeProducts.length; i++) {
    await db.insert(products).values({ ...hotCoffeeProducts[i], subcategoryId: 7, displayOrder: i + 1, availableDelivery: false }).onDuplicateKeyUpdate({ set: { name: hotCoffeeProducts[i].name } });
  }

  // Fruit Mochis
  const fruitMochiProducts = [
    { name: "Strawberry Mochi", chineseName: "草莓", slug: "strawberry-mochi", instorePrice: toPaise(185), deliveryPrice: toPaise(385), deliveryUnitMultiplier: 2 },
    { name: "Pineapple Mochi", chineseName: "鳳梨", slug: "pineapple-mochi", instorePrice: toPaise(185), deliveryPrice: toPaise(385), deliveryUnitMultiplier: 2 },
    { name: "Mango Mochi", chineseName: "芒果", slug: "mango-mochi", instorePrice: toPaise(185), deliveryPrice: toPaise(385), deliveryUnitMultiplier: 2 },
    { name: "Blueberry Mochi", chineseName: "藍莓", slug: "blueberry-mochi", instorePrice: toPaise(185), deliveryPrice: toPaise(385), deliveryUnitMultiplier: 2 },
    { name: "Cherry Mochi", chineseName: "櫻桃", slug: "cherry-mochi", instorePrice: toPaise(185), deliveryPrice: toPaise(385), deliveryUnitMultiplier: 2 },
  ];
  for (let i = 0; i < fruitMochiProducts.length; i++) {
    await db.insert(products).values({ ...fruitMochiProducts[i], subcategoryId: 8, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: fruitMochiProducts[i].name } });
  }

  // Signature Mochis
  const signatureMochiProducts = [
    { name: "Rocher Mochi", chineseName: "金沙巧克力", slug: "rocher-mochi", instorePrice: toPaise(270), deliveryPrice: toPaise(550), deliveryUnitMultiplier: 2 },
    { name: "Banoffee Mochi", chineseName: "香蕉太妃", slug: "banoffee-mochi", instorePrice: toPaise(270), deliveryPrice: toPaise(550), deliveryUnitMultiplier: 2 },
    { name: "Dragon Speck Mochi", chineseName: "橙醬火龍果", slug: "dragon-speck-mochi", instorePrice: toPaise(270), deliveryPrice: toPaise(550), deliveryUnitMultiplier: 2 },
  ];
  for (let i = 0; i < signatureMochiProducts.length; i++) {
    await db.insert(products).values({ ...signatureMochiProducts[i], subcategoryId: 9, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: signatureMochiProducts[i].name } });
  }

  // Food - Onigiri
  await db.insert(products).values({ name: "Yaki Onigiri", chineseName: "烤飯糰", slug: "yaki-onigiri", subcategoryId: 10, instorePrice: toPaise(450), deliveryPrice: toPaise(450), displayOrder: 1 }).onDuplicateKeyUpdate({ set: { name: "Yaki Onigiri" } });

  // Food - Flat Bread
  const flatBreadProducts = [
    { name: "Original Çong Yoú Bǐng", chineseName: "原味蔥油餅", slug: "original-cong-you-bing", instorePrice: toPaise(285), deliveryPrice: toPaise(285), isVegetarian: true },
    { name: "Egg Çong Yoú Bǐng", chineseName: "蔥油餅加蛋", slug: "egg-cong-you-bing", instorePrice: toPaise(315), deliveryPrice: toPaise(315), containsEgg: true },
    { name: "Cheesy Corn Çong Yoú Bǐng", chineseName: "玉米起司蔥油餅", slug: "cheesy-corn-cong-you-bing", instorePrice: toPaise(340), deliveryPrice: toPaise(340), isVegetarian: true },
    { name: "Egg Cheesy Corn Çong Yoú Bǐng", chineseName: "玉米起司蔥油餅加蛋", slug: "egg-cheesy-corn-cong-you-bing", instorePrice: toPaise(360), deliveryPrice: toPaise(360), containsEgg: true },
    { name: "Stir-fried Veg Çong Yoú Bǐng", chineseName: "蔥油餅炒時蔬", slug: "stirfried-veg-cong-you-bing", instorePrice: toPaise(435), deliveryPrice: toPaise(435), isVegetarian: true },
  ];
  for (let i = 0; i < flatBreadProducts.length; i++) {
    await db.insert(products).values({ ...flatBreadProducts[i], subcategoryId: 11, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: flatBreadProducts[i].name } });
  }

  // Food - Noodles
  const noodleProducts = [
    { name: "8-Tomato Noodle Soup", chineseName: "茄汁湯麵", slug: "tomato-noodle-soup", instorePrice: toPaise(435), deliveryPrice: toPaise(435), isVegetarian: true },
    { name: "Vinegar-Spiced Noodle Soup", chineseName: "酸辣湯麵", slug: "vinegar-spiced-noodle-soup", instorePrice: toPaise(435), deliveryPrice: toPaise(435), isVegetarian: true },
    { name: "Biang Biang Noodles", chineseName: "油潑麵", slug: "biang-biang-noodles", instorePrice: toPaise(395), deliveryPrice: toPaise(395), isVegetarian: true },
    { name: "Velvety Aubergine Stew Noodle", chineseName: "茄子拌麵", slug: "aubergine-stew-noodle", instorePrice: toPaise(435), deliveryPrice: toPaise(435), isVegetarian: true },
    { name: "Omunoodles", chineseName: "蛋包麵", slug: "omunoodles", instorePrice: toPaise(435), deliveryPrice: toPaise(435), containsEgg: true },
    { name: "Omurice", chineseName: "蛋包飯", slug: "omurice", instorePrice: toPaise(435), deliveryPrice: toPaise(435), containsEgg: true },
  ];
  for (let i = 0; i < noodleProducts.length; i++) {
    await db.insert(products).values({ ...noodleProducts[i], subcategoryId: 12, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: noodleProducts[i].name } });
  }

  // Food - Pillow Brioche
  const briocheProducts = [
    { name: "Savoury Pillow Brioche", chineseName: "厚片吐司(鹹)", slug: "savoury-pillow-brioche", instorePrice: toPaise(395), deliveryPrice: toPaise(395), isVegetarian: true },
    { name: "Sweet Pillow Brioche", chineseName: "厚片吐司(甜)", slug: "sweet-pillow-brioche", instorePrice: toPaise(395), deliveryPrice: toPaise(395), isVegetarian: true },
  ];
  for (let i = 0; i < briocheProducts.length; i++) {
    await db.insert(products).values({ ...briocheProducts[i], subcategoryId: 13, displayOrder: i + 1 }).onDuplicateKeyUpdate({ set: { name: briocheProducts[i].name } });
  }

  // Food - Desserts
  await db.insert(products).values({ name: "Boba Creme Caramel", chineseName: "粉圓布丁", slug: "boba-creme-caramel", subcategoryId: 14, instorePrice: toPaise(250), deliveryPrice: toPaise(275), displayOrder: 1, isVegetarian: true }).onDuplicateKeyUpdate({ set: { name: "Boba Creme Caramel" } });
  await db.insert(products).values({ name: "Omelette", chineseName: "日式奄列", slug: "omelette", subcategoryId: 14, instorePrice: toPaise(435), deliveryPrice: toPaise(435), displayOrder: 2, containsEgg: true }).onDuplicateKeyUpdate({ set: { name: "Omelette" } });

  // Slush flavors (in-store only)
  const slushProducts = [
    { name: "Mango Slush", chineseName: "芒果冰沙", slug: "mango-slush" },
    { name: "Strawberry Slush", chineseName: "草莓冰沙", slug: "strawberry-slush" },
    { name: "Lychee Slush", chineseName: "荔枝冰沙", slug: "lychee-slush" },
    { name: "Kiwi Slush", chineseName: "奇異果冰沙", slug: "kiwi-slush" },
    { name: "Cherry Slush", chineseName: "櫻桃冰沙", slug: "cherry-slush" },
    { name: "Watermelon Slush", chineseName: "西瓜冰沙", slug: "watermelon-slush" },
    { name: "Virgin Piña Colada Slush", chineseName: "無酒精鳳梨可樂達冰沙", slug: "virgin-pina-colada-slush" },
    { name: "Virgin Mojito Slush", chineseName: "無酒精莫希托冰沙", slug: "virgin-mojito-slush" },
  ];
  for (let i = 0; i < slushProducts.length; i++) {
    await db.insert(products).values({ ...slushProducts[i], subcategoryId: 15, displayOrder: i + 1, availableDelivery: false, isVegetarian: true, isVegan: true }).onDuplicateKeyUpdate({ set: { name: slushProducts[i].name } });
  }

  // Seed Add-ons
  const addonData = [
    // Boba flavors
    { name: "Tapioca Pearls", chineseName: "粉圓", type: "boba_flavor" as const, pricePetite: toPaise(0), priceRegular: toPaise(0), priceLarge: toPaise(0), displayOrder: 1 },
    { name: "Strawberry Popping Boba", chineseName: "草莓爆爆珠", type: "boba_flavor" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 2 },
    { name: "Blueberry Popping Boba", chineseName: "藍莓爆爆珠", type: "boba_flavor" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 3 },
    { name: "Mango Popping Boba", chineseName: "芒果爆爆珠", type: "boba_flavor" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 4 },
    { name: "Lychee Popping Boba", chineseName: "荔枝爆爆珠", type: "boba_flavor" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 5 },
    { name: "Passionfruit Popping Boba", chineseName: "百香果爆爆珠", type: "boba_flavor" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 6 },
    // Vegan milk
    { name: "Oat Milk", chineseName: "燕麥奶", type: "vegan_milk" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 1 },
    { name: "Almond Milk", chineseName: "杏仁奶", type: "vegan_milk" as const, pricePetite: toPaise(30), priceRegular: toPaise(40), priceLarge: toPaise(50), displayOrder: 2 },
    // Food add-ons
    { name: "Egg", chineseName: "蛋", type: "food_addon" as const, fixedPrice: toPaise(20), displayOrder: 1 },
    { name: "Cheese", chineseName: "起司", type: "food_addon" as const, fixedPrice: toPaise(40), displayOrder: 2 },
  ];
  for (const addon of addonData) {
    await db.insert(addons).values(addon).onDuplicateKeyUpdate({ set: { name: addon.name } });
  }

  // Seed customization options
  const customizationData = [
    { type: "sugar_level" as const, value: "0%", displayOrder: 1 },
    { type: "sugar_level" as const, value: "25%", displayOrder: 2 },
    { type: "sugar_level" as const, value: "50%", displayOrder: 3 },
    { type: "sugar_level" as const, value: "75%", displayOrder: 4 },
    { type: "sugar_level" as const, value: "100%", displayOrder: 5 },
    { type: "ice_level" as const, value: "No Ice", displayOrder: 1 },
    { type: "ice_level" as const, value: "Less Ice", displayOrder: 2 },
    { type: "ice_level" as const, value: "Regular Ice", displayOrder: 3 },
    { type: "ice_level" as const, value: "Extra Ice", displayOrder: 4 },
  ];
  for (const opt of customizationData) {
    await db.insert(customizationOptions).values(opt).onDuplicateKeyUpdate({ set: { value: opt.value } });
  }

  // Seed store locations
  const storeData = [
    { name: "Taiwan Maami - Palladium Mall", address: "Palladium Mall, 1st Floor, Velachery Main Road", area: "Velachery", pincode: "600042", phone: "+91 98765 43210", openingHours: "11:00 AM - 10:00 PM" },
    { name: "Taiwan Maami - T Nagar", address: "Shop No. 5, Ground Floor, Pondy Bazaar", area: "T Nagar", pincode: "600017", phone: "+91 98765 43211", openingHours: "11:00 AM - 10:00 PM" },
  ];
  for (const store of storeData) {
    await db.insert(storeLocations).values(store).onDuplicateKeyUpdate({ set: { name: store.name } });
  }

  // Seed delivery areas
  const deliveryAreaData = [
    { areaName: "T Nagar", pincode: "600017", deliveryCharge: toPaise(30) },
    { areaName: "Velachery", pincode: "600042", deliveryCharge: toPaise(30) },
    { areaName: "Adyar", pincode: "600020", deliveryCharge: toPaise(40) },
    { areaName: "Anna Nagar", pincode: "600040", deliveryCharge: toPaise(50) },
    { areaName: "Mylapore", pincode: "600004", deliveryCharge: toPaise(40) },
    { areaName: "Triplicane", pincode: "600005", deliveryCharge: toPaise(40) },
    { areaName: "Nungambakkam", pincode: "600034", deliveryCharge: toPaise(40) },
    { areaName: "Alwarpet", pincode: "600018", deliveryCharge: toPaise(35) },
  ];
  for (const area of deliveryAreaData) {
    await db.insert(deliveryAreas).values(area).onDuplicateKeyUpdate({ set: { areaName: area.areaName } });
  }

  console.log("Database seeded successfully!");
}
