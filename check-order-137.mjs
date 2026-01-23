import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: { rejectUnauthorized: true }
});

try {
  // Get recent orders
  const [orders] = await connection.execute(
    'SELECT id, orderNumber, outletId, orderType, createdAt FROM orders ORDER BY id DESC LIMIT 10'
  );
  
  console.log('Recent Orders:');
  console.log(JSON.stringify(orders, null, 2));
  
  // Get KOT queue for recent orders
  const [kots] = await connection.execute(
    'SELECT * FROM kot_queue ORDER BY id DESC LIMIT 10'
  );
  
  console.log('\nRecent KOTs:');
  console.log(JSON.stringify(kots, null, 2));
  
  // Check store locations
  const [stores] = await connection.execute('SELECT * FROM store_locations');
  console.log('\nStore Locations:');
  console.log(JSON.stringify(stores, null, 2));
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await connection.end();
}
