import { getDb } from './server/db.ts';
import { products, subcategories, categories } from './drizzle/schema.ts';
import { eq, and, asc, like } from 'drizzle-orm';

async function debugMenuData() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get full menu data like the API does
  const prods = await db.select().from(products)
    .where(and(
      eq(products.isActive, true),
      eq(products.isInStock, true),
      eq(products.availableDelivery, true)
    ))
    .orderBy(asc(products.displayOrder));

  console.log('Products returned by getFullMenu (delivery mode):');
  console.log('=================================================');
  
  const mochiProducts = prods.filter(p => p.name.includes('Mochi'));
  mochiProducts.forEach(p => {
    console.log(`${p.name}:`);
    console.log(`  instorePrice: ${p.instorePrice} (₹${p.instorePrice ? p.instorePrice/100 : 'null'})`);
    console.log(`  deliveryPrice: ${p.deliveryPrice} (₹${p.deliveryPrice ? p.deliveryPrice/100 : 'null'})`);
    console.log(`  Expected display with GST: ₹${p.deliveryPrice ? Math.round(p.deliveryPrice * 1.05 / 100) : 'null'}`);
    console.log('');
  });
  
  process.exit(0);
}

debugMenuData();
