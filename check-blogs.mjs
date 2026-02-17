import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, title, slug, imageUrl, status FROM blog_articles ORDER BY id');
console.log(JSON.stringify(rows, null, 2));
await conn.end();
process.exit(0);
