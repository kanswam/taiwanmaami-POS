import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [result] = await connection.execute(
  "SELECT id, orderNumber, orderType, subtotal, stateGst, centralGst, deliveryCharge, totalAmount, paymentStatus, paymentMethod FROM orders WHERE orderNumber = '00206'"
);
console.log('Order 00206:', JSON.stringify(result, null, 2));

await connection.end();
