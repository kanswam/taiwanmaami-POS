import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eventOrderItems, eventOrders } from "../drizzle/schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:/home/ubuntu/.manus/db/taiwan-maami/local.db",
});

const db = drizzle(client);

async function check() {
  const items = await db.select().from(eventOrderItems);
  console.log('Items:', JSON.stringify(items, null, 2));
  
  const orders = await db.select().from(eventOrders);
  console.log('Orders:', JSON.stringify(orders, null, 2));
}

check().catch(console.error);
