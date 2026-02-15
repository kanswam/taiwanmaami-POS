// Razorpay payment integration service
import { ENV } from './_core/env';
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

interface CreateOrderParams {
  amount: number; // Amount in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

// Create a Razorpay order
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  const { amount, currency = 'INR', receipt, notes = {} } = params;
  
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay order creation failed: ${error}`);
  }
  
  return response.json();
}

// Verify payment signature
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

// Get Razorpay key ID for frontend
export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID;
}

// Verify webhook signature from Razorpay
export function verifyWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

// Fetch payments for a Razorpay order (to find captured payments when callback was missed)
export async function fetchOrderPayments(razorpayOrderId: string): Promise<any[]> {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  
  const response = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}/payments`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch order payments: ${error}`);
  }
  
  const data = await response.json();
  return data.items || [];
}

// Fetch payment details
export async function fetchPaymentDetails(paymentId: string): Promise<any> {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch payment: ${error}`);
  }
  
  return response.json();
}
