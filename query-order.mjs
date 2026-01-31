import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.DATABASE_PORT || '4000'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: { rejectUnauthorized: true }
});

const [rows] = await connection.execute('SELECT id, orderType, paymentStatus FROM orders WHERE id >= 225 ORDER BY id DESC LIMIT 10');
console.log(JSON.stringify(rows, null, 2));
await connection.end();
