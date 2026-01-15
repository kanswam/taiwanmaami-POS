import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute('DESCRIBE workshop_bookings');
  console.log('Columns in workshop_bookings:');
  rows.forEach(row => console.log(`  - ${row.Field}: ${row.Type}`));
  await connection.end();
}

check().catch(console.error);
