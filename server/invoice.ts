import { formatPrice, GST_RATE } from "@shared/types";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceData {
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  stateGst: number;
  centralGst: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}

// Generate HTML invoice for PDF conversion
export function generateInvoiceHtml(data: InvoiceData): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.totalPrice)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${data.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #8B4513; }
    .invoice-title { font-size: 28px; color: #666; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; margin-bottom: 8px; color: #8B4513; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    .totals { margin-top: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div>
      <div class="logo">Taiwan Maami</div>
      <div style="color: #666; font-size: 14px;">Authentic Taiwanese Bubble Tea</div>
      <div style="color: #888; font-size: 11px; margin-top: 4px;">A unit of Thamarai Foods and Trading Private Limited</div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">INVOICE</div>
      <div style="margin-top: 10px;">
        <strong>Order #:</strong> ${data.orderNumber}<br>
        <strong>Date:</strong> ${data.orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}<br>
        <strong>Time:</strong> ${data.orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Customer Details</div>
    <div><strong>Name:</strong> ${data.customerName}</div>
    <div><strong>Phone:</strong> ${data.customerPhone}</div>
    ${data.customerEmail ? `<div><strong>Email:</strong> ${data.customerEmail}</div>` : ''}
    <div><strong>Order Type:</strong> ${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</div>
    ${data.deliveryAddress ? `<div><strong>Delivery Address:</strong> ${data.deliveryAddress}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Order Items</div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  </div>

  <div class="totals" style="max-width: 300px; margin-left: auto;">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${formatPrice(data.subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>State GST (${GST_RATE * 100}%):</span>
      <span>${formatPrice(data.stateGst)}</span>
    </div>
    <div class="totals-row">
      <span>Central GST (${GST_RATE * 100}%):</span>
      <span>${formatPrice(data.centralGst)}</span>
    </div>
    ${data.deliveryCharge > 0 ? `
    <div class="totals-row">
      <span>Delivery Charge:</span>
      <span>${formatPrice(data.deliveryCharge)}</span>
    </div>
    ` : ''}
    ${data.discount > 0 ? `
    <div class="totals-row" style="color: green;">
      <span>Discount:</span>
      <span>-${formatPrice(data.discount)}</span>
    </div>
    ` : ''}
    <div class="totals-row total">
      <span>Total:</span>
      <span>${formatPrice(data.totalAmount)}</span>
    </div>
  </div>

  <div class="section" style="margin-top: 30px;">
    <div class="section-title">Payment Information</div>
    <div><strong>Payment Method:</strong> ${data.paymentMethod}</div>
    <div><strong>Payment Status:</strong> ${data.paymentStatus}</div>
  </div>

  <div class="footer">
    <p>Thank you for choosing Taiwan Maami!</p>
    <p style="margin-top: 15px; font-size: 11px; color: #555; line-height: 1.6;">
      <strong>Thamarai Foods and Trading Private Limited</strong><br>
      34/8 Singarar Street, Triplicane, Chennai - 600005<br>
      GSTIN: 33AAKCT4782H1Z1 | CIN: U47219TN2023PTC164226
    </p>
    <p>For queries, contact us at: info@taiwanmaami.com</p>
  </div>
</body>
</html>
  `;
}

export type { InvoiceData, InvoiceItem };
