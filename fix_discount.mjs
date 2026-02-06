import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const connection = await createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

// Update BOBALOVE10 to work for all order types (remove delivery-only restriction)
// Keep firstTimeOnly = 1
await connection.execute(
  `UPDATE discounts SET orderTypeRestriction = 'all', description = 'Welcome offer - 10% off on first order for new registered customers' WHERE code = 'BOBALOVE10'`
);

// Verify the update
const [rows] = await connection.execute(`SELECT * FROM discounts WHERE code = 'BOBALOVE10'`);
console.log('Updated BOBALOVE10:');
console.log(JSON.stringify(rows[0], null, 2));

await connection.end();
