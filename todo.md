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


## Phase 2 - UI/UX Improvements (Dec 5, 2025)

### Navigation & Layout
- [x] Subcategory-first navigation for Bubble Tea (Black, Green, Oolong, Matcha, Taro)
- [x] Subcategory-first navigation for Food (Onigiri, Noodles, Cong You Bing, Omelette, etc.)
- [x] Separate Mochis into Fruit and Signature subcategories display
- [x] Reorganize POS layout by categories/subcategories

### Boba Customization Enhancement
- [x] Boba size selection (Small or Big boba)
- [x] Popping boba flavor selection as alternative to tapioca
- [x] Extra boba/popping boba add-on with size-appropriate pricing

### Special Instructions
- [x] Special instructions field on website ordering
- [x] Special instructions field on POS

### Menu Items
- [x] Add Hot Beverages to in-store menu

### Branding & Images
- [x] Add product photos to menu cards
- [x] Add interior/shopfront images to homepage hero
- [x] Use brand images on About Us page
- [x] Proper image display on product cards


## Phase 3 - Fixes & Enhancements (Dec 5, 2025)

### Hot Beverages (Missing Items)
- [x] Add Tea in Pot subcategory with: Organic Rose Black Tea, Organic Jasmin Black Tea, Organic Masala Whole Leaf, Hong Kong Style Yuen-Yeung Milk Tea, Yuzu Honey
- [x] Add Hot Chocolate to hot beverages

### Boba Selection Flow Fix
- [x] Fix hierarchy: With Boba → Tapioca OR Popping
- [x] If Tapioca selected → Show Small/Big size options
- [x] If Popping selected → Show 5 flavor options
- [x] Extra boba defaults to same size/type as primary boba

### POS Enhancements
- [x] Add product photos to POS interface
- [x] Add extra boba add-on option to POS
- [x] Apply same boba selection logic to POS

### Brand Colors Update
- [x] Change from green to warm wood tones (golden oak, honey)
- [x] Add dusty rose/blush pink accents
- [x] Use cream/beige backgrounds
- [x] Add terracotta/coral accent colors


## Phase 4 - Category Restructure & Fixes (Dec 5, 2025)

### Website Extra Boba
- [x] Add extra boba capability to website customization modal (already exists, verified working)

### Slush Fix
- [x] Remove milk options from Slush products (slushes don't have milk)

### Hot Beverages Restructure
- [x] Make Hot Beverages a main category (same level as Bubble Tea, Food, etc.)
- [x] Create Hot Coffee subcategory under Hot Beverages
- [x] Create Hot Tea (Tea in Pot) subcategory under Hot Beverages

### Iced Coffee Repositioning
- [x] Move Iced Coffee to main category level (alongside Bubble Tea, Mochis, Food, Slush)
- [x] Update both website and POS navigation to reflect new structure


## Phase 5 - Bug Fixes (Dec 5, 2025)

### Extra Boba Fix
- [x] Make extra boba option clickable for delivery bubble tea

### Milk Options Fix
- [ ] Remove vegan/almond milk from bubble tea drinks
- [ ] Remove vegan/almond milk from slush drinks
- [ ] Keep vegan/almond milk only for hot coffee

### Coconut Cream Cap
- [ ] Add coconut cream cap option for bubble tea latte drinks
- [ ] Apply to both delivery and POS

### Category Fixes
- [x] Move Omurice and Omunoodles to Omelette subcategory
- [x] Rename "Flat Bread" subcategory to "Cong You Bing"

### Additional Phase 5 Fixes (User Reported)
- [x] Fix extra boba still not clickable on delivery site
- [x] Fix slush still showing vegan milk options (code already restricts to hot-beverages + coffee)
- [x] Move Omurice and Omunoodles from Noodles to Omelette subcategory
- [x] Fix header overlap issue on checkout page (content scrolls behind sticky header)
