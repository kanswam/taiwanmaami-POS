import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

// Parse DATABASE_URL from .env without modifying it
const envContent = readFileSync("/home/ubuntu/taiwan-maami/.env", "utf8");
const match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) { console.log("No DATABASE_URL found"); process.exit(1); }
const DATABASE_URL = match[1].trim();

const conn = await createConnection(DATABASE_URL);

const [total] = await conn.execute("SELECT COUNT(*) as cnt FROM petpooja_webhook_orders");
console.log("Total webhook orders:", total[0].cnt);

if (total[0].cnt > 0) {
  const [apr30] = await conn.execute("SELECT COUNT(*) as cnt FROM petpooja_webhook_orders WHERE receivedAt >= '2026-04-30' AND receivedAt < '2026-05-01'");
  console.log("Apr 30 webhook orders:", apr30[0].cnt);

  const [latest] = await conn.execute("SELECT petpoojaOrderId, orderType, orderFrom, outletName, restId, totalAmount, receivedAt, status FROM petpooja_webhook_orders ORDER BY receivedAt DESC LIMIT 5");
  console.log("\nLatest webhook orders:");
  for (const r of latest) {
    console.log(`  ${r.receivedAt} | outlet=${r.outletName || r.restId} | type=${r.orderType} | from=${r.orderFrom} | Rs${r.totalAmount/100} | ${r.status}`);
  }

  // Check distinct outlets
  const [outlets] = await conn.execute("SELECT DISTINCT restId, outletName, orderFrom, COUNT(*) as cnt FROM petpooja_webhook_orders GROUP BY restId, outletName, orderFrom");
  console.log("\nOutlet breakdown:");
  for (const r of outlets) {
    console.log(`  restId=${r.restId} | name=${r.outletName} | from=${r.orderFrom} | count=${r.cnt}`);
  }
} else {
  console.log("\n⚠️ No webhook orders found - Petpooja webhook NOT yet activated from their end");
}

await conn.end();
