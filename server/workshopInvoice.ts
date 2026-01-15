// Workshop Invoice Generation Service
import PDFDocument from 'pdfkit';
import { storagePut } from './storage';

interface InvoiceData {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  workshopTitle: string;
  workshopDate: Date | string;
  workshopTime: string;
  workshopVenue: string;
  ticketCount: number;
  pricePerTicket: number;
  totalAmount: number; // in paise
  paymentId: string;
  isEarlyBird: boolean;
  invoiceDate: Date;
}

export async function generateWorkshopInvoice(data: InvoiceData): Promise<{ url: string; key: string }> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice - ${data.bookingNumber}`,
          Author: 'Taiwan Maami',
        }
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const key = `invoices/workshop-${data.bookingNumber}-${Date.now()}.pdf`;
          const result = await storagePut(key, pdfBuffer, 'application/pdf');
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      
      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('TAIWAN MAAMI', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Authentic Taiwanese Cuisine & Bubble Tea', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(8).text('29 Burkit Road, T. Nagar, Chennai - 600017', { align: 'center' });
      doc.text('Phone: +91 89259 14303 | Email: hello@taiwanmaami.com', { align: 'center' });
      doc.text('GSTIN: 33AAHCT4567A1ZV', { align: 'center' });
      
      doc.moveDown(1);
      
      // Invoice Title
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#B45309').text('WORKSHOP BOOKING INVOICE', { align: 'center' });
      doc.fillColor('#000000');
      
      doc.moveDown(1);
      
      // Invoice Details Box
      const invoiceDate = data.invoiceDate instanceof Date ? data.invoiceDate : new Date(data.invoiceDate);
      const workshopDate = data.workshopDate instanceof Date ? data.workshopDate : new Date(data.workshopDate);
      
      doc.fontSize(10).font('Helvetica-Bold').text('Invoice Details', { underline: true });
      doc.moveDown(0.3);
      doc.font('Helvetica');
      doc.text(`Invoice Number: ${data.bookingNumber}`);
      doc.text(`Invoice Date: ${invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
      doc.text(`Payment ID: ${data.paymentId}`);
      
      doc.moveDown(1);
      
      // Customer Details
      doc.font('Helvetica-Bold').text('Customer Details', { underline: true });
      doc.moveDown(0.3);
      doc.font('Helvetica');
      doc.text(`Name: ${data.customerName}`);
      doc.text(`Email: ${data.customerEmail}`);
      doc.text(`Phone: ${data.customerPhone}`);
      
      doc.moveDown(1);
      
      // Workshop Details
      doc.font('Helvetica-Bold').text('Workshop Details', { underline: true });
      doc.moveDown(0.3);
      doc.font('Helvetica');
      doc.text(`Workshop: ${data.workshopTitle}`);
      doc.text(`Date: ${workshopDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`);
      doc.text(`Time: ${data.workshopTime}`);
      doc.text(`Venue: ${data.workshopVenue}`);
      
      doc.moveDown(1.5);
      
      // Pricing Table
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [250, 80, 80, 85];
      
      // Table Header
      doc.font('Helvetica-Bold').fontSize(10);
      doc.rect(tableLeft, tableTop, 495, 25).fill('#f3f4f6');
      doc.fillColor('#000000');
      doc.text('Description', tableLeft + 10, tableTop + 8);
      doc.text('Qty', tableLeft + colWidths[0] + 10, tableTop + 8);
      doc.text('Rate', tableLeft + colWidths[0] + colWidths[1] + 10, tableTop + 8);
      doc.text('Amount', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 10, tableTop + 8);
      
      // Table Row
      const rowTop = tableTop + 25;
      doc.font('Helvetica').fontSize(10);
      doc.rect(tableLeft, rowTop, 495, 30).stroke('#e5e7eb');
      
      const pricePerTicketRupees = data.pricePerTicket / 100;
      const totalRupees = data.totalAmount / 100;
      const pricingLabel = data.isEarlyBird ? ' (Early Bird)' : '';
      
      doc.text(`${data.workshopTitle}${pricingLabel}`, tableLeft + 10, rowTop + 10, { width: colWidths[0] - 20 });
      doc.text(`${data.ticketCount}`, tableLeft + colWidths[0] + 10, rowTop + 10);
      doc.text(`₹${pricePerTicketRupees.toFixed(0)}`, tableLeft + colWidths[0] + colWidths[1] + 10, rowTop + 10);
      doc.text(`₹${totalRupees.toFixed(0)}`, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 10, rowTop + 10);
      
      // Total Row
      const totalRowTop = rowTop + 30;
      doc.rect(tableLeft + colWidths[0] + colWidths[1], totalRowTop, colWidths[2] + colWidths[3], 30).fill('#f3f4f6');
      doc.fillColor('#000000');
      doc.font('Helvetica-Bold');
      doc.text('Total:', tableLeft + colWidths[0] + colWidths[1] + 10, totalRowTop + 10);
      doc.fontSize(12).text(`₹${totalRupees.toFixed(0)}`, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 10, totalRowTop + 8);
      
      doc.moveDown(4);
      
      // Payment Status
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#16a34a');
      doc.text('✓ PAYMENT RECEIVED', { align: 'center' });
      doc.fillColor('#000000');
      
      doc.moveDown(2);
      
      // Terms and Conditions
      doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', 50);
      doc.font('Helvetica').fontSize(7);
      doc.text('1. This invoice serves as confirmation of your workshop booking.', 50);
      doc.text('2. Please arrive 15 minutes before the scheduled workshop time.', 50);
      doc.text('3. Cancellation policy: Full refund if cancelled 48 hours before the workshop.', 50);
      doc.text('4. No refunds for no-shows or cancellations within 48 hours of the workshop.', 50);
      doc.text('5. Workshop materials and refreshments are included in the ticket price.', 50);
      
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(9).font('Helvetica').text('Thank you for booking with Taiwan Maami!', { align: 'center' });
      doc.fontSize(8).text('For any queries, please contact us at hello@taiwanmaami.com', { align: 'center' });
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
