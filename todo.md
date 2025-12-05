# Taiwan Maami - Project TODO

## Database & Schema
- [x] Create categories table
- [x] Create subcategories table with base pricing
- [x] Create products table with dual pricing (instore/delivery)
- [x] Create addons table (boba flavors, vegan milk, food addons)
- [x] Create customization_options table (sugar, ice levels)
- [x] Create addresses table with Chennai area validation
- [x] Create orders table with order types and status
- [x] Create order_items table with customizations
- [x] Create order_item_addons junction table
- [x] Create payments table for split payments
- [x] Create discounts table for promo codes
- [x] Create loyalty_transactions table

## Authentication & Users
- [x] Extend users table with phone, role, loyalty_points
- [x] Implement role-based access (customer, staff, admin)
- [x] Create protected procedures for staff/admin

## Menu Management API
- [x] Categories CRUD procedures
- [x] Subcategories CRUD with base pricing
- [x] Products CRUD with dual pricing
- [x] Addons CRUD procedures
- [x] Bulk product photo upload
- [x] Mark items in/out of stock

## Customer Ordering Interface
- [x] Home page with hero and categories
- [x] Menu page with category filters
- [x] Portrait product cards
- [x] Product customization modal (size, boba, sugar, ice, addons)
- [x] Shopping cart with GST breakdown
- [x] Checkout flow with address validation
- [x] Scheduled pickup option
- [x] Order confirmation page

## POS Mode
- [x] Staff login and POS access
- [x] Touch-optimized product grid
- [x] Quick customization toggles
- [x] Split payment support (cash + card)
- [x] Discount application
- [ ] Loyalty points redemption
- [ ] Receipt generation

## Admin Dashboard
- [x] Dashboard overview with stats
- [x] Menu management (categories, products)
- [x] Dual pricing control
- [x] Bulk photo upload interface
- [x] Order management
- [x] Discount/promo code management
- [ ] Reports page

## Payment Integration
- [ ] Razorpay order creation
- [ ] Payment success/failure handling
- [ ] Webhook for payment status

## Order Tracking
- [x] Real-time order status updates
- [x] Order history for customers
- [ ] Porter delivery integration-ready

## Content Pages
- [x] About Us page
- [x] Locations page
- [x] Terms & Conditions
- [x] Privacy Policy
- [x] Refund & Cancellation Policy

## Pricing Engine
- [x] GST calculation (5% total: 2.5% State + 2.5% Central)
- [x] Size-based pricing
- [x] Boba option pricing
- [x] Addon pricing by size
- [x] Display price with GST included
- [x] Billing breakdown with GST split

