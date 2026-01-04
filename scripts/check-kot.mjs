import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const connection = await mysql.createConnection(url);

const [rows] = await connection.execute('SELECT kotData FROM kot_queue ORDER BY id DESC LIMIT 1');
if (rows.length > 0) {
  const data = typeof rows[0].kotData === 'string' ? JSON.parse(rows[0].kotData) : rows[0].kotData;
  console.log('=== Full KOT Data ===');
  console.log(JSON.stringify(data, null, 2));
}

await connection.end();
