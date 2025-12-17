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

### POS Milk Options Fix (User Reported)
- [x] Remove vegan milk options from bubble teas in POS
- [x] Add Coconut Cream Cap option for Tea Lattes only in POS
- [x] Keep vegan milk options only for hot coffee in POS


## Phase 6 - Multi-Outlet POS & Employee Integration

### Database Schema Updates
- [x] Add outlets table (using existing storeLocations)
- [x] Add outlet_products table (outletId, productId, isAvailable, priceOverride)
- [x] Add pos_sessions table (staffId, outletId, loginTime, logoutTime)
- [x] Add pos_audit_log table (sessionId, action, details, timestamp)
- [x] Update orders table to include outletId and posSessionId

### Employee Master Integration
- [x] Create server-side Employee API service (employeeMaster.ts)
- [x] Add tRPC procedure for staff authentication via mobile
- [x] Store Employee API credentials as secrets (EMP_MASTER_API_URL, EMP_MASTER_API_KEY)

### POS Staff Login
- [x] Create /pos/login route with mobile number input
- [x] Validate against Employee Master API
- [x] Create staff session with outlet assignment
- [x] Show outlet selection after authentication

### Outlet-Aware POS
- [x] Filter products by outlet availability (admin can toggle)
- [x] Use outlet-specific prices when configured
- [x] Track all orders with outlet and staff info
- [x] Log all POS actions for audit trail

### Admin Outlet Management
- [x] Add Outlets tab in Admin
- [x] Per-outlet product availability toggle
- [x] Per-outlet price override option
- [x] Add POS Audit tab for viewing session logs

### Future Integrations (Noted)
- [ ] Zomato/Swiggy API integration (pending API credentials)
- [ ] Porter delivery integration (pending business account)
- [ ] Meta Pixel for social media retargeting


## Phase 7 - Homepage Video Hero

- [x] Convert video to MP4 for web compatibility
- [x] Replace static hero image with video background
- [x] Ensure video autoplays, loops, and is muted


## Phase 8 - POS Mochi Quantity Pricing

- [x] Add mochi quantity selection (1/2/3 pieces) to POS
- [x] Implement Fruit Mochi pricing: 1pc=₹185, 2pc=₹350, 3pc=₹495
- [x] Implement Signature Mochi pricing: 1pc=₹270, 2pc=₹530, 3pc=₹750
- [x] Update database with mochi quantity pricing structure


## Phase 8b - POS Mochi Mix-and-Match

- [x] Redesign mochi ordering as "Mochi Box" concept
- [x] Add Fruit Mochi Box options: 1pc, 2pc, 3pc with respective pricing
- [x] Add Signature Mochi Box options: 1pc, 2pc, 3pc with respective pricing
- [x] Allow staff to select individual flavors for each slot in the box (including duplicates)
- [x] Display selected flavors in cart (e.g., "Fruit Mochi 2pc: Strawberry, Cherry")


## Phase 8c - Mochi Delivery "Set of 2" Indicator

- [x] Add "Set of 2" badge on mochi product cards for delivery
- [x] Add "Set of 2 pieces" indicator in customization modal for delivery
- [x] Make indicator visible to customers on menu page


## Phase 9 - Admin Product Management

- [x] Products tab already exists in Admin page
- [x] Implement product image upload with S3 storage
- [x] Add price editing (in-store and delivery prices)
- [x] Stock availability toggle exists (In Stock switch)
- [x] Product list with search/filter by category exists
- [ ] Support bulk image import (ready for user to share images)


## Phase 10 - Razorpay Payment Integration

- [x] Add Razorpay API keys as secrets
- [x] Create Razorpay order creation endpoint
- [x] Add Razorpay checkout script to frontend
- [x] Implement payment verification endpoint
- [x] Update checkout flow to use Razorpay
- [x] Handle payment success/failure callbacks


## Phase 11 - Order Status Tracker & Payment Flow

- [x] Remove Cash on Delivery option for delivery orders
- [x] Allow Cash at Pickup for pickup orders only
- [x] Create visual order status tracker for customers (OrderTracker component)
- [x] Add status update buttons for staff (/staff/orders page)
- [x] Show order tracker on order confirmation page
- [x] Order tracking page already exists at /track


## Bug Fixes - Order Workflow

- [x] Remove payment method section for delivery orders (only online payment required)
- [x] Add status update buttons to Admin Orders tab for workflow progression


## Phase 18 - Bug Fixes

### Scrolling Issues
- [x] Fix header overlap on homepage hero section
- [x] Ensure smooth page scrolling
- [x] Add solid background to header for visibility


### Mochi Ordering Fix
- [x] Enforce pair-only mochi selection for delivery/pickup orders (minimum 2 pieces)
- [x] Single mochis only allowed for in-store orders
- [x] Update cart to convert single mochis to pairs when switching to delivery/pickup
- [x] Show "Min. 2 pcs" badge on mochi cards for delivery
- [x] Show minimum quantity message in customization modal

### Instagram Integration
- [x] Add Instagram link with icon to homepage footer
- [x] Add Instagram link to About page footer
- [x] Link to @taiwan_maami Instagram profile


## Phase 19 - Guest Checkout & Loyalty Program

### Guest Checkout
- [x] Add guest checkout option at checkout page
- [x] Collect name, mobile, email (optional), address for guests
- [x] Show benefits of logging in (earn stamps)
- [x] Create guest_orders table for guest order tracking

### Digital Stamp Card Loyalty Program
- [x] Add stamp_count, lifetime_stamps, last_stamp_date to users table
- [x] Create loyalty_rewards table for vouchers
- [x] Create stamp_transactions table for audit log
- [x] Earn 1 stamp per ₹450 spent
- [x] Bonus stamp when spending ₹900+
- [x] 10 stamps = Free Large Bubble Tea reward
- [x] Stamp card UI on My Orders page
- [x] Show stamps earned preview at checkout
- [x] Create loyalty tRPC procedures (earnStamps, getRewards, redeemReward)

### Chennai Locality Dropdown
- [x] Add locality dropdown to checkout address form
- [x] Auto-fill pincode when locality selected
- [x] Use existing CHENNAI_AREAS from shared/types.ts


## Phase 20 - Mochi Pricing Fix (Dec 7, 2025)

### GST Double-Counting Fix
- [x] Fix Header.tsx - removed double GST calculation in cart total
- [x] Fix Cart.tsx - removed double GST in order summary total
- [x] Fix Menu.tsx - removed double GST in View Cart button
- [x] Fix ProductCard.tsx - correct mochi pricing for delivery/pickup (use deliveryPrice)
- [x] Fix ProductCustomizationModal.tsx - correct mochi set pricing calculation (divide by 2 for sets)
- [x] Verify order summary shows correct breakdown: Subtotal + SGST + CGST = Total


## Phase 25 - Color Palette Update (Dec 7, 2025)

- [x] Update primary color to #bd302c (warm red)
- [x] Update secondary/accent to #a85348 (terracotta)
- [x] Update background tones with #d2b48c (tan/wheat)
- [x] Update hover states with #9e0b0f (deep red)
- [x] Apply #a86462 (dusty rose) for secondary accents
- [x] Verify colors across all pages


## Phase 26 - Homepage Updates (Dec 7, 2025)

- [x] Remove "Our Signature Creations" section from homepage
- [x] Update "Explore Our Menu" with 4 category cards: Bubble Tea/Coffee, Hot Beverages, Asian Rice-Noodles-Bread, Asian Sweet Bites
- [x] Add video backgrounds to each category card


## Phase 27 - Location Cards Update (Dec 7, 2025)

- [ ] Update "Visit Our Outlets" with two video-background location cards
- [ ] Add Palladium Mall location: First Floor Palladium Mall, Velachery, Chennai - 42
- [ ] Add T Nagar (Moutan) location: New No. 29, Burkit Road, TNagar, Chennai - 17
- [ ] Add video backgrounds to location cards


## Phase 28 - Reviews Feature (Dec 7, 2025)

- [ ] Add reviews table to database schema (rating, comment, user, order, status)
- [ ] Add review CRUD procedures to routers.ts
- [ ] Add Reviews tab to Admin dashboard with moderation
- [ ] Add review submission UI for customers after order completion
- [ ] Display reviews on homepage or product pages


## Phase 21 - Reviews & Location Video Cards

### Reviews Feature
- [x] Add reviews table to database schema
- [x] Create reviews router with CRUD procedures
- [x] Add Reviews tab to Admin dashboard
- [x] Add review submission UI for customers (on completed orders)
- [x] Write vitest tests for reviews router

### Location Video Cards
- [x] Update Visit Our Outlets section with video background cards
- [x] Add Palladium Mall location video
- [x] Add T Nagar (Moutan) location video
- [x] Add Get Directions button linking to Google Maps


## Phase 22 - Subcategory Navigation Page

### Subcategory Portrait Cards
- [x] Create subcategory page with portrait product cards
- [x] Bubble Tea/Coffee subcategories: Black Tea, Oolong Tea, Green Tea, Matcha, Taro, Slush, Coffee
- [x] Hot Beverages subcategories: Coffee, Hot Cocoa, Tea
- [x] Asian Rice-Noodles-Bread subcategories: Rice, Noodle, Flat Bread, Savoury Pillow Brioche
- [x] Asian Sweet Bites subcategories: Mochi, Boba Creme Caramel, Sweet Pillow Brioche

### Navigation Updates
- [x] Homepage category video cards link to subcategory pages
- [x] Menu navigation goes to subcategory selection page
- [x] Subcategory cards link to filtered product menu

## Phase 23 - Video Updates

- [x] Update Bubble Tea/Coffee category video with Creme Brulee Taro video
- [x] Update Asian Sweet Bites category video with Matcha Mochi video
- [x] Update Hot Beverages category video with Yuzu Chadian video

## Phase 24 - Moutan Branding

- [x] Add Moutan logo alongside Taiwan Maami in header
- [x] Add Moutan logo alongside Taiwan Maami in footer
- [x] Update hero banner video with new Boba Tea video

## Phase 25 - Bug Fixes (Updated Dec 11, 2025 - KOT System Ready)

### Stamp System
- [x] Fix stamp not being awarded on order completion (stamps awarded when order marked 'completed')
- [x] Verify KOT polling works after publishing (fixed schema mismatch)
- [ ] Fix KOT creation to trigger on Razorpay payment confirmation (not manual verification)
- [x] Fix POS authentication service unavailable error (update Employee Master API URL and key)

### KOT Polling
- [x] Add kot_queue table to database schema
- [x] Add KOT router procedures (pollPending, markPrinted)
- [x] Update payment verification to save KOT to database

### POS Session Error
- [x] Fix "Session not found" error on POS page (session already exists in DB)

- [x] CRITICAL: Fix order creation failure after Razorpay payment success (order is created, issue was elsewhere)
- [ ] CRITICAL: Orders not showing in Admin page after payment
- [x] Grant admin access to Theresa (theresa.hu.cy@taiwanmaami.com)
- [ ] CRITICAL: KOT not being created after payment verification


## POS Removal - Converting to Customer-Only Website
- [ ] Remove POS routes and pages from frontend
- [ ] Remove POS-related backend procedures
- [ ] Remove POS links from navigation
- [ ] Clean up unused imports and code
- [ ] Test customer ordering flow still works


## Phase 25 - POS Removal (Dec 13, 2025)

### Decision: Remove POS from Website
- [x] Remove posAuth router (staff login, sessions, outlets)
- [x] Remove pos router (POS order creation)
- [x] Remove getPOSAuditLogs from admin router
- [x] Change staffProcedure to adminProcedure for order management
- [x] Remove POS link from Admin header
- [x] Remove Outlets tab from Admin dashboard
- [x] Remove POS Audit tab from Admin dashboard
- [x] Remove OutletsTab and POSAuditTab components
- [x] Keep KOT system for kitchen printing (used by online orders)
- [x] Website now purely customer-facing online ordering platform

### Reason for Removal
- POS functionality was causing deployment complexity
- Employee Master API integration issues on production
- Decision to build POS as a separate dedicated system
- Simplifies the website codebase for easier maintenance


## Phase 26 - Title Update (Dec 13, 2025)

- [x] Update index.html title from "POS & Ordering Platform" to "Online Ordering"
- [x] Remove POS version comment from Home.tsx
- [ ] Update VITE_APP_TITLE in Settings (user action required)


## Bug Fix - Reviews Query Error (Dec 13, 2025)

- [x] Fix reviews.getByOrderId query failing on /orders page (schema mismatch)
- [x] Fix KOT polling returning "API Error: undefined" - Added REST endpoints /api/kot/poll and /api/kot/printed
- [x] Fix KOT tRPC endpoint returning "[object Object] is not valid JSON" - Fixed kotData parsing


## Deployment Fix (Dec 14, 2025)

- [x] Force redeploy to ensure KOT REST endpoints are deployed
- Deployment marker: v2025.12.14.1

## Bug Fix - Checkout Total Calculation (Dec 14, 2025)

- [x] Fix checkout order summary - removed double GST calculation in displayTotal

## Phase 29 - UI Improvements (Dec 16, 2025)

- [x] Increase product photo upload size limit to 50MB
- [x] Add category/subcategory dropdown to product edit dialog
- [x] Add Categories management tab to Admin (create/edit/delete categories and subcategories)
- [x] Allow moving products between categories/subcategories

## Phase 30 - Full CMS Access for Theresa (Dec 16, 2025)

- [x] Add "Add New Product" button and form to Products tab
- [x] Add "Delete Product" functionality with confirmation
- [x] Add "Site Settings" tab for editing homepage text/descriptions
- [x] Enable editing of hero section title and description
- [x] Homepage content editable via Site Settings tab

## Phase 31 - Fix Category/Subcategory Editing (Dec 16, 2025)

- [ ] Fix category editing dialog
- [ ] Fix subcategory editing dialog
- [ ] Test create/edit/delete for categories
- [ ] Test create/edit/delete for subcategories

## Phase 32 - Proper Site Settings Editing

- [x] Add site_settings table to database schema (key-value pairs for all site content)
- [x] Create tRPC procedures for getting/updating site settings
- [x] Add editable category descriptions in Site Settings tab
- [x] Add editable store information fields in Site Settings tab
- [x] Add Save Settings button that actually saves to database
- [x] Test all site settings editing functionality

## Phase 33 - Core CMS Features (Dec 17, 2025)

### Category/Subcategory Management
- [x] Fix category editing dialog (enable name and description editing)
- [x] Fix subcategory editing dialog (enable name, description, and base pricing editing)
- [x] Test create new category
- [x] Test edit existing category
- [x] Test delete category
- [x] Test create new subcategory
- [x] Test edit existing subcategory
- [x] Test delete subcategory

### Product Descriptions
- [x] Add description field to products table schema
- [x] Update product creation form to include description textarea
- [x] Update product editing to include description field
- [x] Display product description in customization modal on website
- [x] Display product description in POS product details

### Customer Reviews Management
- [x] Add moderate/approve button to Reviews tab
- [x] Add delete review functionality
- [x] Add reply to review functionality
- [x] Show pending vs approved review status
- [x] Filter reviews by status (all/pending/approved)
