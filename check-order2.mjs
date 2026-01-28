import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [result] = await connection.execute(
  "SELECT * FROM orders WHERE orderNumber = '00206'"
);
console.log('Order 00206 full details:', JSON.stringify(result[0], null, 2));

await connection.end();
