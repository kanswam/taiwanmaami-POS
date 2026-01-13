import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { orders, orderItems } from '../drizzle/schema';
import { desc, eq, ne, like } from 'drizzle-orm';

async function main() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });
  
  const db = drizzle(connection);
  
  // Get all orders
  const allOrders = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    orderStatus: orders.orderStatus,
    paymentStatus: orders.paymentStatus,
    totalAmount: orders.totalAmount,
    stateGst: orders.stateGst,
    centralGst: orders.centralGst,
    customerName: orders.customerName,
    customerPhone: orders.customerPhone,
    createdAt: orders.createdAt,
  }).from(orders).orderBy(desc(orders.createdAt));
  
  console.log('All orders:');
  allOrders.forEach(order => {
    console.log(`ID: ${order.id}, Order#: ${order.orderNumber}, Status: ${order.orderStatus}, Payment: ${order.paymentStatus}, Total: ${order.totalAmount}, Customer: ${order.customerName}, Phone: ${order.customerPhone}, Created: ${order.createdAt}`);
  });
  
  // Find the legitimate order
  const legitOrder = allOrders.find(o => o.orderNumber.includes('TMMJYG8SV9QUF2'));
  if (legitOrder) {
    console.log('\n\nLegitimate order found:');
    console.log(JSON.stringify(legitOrder, null, 2));
  } else {
    console.log('\n\nLegitimate order NOT found!');
  }
  
  await connection.end();
}

main().catch(console.error);
