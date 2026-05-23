import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dateStr = '2026-05-19';

// Query May 19 data
const { data: salesData } = await supabase
  .from('sales_facts')
  .select('outlet, item_name, item_total_rupees, order_total_rupees, order_subtotal_rupees, order_tax_rupees, order_discount_rupees, source, channel, order_type, source_order_id')
  .eq('order_date', dateStr);

console.log('May 19 rows:', salesData?.length);

if (!salesData || salesData.length === 0) {
  console.log('No data for May 19');
  process.exit(1);
}

// Deduplicate orders by source_order_id
const uniqueOrders = new Map();
for (const row of salesData) {
  const key = row.source + '|' + row.source_order_id;
  if (!uniqueOrders.has(key)) {
    uniqueOrders.set(key, {
      outlet: row.outlet,
      order_type: row.order_type,
      total: parseFloat(row.order_total_rupees) || 0,
      subtotal: parseFloat(row.order_subtotal_rupees) || 0,
      tax: parseFloat(row.order_tax_rupees) || 0,
      discount: parseFloat(row.order_discount_rupees) || 0,
    });
  }
}

// Breakdown by outlet and type
const breakdown = {};
for (const [_, order] of uniqueOrders) {
  const key = order.outlet + '|' + order.order_type;
  if (!breakdown[key]) breakdown[key] = { count: 0, total: 0 };
  breakdown[key].count++;
  breakdown[key].total += order.subtotal;
}

// Top items
const itemCounts = {};
for (const row of salesData) {
  if (row.item_name && row.item_name.indexOf('_order_total_') === -1) {
    itemCounts[row.item_name] = (itemCounts[row.item_name] || 0) + 1;
  }
}
const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

// Totals
let menuSales = 0, totalTax = 0, totalDiscount = 0, totalOrders = uniqueOrders.size;
for (const [_, order] of uniqueOrders) {
  menuSales += order.subtotal;
  totalTax += order.tax;
  totalDiscount += order.discount;
}

// Compose message
let msg = `🏪 *Taiwan Maami Daily Digest* _${dateStr}_\n`;
msg += `💰 *REVENUE*\n`;
for (const [key, val] of Object.entries(breakdown).sort()) {
  const [outlet, type] = key.split('|');
  const label = (outlet === 'palladium' ? 'Palladium' : 'T.Nagar') + ' ' + (type === 'delivery' ? 'Delivery' : 'In-store');
  msg += `${label}: ₹${Math.round(val.total).toLocaleString('en-IN')} (${val.count} orders)\n`;
}
msg += `Menu Sales: ₹${Math.round(menuSales).toLocaleString('en-IN')}\n`;
if (totalDiscount > 0) msg += `Aggregator Discounts: -₹${Math.round(totalDiscount).toLocaleString('en-IN')}\n`;
msg += `GST Collected: ₹${Math.round(totalTax).toLocaleString('en-IN')}\n`;
const netCollected = menuSales - totalDiscount + totalTax;
msg += `*Net Collected: ₹${Math.round(netCollected).toLocaleString('en-IN')} | Orders: ${totalOrders}*\n`;
msg += `🏆 *TOP 3 ITEMS*\n`;
for (const [name, count] of topItems) {
  msg += `• ${name}: ${count} orders\n`;
}

console.log('\nDigest content:');
console.log(msg);

// Send via WhatsApp
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_WHATSAPP_FROM;
const to = process.env.TWILIO_WHATSAPP_TO;

if (twilioSid && twilioAuth && from && to) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const body = new URLSearchParams({ From: from, To: to, Body: msg });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + Buffer.from(twilioSid + ':' + twilioAuth).toString('base64') },
    body,
  });
  const result = await resp.json();
  console.log('\nWhatsApp sent:', resp.status === 201 ? '✅' : '❌', result.sid || result.message);
} else {
  console.log('\nTwilio credentials not found - cannot send WhatsApp');
}
