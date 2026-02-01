import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(
  "SELECT id, openId, name, phone, email, role, stampCount, lifetimeStamps, lastStampDate, createdAt FROM users WHERE name LIKE '%Rinold%' OR name LIKE '%rinold%'"
);

console.log('Rinold User Details:');
console.log(JSON.stringify(rows, null, 2));

// Also check orders placed by this user
if (rows.length > 0) {
  const userId = rows[0].id;
  const [orders] = await connection.execute(
    "SELECT id, orderNumber, orderType, status, totalAmount, createdAt FROM orders WHERE userId = ? ORDER BY createdAt DESC LIMIT 10",
    [userId]
  );
  console.log('\nRecent Orders by Rinold:');
  console.log(JSON.stringify(orders, null, 2));
}

await connection.end();
