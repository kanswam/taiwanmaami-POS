import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2RP8yJBR5QHXFPN.root:LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/taiwan_maami?ssl={"rejectUnauthorized":true}';

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const [stores] = await connection.execute('SELECT id, name, address FROM store_locations');
  console.log('Store Locations:');
  console.log(JSON.stringify(stores, null, 2));
  
  await connection.end();
}

main().catch(console.error);
