import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [dbCols] = await conn.query('SHOW COLUMNS FROM orders');
  const dbColNames = dbCols.map(r => r.Field);
  
  const schemaColNames = [
    'id', 'orderNumber', 'userId', 'customerName', 'customerPhone',
    'orderType', 'tableNumber', 'orderStatus', 'paymentStatus',
    'subtotal', 'stateGst', 'centralGst', 'deliveryCharge', 'discountAmount',
    'loyaltyPointsUsed', 'totalAmount', 'deliveryAddressId', 'deliveryAddress',
    'scheduledTime', 'razorpayOrderId', 'razorpayPaymentId', 'porterOrderId',
    'staffId', 'outletId', 'posSessionId', 'specialInstructions', 'discountCode',
    'manualDiscountAmount', 'manualDiscountType', 'manualDiscountPercent',
    'manualDiscountReason', 'manualDiscountApprovedBy', 'staffNotes',
    'paymentMethod', 'paymentProofUrl', 'refundAmount', 'refundMethod',
    'refundReason', 'refundProcessedAt', 'refundProcessedBy',
    'idempotencyKey', 'isTestData', 'reconciliationNote', 'reconciledAt', 'reconciledBy',
    'createdAt', 'updatedAt', 'completedAt'
  ];
  
  const inSchemaNotDB = schemaColNames.filter(c => dbColNames.indexOf(c) === -1);
  const inDBNotSchema = dbColNames.filter(c => schemaColNames.indexOf(c) === -1);
  
  console.log('Schema columns:', schemaColNames.length);
  console.log('DB columns:', dbColNames.length);
  console.log('In schema but NOT in DB:', inSchemaNotDB);
  console.log('In DB but NOT in schema:', inDBNotSchema);
  
  // Check the error from screenshot - the INSERT has these columns
  // Let's count the columns in the error message
  const errorCols = [
    'id', 'orderNumber', 'userId', 'customerName', 'customerPhone',
    'orderType', 'tableNumber', 'orderStatus', 'paymentStatus',
    'subtotal', 'stateGst', 'centralGst', 'deliveryCharge', 'discountAmount',
    'loyaltyPointsUsed', 'totalAmount', 'deliveryAddressId', 'deliveryAddress',
    'scheduledTime', 'razorpayOrderId', 'razorpayPaymentId', 'porterOrderId',
    'staffId', 'outletId', 'posSessionId', 'specialInstructions', 'discountCode',
    'manualDiscountAmount', 'manualDiscountType', 'manualDiscountPercent',
    'manualDiscountReason', 'manualDiscountApprovedBy', 'staffNotes',
    'paymentMethod', 'paymentProofUrl', 'refundAmount', 'refundMethod',
    'refundReason', 'refundProcessedAt', 'refundProcessedBy',
    'idempotencyKey', 'isTestData', 'reconciliationNote', 'reconciledAt', 'reconciledBy',
    'createdAt', 'updatedAt', 'completedAt'
  ];
  console.log('\nError INSERT columns:', errorCols.length);
  
  // Check the actual error - the params show: 00309, 21360111, hubertchiu, +919600175631, instore, +9 19600175631
  // That's: orderNumber, userId, customerName, customerPhone, orderType, then phone again?
  // Wait - the error shows: 00309,21360111,hubertchiu,+919600175631,instore,+919600175631,84000,2100,2100,0,0,0,88200,,2
  // Let's map: orderNumber=00309, userId=21360111, customerName=hubertchiu, customerPhone=+919600175631
  // orderType=instore, tableNumber? = +919600175631 (WRONG - phone number in table number field!)
  // Then: subtotal=84000, stateGst=2100, centralGst=2100, deliveryCharge=0, discountAmount=0, loyaltyPointsUsed=0
  // totalAmount=88200, deliveryAddressId=null, then .2
  
  // Wait - the params after instore show +919600175631 again
  // This means the 7th param (tableNumber) is getting the phone number!
  // But the customer is ordering instore and the table number should be a table number, not a phone
  
  // Actually looking more carefully at the error image:
  // params: 00309, 21360111, hubertchiu, +919600175631, instore, +919600175631, 84000, 2100, 2100, 0, 0, 0, 88200, , 2
  // Mapping to columns:
  // orderNumber=00309, userId=21360111, customerName=hubertchiu, customerPhone=+919600175631
  // orderType=instore, tableNumber=+919600175631 (BUG: phone number in table field!)
  // orderStatus=? (skipped, default), paymentStatus=? (skipped, default)
  // subtotal=84000, stateGst=2100, centralGst=2100
  
  // Actually the 'default' values in the INSERT mean those columns use their default
  // So the non-default params are the ones being passed
  // Let me count the 'default' and '?' placeholders
  
  console.log('\nDB column order:');
  dbCols.forEach((r, i) => console.log(`  ${i}: ${r.Field} (${r.Type}) ${r.Default !== null ? 'DEFAULT=' + r.Default : 'no default'}`));
  
  await conn.end();
}

main().catch(e => console.error(e));
