import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check Walk-in Customer account
console.log('\n=== Walk-in Customer Account ===');
const [walkin] = await connection.execute("SELECT id, name, role, stampCount FROM users WHERE name = 'Walk-in Customer'");
console.table(walkin);

// Check all staff/admin stamps are reset
console.log('\n=== Staff/Admin Accounts (stamps should be 0) ===');
const [staff] = await connection.execute("SELECT id, name, role, stampCount, lifetimeStamps FROM users WHERE role IN ('staff', 'admin') ORDER BY name");
console.table(staff);

await connection.end();
