import { getDb } from './server/db.ts';
import { products, subcategories } from './drizzle/schema.ts';
import { eq, and, like } from 'drizzle-orm';

async function checkMochiPrices() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const mochiProducts = await db.select({
    id: products.id,
    name: products.name,
    instorePrice: products.instorePrice,
    deliveryPrice: products.deliveryPrice,
    subcategoryId: products.subcategoryId,
  })
  .from(products)
  .where(like(products.name, '%Mochi%'));

  console.log('Mochi Products in Database:');
  console.log('============================');
  mochiProducts.forEach(p => {
    const instorePriceRupees = p.instorePrice ? (p.instorePrice / 100).toFixed(0) : 'N/A';
    const deliveryPriceRupees = p.deliveryPrice ? (p.deliveryPrice / 100).toFixed(0) : 'N/A';
    const deliveryWithGst = p.deliveryPrice ? Math.round(p.deliveryPrice * 1.05 / 100) : 'N/A';
    console.log(`${p.name}: instore=₹${instorePriceRupees}, delivery=₹${deliveryPriceRupees} (with GST: ₹${deliveryWithGst})`);
  });
  
  process.exit(0);
}

checkMochiPrices();
