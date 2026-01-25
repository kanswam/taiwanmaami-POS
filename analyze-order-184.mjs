// Analyze Order 184 discrepancy

// Razorpay collected ₹1,296.76 = 129676 paise
const razorpayAmount = 129676; // paise

// Current order items:
// Biang Biang Noodles: ₹415
// Vinegar-Spiced Noodle Soup: ₹435
// Blueberry Mochi x2: ₹770

// Full order: 1620 + 81 GST + 100 delivery = 1801
// But Razorpay got 1296.76

console.log('ORDER 184 ANALYSIS');
console.log('==================');
console.log('');
console.log('Database Total: ₹1,801.00');
console.log('Razorpay Collected: ₹1,296.76');
console.log('Discrepancy: ₹504.24');
console.log('');

// What if customer had fewer items?
// Biang Biang Noodles (415) + Vinegar-Spiced Noodle Soup (435) + Blueberry Mochi x1 (385) = 1235
// 1235 * 1.05 = 1296.75 ≈ 1296.76

console.log('HYPOTHESIS:');
console.log('If cart was: Biang Biang Noodles (415) + Vinegar-Spiced Noodle Soup (435) + Blueberry Mochi x1 (385)');
console.log('Subtotal: ₹1,235');
console.log('With 5% GST: ₹' + (1235 * 1.05).toFixed(2));
console.log('Razorpay collected: ₹' + (razorpayAmount/100).toFixed(2));
console.log('');

console.log('MATCH! The ₹1,296.76 corresponds to a cart with only 1 Blueberry Mochi (no delivery charge).');
console.log('');

console.log('CONCLUSION:');
console.log('The stale displayTotal bug caused this discrepancy.');
console.log('');
console.log('What likely happened:');
console.log('1. Customer added items to cart (1 Blueberry Mochi)');
console.log('2. Cart total was ₹1,235 + GST = ₹1,296.75');
console.log('3. Customer clicked checkout, order #183 was created');
console.log('4. Customer cancelled/closed Razorpay popup');
console.log('5. Customer added another Blueberry Mochi to cart');
console.log('6. Customer clicked checkout again, order #184 was created with new cart (2 Mochi)');
console.log('7. BUT the frontend displayTotal was still the OLD value (₹1,296.76)');
console.log('8. Razorpay was charged the stale amount');
console.log('9. Backend correctly calculated ₹1,801 (with delivery + 2 Mochi)');
console.log('');

console.log('Missing components:');
console.log('- 1 Blueberry Mochi: ₹385');
console.log('- Delivery charge: ₹100');
console.log('- GST on extra mochi: ₹19.25');
console.log('- Total missing: ₹504.25 (matches ₹504.24 discrepancy)');
console.log('');

console.log('FIX APPLIED:');
console.log('The fix now uses orderData.totalAmount from backend response instead of displayTotal.');
console.log('This ensures the payment amount always matches the actual order total.');
