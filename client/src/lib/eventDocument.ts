// Event Document Generator for Quotations and Invoices

interface EventOrderItem {
  id: number;
  itemName: string;
  itemType: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface EventOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string | null;
  eventType: string;
  eventDate: string;
  eventTime?: string | null;
  venue: string;
  guestCount: number;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
  advancePaid: boolean;
  balancePaid: boolean;
  status: string;
  adminNotes?: string | null;
  createdAt: string;
}

export function generateEventDocument(
  order: EventOrder,
  items: EventOrderItem[],
  type: 'quotation' | 'invoice'
): string {
  const isQuotation = type === 'quotation';
  const title = isQuotation ? 'QUOTATION' : 'TAX INVOICE';
  const docNumber = isQuotation 
    ? `QT-${order.orderNumber}` 
    : `INV-${order.orderNumber}`;
  
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const eventDate = new Date(order.eventDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const itemRows = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.itemName}</strong>
        ${item.description ? `<br><span style="color: #6b7280; font-size: 12px;">${item.description}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.itemType}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.unitPrice / 100).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.totalPrice / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - ${docNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #1f2937;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 3px solid #b91c1c;
      padding-bottom: 20px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #b91c1c;
    }
    .logo-subtitle {
      font-size: 12px;
      color: #6b7280;
    }
    .doc-type {
      text-align: right;
    }
    .doc-type h1 {
      margin: 0;
      font-size: 24px;
      color: #b91c1c;
    }
    .doc-type p {
      margin: 5px 0 0;
      color: #6b7280;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .info-box h3 {
      margin: 0 0 10px;
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .info-box p {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #fef2f2;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #b91c1c;
      border-bottom: 2px solid #b91c1c;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #b91c1c;
      color: #b91c1c;
    }
    .terms {
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .terms h3 {
      margin: 0 0 15px;
      color: #b91c1c;
    }
    .terms ul {
      margin: 0;
      padding-left: 20px;
    }
    .terms li {
      margin: 8px 0;
      color: #4b5563;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #b91c1c;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover {
      background: #991b1b;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  
  <div class="header">
    <div>
      <div class="logo">Taiwan Maami</div>
      <div class="logo-subtitle">Authentic Taiwanese Bubble Tea</div>
      <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
        T Nagar, Chennai<br>
        Phone: +91 98765 43210<br>
        Email: events@taiwanmaami.com<br>
        GSTIN: 33XXXXX1234X1ZX
      </p>
    </div>
    <div class="doc-type">
      <h1>${title}</h1>
      <p><strong>${docNumber}</strong></p>
      <p>Date: ${today}</p>
      ${!isQuotation ? `<p>Valid Until: ${eventDate}</p>` : ''}
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Bill To</h3>
      <p><strong>${order.customerName}</strong></p>
      ${order.companyName ? `<p>${order.companyName}</p>` : ''}
      <p>Email: ${order.customerEmail}</p>
      <p>Phone: ${order.customerPhone}</p>
    </div>
    <div class="info-box">
      <h3>Event Details</h3>
      <p><strong>Type:</strong> ${order.eventType}</p>
      <p><strong>Date:</strong> ${eventDate} ${order.eventTime || ''}</p>
      <p><strong>Venue:</strong> ${order.venue}</p>
      <p><strong>Guests:</strong> ${order.guestCount}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Description</th>
        <th style="text-align: center;">Type</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${(order.subtotal / 100).toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>GST (18%):</span>
      <span>₹${(order.gstAmount / 100).toFixed(2)}</span>
    </div>
    ${order.discountAmount > 0 ? `
    <div class="totals-row" style="color: #059669;">
      <span>Discount:</span>
      <span>-₹${(order.discountAmount / 100).toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="totals-row total">
      <span>Total:</span>
      <span>₹${(order.totalAmount / 100).toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Advance (${order.advancePercentage}%):</span>
      <span>₹${(order.advanceAmount / 100).toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Balance Due:</span>
      <span>₹${(order.balanceAmount / 100).toFixed(2)}</span>
    </div>
  </div>

  <div class="terms">
    <h3>Terms & Conditions</h3>
    <ul>
      <li><strong>Advance Payment:</strong> ${order.advancePercentage}% advance payment is required upon confirmation of the order.</li>
      <li><strong>Balance Payment:</strong> Remaining balance is due upon delivery/completion of the event.</li>
      <li><strong>Cancellation:</strong> Orders cancelled within 48 hours of the event date are non-refundable.</li>
      <li><strong>Modifications:</strong> Any changes to the order must be communicated at least 72 hours before the event.</li>
      <li><strong>Delivery:</strong> Delivery charges may apply based on venue location and order size.</li>
      ${isQuotation ? `<li><strong>Validity:</strong> This quotation is valid for 7 days from the date of issue.</li>` : ''}
    </ul>
  </div>

  <div class="footer">
    <p>Thank you for choosing Taiwan Maami for your event!</p>
    <p>For any queries, please contact us at events@taiwanmaami.com or +91 98765 43210</p>
  </div>
</body>
</html>
  `;
}
