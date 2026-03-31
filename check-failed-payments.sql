-- Cross-reference failed Razorpay payments against orders database
-- Check by phone number, amount, and date proximity

-- First, let's see all orders with razorpay payment IDs matching the failed ones
SELECT 
  o.orderNumber,
  o.customerName,
  o.customerPhone,
  o.totalAmount,
  o.paymentStatus,
  o.paymentMethod,
  o.razorpayPaymentId,
  o.razorpayOrderId,
  o.orderStatus,
  o.createdAt
FROM orders o
WHERE o.razorpayPaymentId IN (
  'pay_SXQhC5xlciUkr5',
  'pay_SWfncQn73J3U1L',
  'pay_SWeRwsID7ro68M',
  'pay_STtonHN2t48Irq',
  'pay_STp00F6AXG6Vco',
  'pay_SSHhNkO6dUFhsa',
  'pay_SRVCMkCdTKGUNi',
  'pay_SRTlyKmxHUZzsV',
  'pay_SPXEfjoqIROrbv',
  'pay_SM0uEKP6JAhYg0'
);
