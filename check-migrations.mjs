import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute('SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 10');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}
main().catch(console.error);
