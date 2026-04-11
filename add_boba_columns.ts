import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  try {
    // Add bobaType column to order_items
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN bobaType varchar(20) DEFAULT NULL`);
    console.log("✅ Added bobaType column to order_items");
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.message?.includes('Duplicate column')) {
      console.log("ℹ️ bobaType column already exists");
    } else {
      console.error("❌ Error adding bobaType:", e.message);
    }
  }

  try {
    // Add poppingBobaFlavor column to order_items
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN poppingBobaFlavor varchar(100) DEFAULT NULL`);
    console.log("✅ Added poppingBobaFlavor column to order_items");
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.message?.includes('Duplicate column')) {
      console.log("ℹ️ poppingBobaFlavor column already exists");
    } else {
      console.error("❌ Error adding poppingBobaFlavor:", e.message);
    }
  }

  console.log("Done!");
  process.exit(0);
}

main();
