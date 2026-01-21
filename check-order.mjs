import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://2RP8yJBR5QHXFPN.root:LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/taiwan_maami?ssl={"rejectUnauthorized":true}';

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Query order 134
  const [orders] = await connection.execute(
    "SELECT id, orderNumber, orderType, outletId, paymentStatus, paymentMethod, tableNumber, razorpayOrderId, razorpayPaymentId FROM orders WHERE orderNumber = '00134'"
  );
  console.log('Order #134:');
  console.log(JSON.stringify(orders, null, 2));
  
  // Query KOT for order 134
  const [kots] = await connection.execute(
    "SELECT id, orderId, outletId, orderNumber, isPrinted, createdAt, printedAt FROM kot_queue WHERE orderNumber = '00134'"
  );
  console.log('\nKOT records for Order #134:');
  console.log(JSON.stringify(kots, null, 2));
  
  // Search for Razorpay order
  const [razorpayOrders] = await connection.execute(
    "SELECT id, orderNumber, orderType, outletId, paymentStatus, paymentMethod, razorpayOrderId, razorpayPaymentId FROM orders WHERE razorpayOrderId LIKE '%S6U7Tsg1utOn35%'"
  );
  console.log('\nOrders with Razorpay ID S6U7Tsg1utOn35:');
  console.log(JSON.stringify(razorpayOrders, null, 2));
  
  // Get recent orders
  const [recentOrders] = await connection.execute(
    "SELECT id, orderNumber, orderType, outletId, paymentStatus, paymentMethod, tableNumber, razorpayOrderId FROM orders ORDER BY id DESC LIMIT 10"
  );
  console.log('\nRecent 10 orders:');
  console.log(JSON.stringify(recentOrders, null, 2));
  
  await connection.end();
}

main().catch(console.error);
