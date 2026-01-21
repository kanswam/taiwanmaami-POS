import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2RP8yJBR5QHXFPN.root:LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/taiwan_maami?ssl={"rejectUnauthorized":true}';

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check KOT records for orders 133 and 134
  const [kots] = await connection.execute(`
    SELECT k.id, k.orderId, k.orderNumber, k.outletId as kot_outletId, k.isPrinted, k.createdAt,
           o.outletId as order_outletId, o.orderType, o.paymentStatus, o.paymentMethod
    FROM kot_queue k 
    JOIN orders o ON k.orderNumber = o.orderNumber 
    WHERE k.orderNumber IN ('00133', '00134') 
    ORDER BY k.id
  `);
  
  console.log('KOT Records for Orders 133 and 134:');
  console.log(JSON.stringify(kots, null, 2));
  
  // Check store locations
  const [stores] = await connection.execute('SELECT id, name FROM store_locations');
  console.log('\nStore Locations:');
  console.log(JSON.stringify(stores, null, 2));
  
  await connection.end();
}

main().catch(console.error);
