import Database from 'better-sqlite3';

const db = new Database('/home/ubuntu/.manus/db/taiwan-maami/local.db');

console.log('=== Total Orders ===');
const total = db.prepare('SELECT COUNT(*) as total FROM orders').get();
console.log('Total orders:', total.total);

console.log('\n=== Orders by Outlet ID ===');
const byOutlet = db.prepare('SELECT outletId, COUNT(*) as cnt FROM orders GROUP BY outletId').all();
console.log(byOutlet);

console.log('\n=== Completed Orders by Outlet ===');
const completed = db.prepare("SELECT outletId, COUNT(*) as cnt FROM orders WHERE orderStatus = 'completed' GROUP BY outletId").all();
console.log(completed);

console.log('\n=== Sample orders with outletId ===');
const sample = db.prepare('SELECT id, outletId, orderStatus, totalAmount FROM orders ORDER BY id DESC LIMIT 10').all();
console.log(sample);

db.close();
