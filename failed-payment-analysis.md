# Failed Razorpay Payments - March 2026 Reconciliation

## Summary
10 failed payments found in Razorpay dashboard. Cross-referenced against orders database by amount, date, phone, and email.

## Results

| # | Date | Amount | Customer | Razorpay Failed ID | DB Match | Status | Notes |
|---|------|--------|----------|-------------------|----------|--------|-------|
| 1 | Mar 30, 1:01pm | ₹1,432.20 | mohdhendra29@gmail.com / 7548801774 | pay_SXQhC5xlciUkr5 | **Order #00889** (₹1,432.20) | **PAID** ✅ | Re-attempted successfully. New payment ID: pay_SXQjfsCtq4Kl4P (card). Same amount, same date ~12:00pm (time zone offset). |
| 2 | Mar 28, 2:08pm | ₹388.50 | 7200986798 / NA | pay_SWfncQn73J3U1L | **Order #00852** (₹388.50) | **PAID** ✅ | Re-attempted successfully. New payment ID: pay_SWgHo25wVbtphR (UPI). Same amount, same time 14:07. |
| 3 | Mar 28, 12:49pm | ₹1,281.00 | hemadharshini1995@gmail.com / 9790739055 | pay_SWeRwsID7ro68M | **NO MATCH** ❌ | **LOST** | No order with ₹1,281.00 on Mar 28. Customer likely abandoned after payment failure. |
| 4 | Mar 21, 1:54pm | ₹824.50 | monishgovind48@gmail.com / 9840060104 | pay_STtonHN2t48Irq | **Order #00782** (₹824.50) | **CANCELLED** ❌ | Order exists but was cancelled with pending payment. Customer did NOT re-attempt. Delivery order. |
| 5 | Mar 21, 9:11am | ₹519.76 | dramionehead@gmail.com / 9962269835 | pay_STp00F6AXG6Vco | **Order #00767** (₹519.76) | **PAID** ✅ | Payment collected in-store via UPI (staff-collected). Same customer "Krish", same amount, same time. |
| 6 | Mar 17, 11:57am | ₹1,606.50 | mohdhendra29@gmail.com / 7548801774 | pay_SSHhNkO6dUFhsa | **Order #00727** (₹1,606.50) | **PAID** ✅ | Re-attempted successfully via Razorpay. New payment ID: pay_SSHitHXzbdlxwa. Pickup order. |
| 7 | Mar 15, 12:31pm | ₹1,265.26 | yadhanaa07@gmail.com / 9344558375 | pay_SRVCMkCdTKGUNi | **Order #00694** (₹1,265.26) | **PAID** ✅ | Re-attempted successfully via Razorpay. New payment ID: pay_SRVDYG2zr3NYKb. Pickup order. |
| 8 | Mar 15, 11:07am | ₹850.50 | svigneshewb@gmail.com / 9962956156 | pay_SRTlyKmxHUZzsV | **Order #00688** (₹850.50) | **PAID** ✅ | Payment collected in-store via card (staff-collected). Same customer "Sridharan Vignesh". |
| 9 | Mar 10, 1:12pm | ₹903.00 | pandiyan.muthu@gmail.com / 9884461641 | pay_SPXEfjoqIROrbv | **Order #00649** (₹903.00) | **PAID** ✅ | Payment collected in-store via UPI (staff-collected). Banking Failure reason. Same customer "Pandiyan Muthu". |
| 10 | Mar 1, 3:38pm | ₹388.50 | divinagarajan@gmail.com / 9884040352 | pay_SM0uEKP6JAhYg0 | **Order #00582** (₹388.50) | **PAID** ✅ | Payment collected in-store via UPI (staff-collected). Same amount, same time. |

## Bottom Line

- **8 out of 10** failed payments were successfully recovered (re-attempted online or collected in-store)
- **2 payments NOT recovered:**
  - **₹1,281.00** (hemadharshini, Mar 28) — No matching order at all. Customer abandoned.
  - **₹824.50** (monishgovind, Mar 21) — Order #00782 exists but cancelled, payment never collected. Delivery order.
- **Total potential revenue lost: ₹2,105.50**
