import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute("SHOW COLUMNS FROM users WHERE Field = 'role'");
console.log(rows);
await connection.end();
