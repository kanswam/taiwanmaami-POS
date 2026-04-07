// Shared tax invoice generator for customer-facing pages
export function generateOrderInvoice(order: any): string {
  const formatPrice = (amount: number) => `\u20B9${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const items = order.items || [];
  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - Order ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; }
    .invoice-header { text-align: center; margin-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #c75c2e; margin-bottom: 5px; }
    .company-info { font-size: 12px; color: #666; }
    .invoice-title { font-size: 18px; font-weight: bold; color: #666; margin: 15px 0; letter-spacing: 2px; }
    .divider { border-bottom: 2px solid #c75c2e; margin: 10px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .detail-box { background: #f9f9f9; padding: 15px; border-radius: 5px; }
    .detail-box h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .detail-box p { font-size: 13px; margin: 5px 0; }
    .detail-box strong { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #c75c2e; color: white; padding: 12px; text-align: left; font-size: 13px; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.discount { color: #c75c2e; }
    .total-row.grand { font-size: 16px; font-weight: bold; border-top: 2px solid #c75c2e; padding-top: 12px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    .payment-status { display: inline-block; background: #4caf50; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 10px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-name">Taiwan Maami</div>
    <div class="company-info">Thamarai Foods and Trading Private Limited</div>
    <div class="company-info">GSTIN: 33AAKCT4782H1Z1</div>
    <div class="company-info">Phone: +91 9150570557 | Email: hello@taiwanmaami.com</div>
    <div class="invoice-title">TAX INVOICE</div>
    <div class="divider"></div>
  </div>

  <div class="details-grid">
    <div class="detail-box">
      <h3>Invoice Details</h3>
      <p><strong>Invoice No:</strong> INV-${order.orderNumber}</p>
      <p><strong>Order No:</strong> #${order.orderNumber}</p>
      <p><strong>Date:</strong> ${formattedDate}, ${formattedTime}</p>
      <p><strong>Order Type:</strong> ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}</p>
    </div>
    <div class="detail-box">
      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${order.customerName || 'Guest'}</p>
      <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
      ${order.deliveryAddress ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => `
        <tr>
          <td>${item.productName}${item.size ? ` (${item.size})` : ''}${item.addons?.length ? '<br><small style="color:#666">' + item.addons.map((a: any) => '+ ' + a.addonName).join(', ') + '</small>' : ''}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatPrice(item.unitPrice)}</td>
          <td class="text-right">${formatPrice(item.unitPrice * item.quantity + (item.addons?.reduce((sum: number, a: any) => sum + (a.addonPrice || 0), 0) || 0))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
    ${order.discountAmount && order.discountAmount > 0 ? `<div class="total-row discount"><span>Discount${order.discountCode ? ` (${order.discountCode})` : ''}</span><span>-${formatPrice(order.discountAmount)}</span></div>` : ''}
    ${order.stateGst ? `<div class="total-row"><span>SGST (2.5%)</span><span>${formatPrice(order.stateGst)}</span></div>` : ''}
    ${order.centralGst ? `<div class="total-row"><span>CGST (2.5%)</span><span>${formatPrice(order.centralGst)}</span></div>` : ''}
    ${order.deliveryCharge && order.deliveryCharge > 0 ? `<div class="total-row"><span>Delivery Charge</span><span>${formatPrice(order.deliveryCharge)}</span></div>` : ''}
    <div class="total-row grand"><span>Total Amount</span><span>${formatPrice(order.totalAmount)}</span></div>
  </div>

  ${order.paymentStatus === 'completed' ? '<div style="text-align:center"><span class="payment-status">PAID</span></div>' : ''}

  <div class="footer">
    <p>Thank you for your order!</p>
    <p>Taiwan Maami - Crafted Daily. Enjoy Thoughtfully.</p>
    <p>For queries: +91 9150570557 | hello@taiwanmaami.com</p>
  </div>
</body>
</html>`;
}
