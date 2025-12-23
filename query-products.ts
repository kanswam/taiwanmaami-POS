import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { products } from './drizzle/schema';
import { like, or } from 'drizzle-orm';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  const results = await db.select({
    id: products.id,
    name: products.name,
    slug: products.slug,
    isActive: products.isActive,
    isInStock: products.isInStock,
    availableInstore: products.availableInstore,
    availableDelivery: products.availableDelivery
  }).from(products).where(
    or(
      like(products.name, '%Caramel%'),
      like(products.name, '%Rose%'),
      like(products.slug, '%caramel%'),
      like(products.slug, '%rose%')
    )
  );

  console.log(JSON.stringify(results, null, 2));
  await connection.end();
}
main().catch(console.error);
