import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await connection.execute(`
  SELECT id, name, phone, role, stampCount, lifetimeStamps 
  FROM users 
  WHERE role IN ('staff', 'admin') 
  ORDER BY name
`);

console.log('Staff/Admin accounts:');
console.table(result[0]);

await connection.end();
