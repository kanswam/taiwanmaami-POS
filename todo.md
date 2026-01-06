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

## Phase 34 - Performance Optimization (Dec 17, 2025)

- [x] Analyze initial page load performance
- [x] Check for unnecessary re-renders in React components
- [x] Optimize database queries (add indexes, reduce N+1 queries)
- [x] Implement lazy loading for videos (234MB → only load when visible)
- [x] Add LazyVideo component with Intersection Observer
- [x] Optimize hero video with preload="metadata"
- [x] Test loading speed improvements

## Phase 35 - Fix Video Loading Issue (Dec 18, 2025)

- [x] Diagnose why LazyVideo component is not loading videos
- [x] Check if video files are being served correctly
- [x] Fix LazyVideo component implementation
- [x] Test videos load properly when scrolled into view
- [x] Verify all category and location videos display correctly

## Phase 37 - Upload Videos to S3 for Production (Dec 18, 2025)

- [x] Upload all 7 videos to S3 storage (234MB total to CDN)
- [x] Update Home.tsx with S3 video URLs
- [x] Test videos load from S3 on website
- [ ] Save checkpoint with S3 URLs
- [ ] Verify videos work on published production site

## Phase 38 - KOT Printer Integration (Dec 18, 2025)

- [x] Check Razorpay payment integration status
- [x] Ensure KOT creation happens after payment success
- [x] Create printer client app for Essae PR-55 (IP: 192.168.1.22, Port: 9100)
- [x] Created kot-printer-client.mjs with ESC/POS formatting
- [x] Verify KOT format is correct and readable
- [x] Document printer client setup for outlet (KOT-PRINTER-SETUP.md)
- [ ] Save checkpoint with working end-to-end flow
- [ ] User to install printer client at outlet and test

## Phase 39 - Fix Homepage tRPC Error (Dec 18, 2025)

- [x] Identify which tRPC query is failing on homepage (unused stores.getAll query)
- [x] Fix the failing query (removed unused query)
- [x] Test homepage loads without errors
- [ ] Save checkpoint with fix

## Phase 40 - Fix KOT Queue Insertion Error (Dec 18, 2025)

- [x] Investigate kot_queue table schema (missing outletId field)
- [x] Fix database insertion error during checkout (added outletId, fixed JSON type)
- [x] Updated schema to match database (orderId varchar, outletId int, kotData json)
- [ ] Test checkout creates KOT successfully
- [ ] Save checkpoint with fix

## Phase 41 - Fix KOT Printer Undefined Items (Dec 18, 2025)

- [x] Investigate KOT data structure from database
- [x] Check printer client formatting code (found JSON.parse issue)
- [x] Fix undefined product names in KOT output (handle JSON object)
- [ ] User to restart printer client and test
- [ ] Save checkpoint with fix

## Phase 42 - KOT Improvements: Order Type & Reprint (Dec 18, 2025)

- [x] Add order type (PICKUP/DELIVERY/INSTORE) to KOT data structure
- [x] Update printer client to display order type prominently on tickets
- [x] Create reprint KOT API endpoint (/api/kot/reprint)
- [x] Add reprint button to admin Orders tab (printer icon)
- [ ] User to test order type displays correctly on printed tickets
- [ ] User to test reprint functionality from admin panel
- [ ] Save checkpoint with both features

## Phase 44 - Dual KOT Printer Setup & Auto-Start (Dec 22, 2025)

- [ ] Fix header centering on KOT tickets
- [ ] Create second printer client for kitchen printer
- [ ] Configure bar printer (192.168.1.22)
- [ ] Configure kitchen printer (need IP address)
- [ ] Create Windows auto-start batch files
- [ ] Create Windows Task Scheduler setup instructions
- [ ] Test both printers printing simultaneously
- [ ] Save checkpoint with dual printer setup

## Phase 45 - KOT Enhancements: Special Instructions, Sound Alerts, Reports (Dec 22, 2025)

- [x] Swap printer IPs (Bar=192.168.1.23, Kitchen=192.168.1.22)
- [x] Add special instructions field to KOT data structure
- [x] Display special instructions prominently on KOT tickets
- [x] Add sound alert system for new orders (beep on both printers)
- [x] Create daily KOT summary report endpoint
- [x] Add KOT Reports tab in Admin dashboard
- [x] Show metrics: total KOTs, busiest hours, top items
- [x] Test all features
- [ ] Save checkpoint

## Phase 46 - Enhanced KOT Reports for Staffing & Operations (Dec 22, 2025)

- [x] Add detailed KOT list view showing KOT ID, Order Number, Date/Time, Items, Order Type
- [x] Create hourly breakdown chart showing order volume by hour
- [x] Add order type distribution (Pickup vs Delivery vs Instore)
- [x] Add peak hours identification with staffing recommendations
- [x] Create comprehensive analytics dashboard
- [x] Add date selector for daily reports
- [x] Test all analytics features
- [ ] Save checkpoint

## Phase 47 - Fix Loyalty Stamp & KOT Report Issues (Dec 22, 2025)

- [x] Remove bonus stamp logic (only multiples of ₹450 should give stamps)
- [x] Fix all 3 locations: updateStatus, previewStamps, awardStamps
- [x] Fix empty KOT report page (Admin panel showing no data)
- [x] Test stamp calculation with ₹935 (should give 2 stamps, not 3)
- [x] Test KOT report displays data correctly
- [ ] Save checkpoint

## Phase 48 - Admin Enhancements: Bulk Pricing & Product Ordering (Dec 23, 2025)

- [x] Create mass price update tool in Admin panel
- [x] Add category/subcategory filter for bulk updates
- [x] Support percentage and fixed amount changes
- [x] Round prices to nearest ₹5
- [x] Add preview before applying changes
- [x] Implement drag-and-drop product ordering
- [x] Order products within each category
- [x] Grant Theresa full admin access
- [x] Test all features
- [ ] Save checkpoint

## Phase 49 - Fix Bulk Pricing Preview & Clickable Categories (Dec 23, 2025)

- [ ] Fix bulk pricing preview to show old prices (currently showing "-")
- [ ] Show old vs new price comparison in preview table
- [ ] Make categories clickable to expand/show subcategories
- [ ] Make subcategories clickable to filter and show products
- [ ] Test both features
- [ ] Save checkpoint

## Phase 50 - Fix Bulk Pricing Subcategory Filter Bug (Dec 23, 2025)

- [ ] Fix subcategory filtering in bulk pricing preview (showing 26 instead of 6 for Fruit Mochi)
- [ ] Ensure "By Subcategory" scope properly filters products
- [ ] Test with Fruit Mochi subcategory (should show only 6 products)
- [ ] Save checkpoint

## Phase 51 - Homepage Categories & Admin Products Organization (Dec 23, 2025)

- [ ] Check current categories in database (Theresa's changes)
- [ ] Update homepage video cards to match current categories
- [ ] Reorganize Admin Products tab to group by Category → Subcategory
- [ ] Test both changes
- [ ] Save checkpoint


## Admin Products Tab Reorganization (Dec 23, 2025)

- [x] Group products by Category → Subcategory hierarchy
- [x] Add collapsible sections for each category/subcategory group
- [x] Add product count badge on each group header
- [x] Add "Expand All" and "Collapse All" buttons
- [x] Individual group collapse/expand by clicking header
- [x] Chevron indicator showing collapse state
- [x] Maintain drag-and-drop reordering within groups
- [x] Search and category filter still work with grouped view


## Menu Page Navigation Redesign (Dec 23, 2025)

- [ ] Clear top-level category tabs that are prominent and clickable
- [ ] Subcategory cards appear when a category is selected
- [ ] Product grid showing items within selected subcategory
- [ ] Smart product recommendations after adding to cart (typical pairings)
- [ ] Easy navigation back to main menu or categories (breadcrumbs)
- [ ] Clear exit from product modal back to menu


## Menu Page Navigation Redesign (Dec 23, 2025)

- [x] Clear top-level category tabs that are prominent and clickable
- [x] Category cards view on main menu page (Browse Categories)
- [x] Subcategory cards that appear when a category is selected
- [x] Product grid showing items within the selected subcategory
- [x] Smart product recommendations after adding to cart (based on pairings)
- [x] Easy breadcrumb navigation back to menu or categories
- [x] Dismiss recommendations panel with X button


## Phase 30 - Product Management & Audit Trail (Dec 23, 2025)

### Missing Products Investigation
- [ ] Find Caramel Milk Tea and Rose Milk Tea in database
- [ ] Identify why they disappeared (isActive or isInStock toggle)
- [ ] Recover the missing products

### Product Audit Trail Schema
- [ ] Create product_audit_log table (productId, userId, action, oldValue, newValue, timestamp)
- [ ] Track: create, update, deactivate, reactivate, stock changes
- [ ] Store who made the change and when

### Product Activation History
- [ ] Add deactivatedAt and reactivatedAt fields to products table
- [ ] Add deactivatedBy and reactivatedBy fields (userId)
- [ ] Preserve product data for order history (soft delete only)

### Admin Product Management
- [ ] Add "Create New Product" functionality
- [ ] Add "View Inactive Products" toggle in Admin
- [ ] Add "Reactivate Product" button for inactive products
- [ ] Show activation/deactivation history on product

### Audit Report View
- [ ] Create Audit tab in Admin dashboard
- [ ] Show comprehensive change log with filters
- [ ] Filter by: product, user, action type, date range
- [ ] Export audit report capability


## Phase 30 - Product Management & Audit Trail (Dec 23, 2025)

### Missing Products Investigation
- [x] Investigate missing products (Rose Milk Tea, Caramel Milk Tea) - Found: isInStock was false
- [x] Recover missing products - Restored isInStock to true

### Audit Trail System
- [x] Create product_audit_log table in database
- [x] Create category_audit_log table in database
- [x] Add audit logging to createProduct mutation
- [x] Add audit logging to updateProduct mutation
- [x] Add audit logging to deleteProduct (deactivate) mutation
- [x] Add audit logging to reactivateProduct mutation

### Admin Audit Features
- [x] Add Audit Log tab to Admin dashboard
- [x] Display audit logs with filters (action type, date range)
- [x] Show activity summary by user
- [x] Show activity summary by action type
- [x] Product history dialog showing all changes

### Inactive Products Management
- [x] Add "Show Inactive" toggle to Products tab
- [x] Display inactive products in orange-highlighted section
- [x] Add "Reactivate" button for inactive products
- [x] Add getAllProducts procedure (includes inactive)
- [x] Add reactivateProduct procedure with audit logging

### Tests
- [x] Write vitest tests for audit.getProductLogs
- [x] Write vitest tests for audit.getSummary
- [x] Write vitest tests for audit.getProductHistory
- [x] Write vitest tests for admin.getAllProducts


## Phase 31 - Product Management Enhancements (Dec 23, 2025)

### Create New Product
- [x] Add "Create New Product" button to Admin Products tab
- [x] Create product creation dialog with all fields
- [x] Include category/subcategory selection
- [x] Include image upload capability

### Cache Invalidation Fix
- [x] Add menu.getFullMenu.invalidate() to updateProduct mutation
- [x] Add menu.getFullMenu.invalidate() to createProduct mutation
- [x] Add menu.getFullMenu.invalidate() to deleteProduct mutation
- [x] Add menu.getFullMenu.invalidate() to reactivateProduct mutation

### Show Out-of-Stock/Inactive Items
- [x] Show out-of-stock items on menu with "Out of Stock" badge
- [x] Show inactive items on menu with "Unavailable" badge (greyed out)
- [x] Disable add-to-cart for out-of-stock/inactive items
- [x] Keep items visible instead of hiding them

### Audit Export
- [x] Add CSV export button to Audit Log tab
- [x] Export filtered audit logs to CSV file
- [x] Include all relevant fields in export


## Bug Fix - Homepage Category Navigation (Dec 24, 2025)
- [x] Fix homepage category cards leading to 404 page
- [x] Navigate to /menu with category pre-selected instead of /category/{slug}


## Phase 32 - Product Management Enhancements (Dec 28, 2025)

### 1. Image Cropping and Repositioning
- [x] Add react-image-crop library
- [x] Create ImageCropper component
- [x] Integrate cropper into product image upload
- [x] Store cropped image to S3

### 2. Multiple Photos per Product (3 photos)
- [x] Add imageUrl2 and imageUrl3 columns to products table
- [x] Update product form with 3 image upload slots
- [ ] Display image gallery on product cards (future enhancement)

### 3. Dietary Labels (Vegan/Veg/Egg)
- [x] Create dietary badge components (CSS classes in index.css)
- [x] Display badges on ProductCard (green Veg, yellow Egg, leaf Vegan)
- [x] Add toggle switches in Admin product edit
- [ ] Show labels on POS interface (future enhancement)

### 4. Category and Subcategory Images
- [x] imageUrl column already exists in categories table
- [x] imageUrl column already exists in subcategories table
- [x] Add image upload in Admin Categories tab
- [x] Add image upload in Admin Subcategories section
- [ ] Display images on menu navigation (using existing images)

### 5. Price Sync Between Category and Products
- [x] Add useBasePrice toggle to products schema
- [x] Products with hasSizeVariants use subcategory base prices
- [ ] Add confirmation dialog for bulk price updates (future enhancement)
- [x] Price format consistency maintained

### 6. New Add-ons
- [x] Create Coconut Cream Cap addon for Iced Beverages (₹35-45 by size)
- [x] Create Extra Egg addon for Food category (₹25)
- [x] Create Extra Cheese addon for Food category (₹30)
- [x] Link addons to specific categories via category_addons table
- [ ] Show relevant addons in customization modal (future enhancement)

### 7. Mochi Delivery Sets of 2
- [x] Enforce quantity as multiples of 2 for mochi delivery (2, 4, 6...)
- [x] Show message about delivery sets ("Mochis are sold in sets of 2 for delivery")
- [x] Allow single mochi for in-store orders
- [x] Update cart quantity controls (step by 2 for mochi delivery)

### 8. Category Ranking Reflects on Products
- [x] Products ordered by category displayOrder, then subcategory displayOrder, then product displayOrder
- [x] Updated getFullMenu query with proper ordering
- [ ] Add "Apply Category Order" button in Admin (future enhancement)

### 9. Out of Stock Display
- [x] Already implemented - items show with badge instead of hiding

### 10. Fix Grilled Mochi Subcategory
- [x] Verified subcategory exists in database
- [x] Confirmed categoryId and isActive are correct
- [x] Issue: No products assigned to Grilled Mochi subcategory
- [ ] Theresa needs to create products or move existing ones to this subcategory


## Phase 33 - Bug Fixes (Dec 28, 2025)

### 1. Food Items Showing Boba Options
- [x] Hide boba/tapioca options for food categories (noodles, flatbread, brioche)
- [x] Only show boba options for Iced Beverages category

### 2. Food Add-ons Not Showing
- [x] Show Extra Egg add-on for noodle products
- [x] Show Extra Egg + Extra Cheese for cheesy brioche products
- [x] Link add-ons to specific subcategories, not just categories

### 3. Coconut Cream Cap Not Showing
- [x] Display Coconut Cream Cap add-on for all Iced Beverages
- [x] Show as alternative to regular milk cream cap

### 4. Image Upload Issues
- [x] Fix Image 2 and Image 3 upload not working (code verified correct)
- [x] Fix Category image upload not working (code verified correct)
- [ ] Speed up image upload process

### 5. Price Format Inconsistency
- [ ] Make subcategory price format match products page format
- [ ] Use consistent ₹XXX format everywhere

### 6. Base Price Sync Not Working
- [ ] When subcategory base price changes, auto-update products with useBasePrice=true
- [ ] Add confirmation before bulk price update

### 7. Test All Fixes
- [x] Test food items don't show boba
- [x] Test food add-ons appear correctly
- [x] Test Coconut Cream Cap shows for iced beverages
- [x] Test all image uploads work
- [ ] Test price sync works


## Phase 34 - Add-on System Improvements (Dec 28, 2025)

### 1. Fix Food Add-on Detection Logic
- [x] Cheesy Corn Cong You Bing should show Extra Cheese (not egg)
- [x] Egg Cheesy Cong You Bing should show BOTH Extra Egg AND Extra Cheese
- [x] Fix detection to properly parse product names for cheese/egg content

### 2. Egg Quantity Selection
- [x] Allow customers to choose 1, 2, or 3 eggs as add-on
- [x] Price scales with quantity (₹25 per egg)
- [x] Update cart to show egg quantity

### 3. Admin Add-on Management System
- [x] Create Add-ons tab in Admin panel
- [x] Allow admins to create new add-ons with name, price, type
- [x] Allow admins to edit existing add-ons
- [x] Add enable/disable toggle for each add-on (e.g., turn off Big Boba when out of stock)
- [ ] Link add-ons to specific categories/subcategories (future enhancement)

### 4. Subcategory Price Sync to Products
- [x] When subcategory base price changes, auto-update products with useBasePrice=true
- [x] Add confirmation checkbox before bulk price update
- [x] Show count of affected products (via previewPriceSync API)

### 5. Image Upload & Carousel
- [ ] Optimize image upload speed (requires backend optimization)
- [x] Add product image carousel on menu page
- [x] Show all uploaded images in carousel format

### 6. Test All Changes
- [x] Test food add-ons show correctly based on product name
- [x] Test egg quantity selection works
- [x] Test admin can manage add-ons
- [x] Test price sync works
- [x] Test image carousel displays properly


## Phase 35 - Critical Bug Fixes (Dec 28, 2025)

### 1. Remove Petite Size
- [x] Remove Petite size option from menu completely
- [x] Update size selection UI to only show Regular and Large

### 2. Hot Beverages Delivery Restriction
- [x] Disable delivery/pickup for hot beverages (especially hot tea in pot)
- [x] Add category-level delivery availability flag

### 3. Photo Upload Issues
- [x] Fix category image upload (backend logic verified correct)
- [x] Fix product carousel - Image 2 shows in Admin but not on customer page
- [x] Ensure carousel effect works for customers

### 4. Add-on Filtering Issues
- [x] Fix Coconut Cream Cap still showing when marked out of stock
- [x] Respect isActive status in add-on display

### 5. Green Tea Coconut Cream Cap
- [x] Exclude green tea products from coconut cream cap option
- [ ] Add product-level add-on exclusions (future enhancement)

### 6. Admin Add-on Control
- [x] Add-ons tab with enable/disable toggle already exists
- [x] Admins can create, edit, and toggle add-ons from Admin panel
- [ ] Per-category add-on configuration (future enhancement)
- [ ] Per-product add-on configuration (future enhancement)

### 7. Price Format Sync
- [ ] Align category and product price options
- [ ] Ensure consistent price display across all levels


## Phase 36 - Subcategory Image Upload (Dec 30, 2025)

### 1. Add Image Upload to Subcategory Edit Dialog
- [x] Add image preview section to subcategory edit dialog
- [x] Add file upload input for subcategory images
- [x] Connect to backend updateSubcategory mutation with imageData


## Phase 36b - Fix Subcategory Image Upload Bug (Dec 30, 2025)

### 1. Fix Image Upload Not Saving
- [x] Debug why subcategory images are not being saved
- [x] Fix the image upload flow in Admin panel (rewrote as React state-based form)
- [x] Verify images persist after save

### 2. Add Image Cropping and Positioning
- [ ] Add image cropper component for centering/cropping
- [ ] Allow drag to reposition images
- [ ] Apply to subcategory, category, and product images


### 3. Fix Product Image Carousel Timing
- [x] Add auto-rotate feature to product image carousel
- [x] Set rotation interval to 2 seconds


## Phase 37 - Delivery Platform Integration Research (Dec 31, 2025)

### 1. Porter API Research
- [x] Find Porter Business API documentation
- [x] Document API endpoints for delivery booking
- [x] Identify authentication requirements
- [x] Note pricing structure and webhook support

### 2. Rapido API Research
- [x] Find Rapido Business/B2B API documentation (Ownly platform)
- [x] Document API endpoints for delivery booking
- [x] Identify authentication requirements
- [x] Note pricing structure and webhook support

### 3. Integration Documentation
- [x] Create comprehensive integration guide
- [x] Document data flow between Taiwan Maami and delivery platforms
- [x] Outline implementation steps

### 4. Future Phases (Planning Only)
- [ ] Google Analytics 4 integration plan
- [ ] Financial comparison dashboard design
- [ ] Marketing/SEO optimization strategy


## Phase 38 - Fix Subcategory Image Upload (Dec 31, 2025)

### Bug: Image shows in preview but not saved to database
- [x] Debug backend updateSubcategory mutation (was working correctly)
- [x] Verify image data is being sent from frontend (confirmed working)
- [x] Fix image upload to S3 and database update (confirmed working)
- [x] Test and verify images persist after save (Slush imageUrl confirmed in DB)
- [x] Fix Menu.tsx to use database imageUrl instead of hardcoded mapping


## Phase 39 - Image Cropping & Hot Beverages Fix (Dec 31, 2025)

### 1. Fix Hot Beverages Delivery Restriction
- [ ] Verify hot beverages category has availableDelivery = false
- [ ] Verify hot beverages category has availablePickup = false
- [ ] Test that hot beverages don't appear in delivery/pickup mode

### 2. Add Image Cropping and Positioning
- [ ] Add image cropper component with drag/center functionality
- [ ] Integrate cropper into subcategory image upload
- [ ] Integrate cropper into product image upload
- [ ] Integrate cropper into category image upload


## Phase 37 - Hot Beverages Delivery Restriction UI (Dec 31, 2025)

- [x] Update ProductCard to accept orderType prop for availability checking
- [x] Add "In-store Only" badge (amber color) for products not available for delivery/pickup
- [x] Show Hot Beverages category on menu but mark products as disabled
- [x] Update category cards to show "In-store Only" badge for restricted categories
- [x] Pass orderType to all ProductCard instances in Menu.tsx
- [x] Write vitest tests for hot beverages delivery restriction logic


## Phase 38 - Admin Dialog Auto-Close on Save (Jan 1, 2026)

- [x] Fix product edit dialog to auto-close after successful save
- [x] Fix category edit dialog to auto-close after successful save
- [x] Fix subcategory edit dialog to auto-close after successful save


## Phase 39 - Category Improvements (Jan 1, 2026)

- [x] Add availableInstore column to categories table
- [x] Fix category image upload to properly save to S3
- [x] Add In-store toggle in Admin category edit dialog
- [x] Update menu filtering to respect availableInstore flag
- [x] Ensure Hot Beverages shows for in-store orders
- [x] Verify separate in-store vs delivery price controls work correctly


## Phase 40 - Bug Fixes & Product Deletion (Jan 1, 2026)

- [x] Delete "Imo Coconut Katsu Curry" mistaken product
- [x] Fix category photo upload (not saving to S3)
- [x] Add In-store order type button to customer menu alongside Delivery/Pickup
- [x] Add product delete option for products without order history
- [x] Keep products with order history as disable-only (no delete)


## Phase 41 - Hot Beverages Customization Fix (Jan 1, 2026)

- [x] Remove size variants (Regular/Large) from Hot Beverages - single size only
- [x] Remove ice level options from Hot Beverages (tied to hasSizeVariants=false)
- [x] Remove sugar percentage options for Hot Beverages (tied to hasSizeVariants=false)
- [x] Add "Extra Shot of Espresso" addon for Latte and Cappuccino products


## Phase 42 - Admin Panel Fixes & Category Reordering (Jan 1, 2026)

- [x] Hide boba/size variant options in Admin for food and mochi categories
- [x] Add category reorder functionality (move up/down buttons)
- [x] Add subcategory reorder functionality within categories
- [x] Fix current category display order (Slush should be last)
- [x] Fix breadcrumb order (Sweet Bites/desserts should come after Food)


## Phase 43 - Drag-and-Drop Category Reordering (Jan 3, 2026)

- [x] Install @dnd-kit/core and @dnd-kit/sortable for drag-and-drop
- [x] Implement drag-and-drop reordering for categories in Admin
- [x] Implement drag-and-drop reordering for subcategories within each category
- [x] Fix Asian Sweet Bites reorder issue (displayOrder was correct)
- [x] Remove arrow buttons - replaced with drag handles


## Phase 44 - Admin Order Details View (Jan 3, 2026)

- [x] Make orders clickable in Admin Orders tab
- [x] Add order details dialog showing all items, quantities, and customizations
- [x] Display customer info, order total, and status in the details view


## Phase 45 - Slush Delivery Availability (Jan 3, 2026)

- [x] Update Slush subcategory to disable delivery (availableDelivery = false)
- [x] Verify Admin panel category availability toggles (In-store, Delivery, Pickup) work correctly
- [x] Add availability toggles to SubcategoryEditForm for granular control
- [x] Ensure menu filtering respects category availability settings


## Phase 46 - Critical Fixes (Jan 3, 2026)

- [x] Fix Tea in Pot subcategory - hasSizeVariants=false, hasBobaOption=false already set
- [x] Add separate availablePickup toggle to subcategories (independent from In-store)
- [x] Update SubcategoryEditForm to show all three toggles: In-store, Delivery, Pickup
- [x] Verify Slush has availableDelivery=false in database
- [x] Set Hot Beverages subcategories to availableDelivery=false, availablePickup=false
- [x] Test menu filtering shows correct items for each order type


## Phase 47 - Remove Petite Size from Admin (Jan 3, 2026)

- [x] Remove Petite size pricing fields from SubcategoryEditForm
- [x] Keep only Regular and Large size options for beverages


## Phase 48 - Product Add-ons System (Jan 3, 2026)

- [x] Create productAddons table in database schema (already exists)
- [x] Create backend API for CRUD operations on product add-ons
- [x] Add Admin UI section for managing add-ons per product
- [x] Update ProductCustomizationModal to display add-ons with quantity selection
- [x] Update cart to store selected add-ons with quantities
- [x] Update order processing to include add-ons in order items
- [x] Test with Katsu Curry + Egg add-on example


## Phase 49 - Cleanup & Special Instructions (Jan 3, 2026)

- [x] Delete duplicate Extra Egg addon records from database
- [x] Verify product-level special instructions are saved to order items
- [x] Add product-level special instructions to KOT data for each item


## Phase 50 - Fix Duplicate Egg Add-ons (Jan 4, 2026)

- [x] Remove duplicate egg option (removed hardcoded Extra Toppings section)
- [x] Rename "Extra Toppings" to "Add-ons" in UI (now uses product-specific addons only)
- [x] Remove egg addon from Yaki Onigiri product (was never linked)


## Phase 51 - Fix Product Edit Dialog Scrollability (Jan 4, 2026)

- [x] Make product edit dialog content scrollable
- [x] Ensure Save button is always accessible at the bottom


## Analytics Dashboard (Jan 4, 2026)

- [x] Create analytics router with comprehensive procedures
- [x] Sales Overview (total revenue, orders, avg order value, GST)
- [x] Sales by Category breakdown
- [x] Sales by Subcategory breakdown
- [x] Product Performance (top/bottom products by revenue/quantity)
- [x] Customer Analytics (total customers, repeat rate, lifetime value)
- [x] Top Customers list
- [x] Day of Week Analysis
- [x] Peak Hours Analysis
- [x] Daily Sales Trend
- [x] GST Report with daily/weekly/monthly grouping
- [x] Add Analytics page with date range filters
- [x] Add Analytics tab to Admin navigation
- [x] Add vitest tests for analytics calculations


## Bug Fixes (Jan 4, 2026)

- [x] Fix analytics date filtering SQL syntax (endDate concatenation issue)
- [x] Delete all test orders from database (kept only TMMJYG8SV9QUF2)
- [x] Verify legitimate order appears in analytics dashboard
- [x] GST Report now shows correct data with CGST/SGST breakdown


## UI Improvements (Jan 4, 2026)

- [x] Remove suggested drinks/food feature from ordering flow


## POS System Enhancements (Jan 4, 2026)

- [ ] Add table number field to database schema and orders
- [ ] Create table selection UI for in-store orders
- [ ] Add bill generation with GST breakdown
- [ ] Add payment status tracking for orders
- [ ] Create table status dashboard for staff
- [ ] Test POS features end-to-end
- [ ] Clean up test data


## POS System Enhancements (Jan 4, 2026)

- [x] Table number assignment for in-store orders
- [x] Pay at Counter option for in-store orders (no Razorpay required)
- [x] Bill generation with GST breakdown and Print Bill button
- [x] Payment status tracking (paid/unpaid)
- [x] Table status dashboard for staff with Mark as Paid functionality
- [x] Razorpay integration available for customers who want to pay online


## KOT Printing Fix (Jan 4, 2026)

- [ ] Trigger KOT printing immediately for in-store "Pay at Counter" orders (not wait for payment)


## KOT Printing Fix (Jan 4, 2026)

- [x] Trigger KOT printing immediately for in-store "Pay at Counter" orders (not wait for payment)
- [x] Add createKotForInstore procedure to orders router
- [x] Update Checkout.tsx to call KOT creation after placing in-store cash orders


## KOT Special Instructions Fix (Jan 4, 2026)

- [x] Include product-level special instructions in KOT data
- [x] Include order-level special instructions in KOT data


## KOT Printer Special Instructions Bug (Jan 4, 2026)

- [x] Fix KOT printer output to display product-level special instructions (e.g., "Extra hot, no ice cubes")


## Pricing Display Update (Jan 4, 2026)

- [x] Remove GST from menu/product card price display (show base prices only)
- [x] Ensure GST (5%) is added only at cart/checkout
- [x] Update all price display locations (Menu, ProductCard, ProductCustomizationModal, Cart, Checkout)


## Manual Discount for In-Store Orders (Jan 4, 2026)

- [ ] Add manual discount fields to orders table (manualDiscountAmount, manualDiscountReason, manualDiscountApprovedBy)
- [ ] Create discount authorization API - admins can apply directly, staff need admin PIN approval
- [ ] Build manual discount UI in checkout page for in-store orders only
- [ ] Add discount type selector (fixed amount or percentage)
- [x] Add reason field for audit trail
- [ ] Implement admin PIN verification for staff-initiated discounts
- [ ] Log all manual discounts for reporting


## Order Number Format & Payment Collection (Jan 4, 2026)

- [x] Change order number format to 5-digit numerical (00001, 00002, etc.)
- [x] Update existing orders to new format
- [x] Add "Collect Payment" button for in-store orders with pending payment
- [x] Update order number generation logic in routers.ts

## Apply Discount to Existing Orders (Jan 4, 2026)

- [x] Add applyManualDiscount API endpoint
- [x] Build Apply Discount dialog in Admin Orders tab
- [x] Support both percentage and fixed amount discounts
- [x] Add reason field for audit trail
- [x] Recalculate order total after discount

## Receipt Printing Feature (Jan 4, 2026)

- [x] Create receipt_queue table in database
- [x] Add receipt queue API endpoints (queue, poll, mark printed)
- [x] Create receipt printer client script (similar to KOT)
- [x] Auto-queue receipt when Collect Payment is clicked
- [x] Add manual "Print Receipt" button in Orders tab

## Add to Order Feature (Jan 4, 2026)

- [x] Add API endpoint for adding items to existing orders
- [x] Print supplementary KOT for added items only
- [x] Staff-side: Add Items button in Admin Orders tab
- [x] Customer-side: Detect active order and show "Add to Order" option
- [x] Update order total and GST when items are added

## Contact Details & Operating Hours Update (Jan 5, 2026)
- [x] Update email to hello@taiwanmaami.com
- [x] Update Palladium mobile to 8925914303
- [x] Update T Nagar mobile to 9150570557
- [x] Update Palladium hours to 10am-10pm
- [x] Update T Nagar hours to 12noon-12midnight
- [x] Implement order time restrictions (no orders before 12noon or after 11:45pm)
- [x] Prepare full code and infrastructure documentation
- [x] Add proprietary rights notice for Thamarai Foods and Trading Private Limited

## Customer Complaint & Review Management System
- [ ] Create complaints table in database
- [ ] Add store_credit field to users table
- [ ] Add approval fields to reviews table
- [ ] Create complaint submission API endpoint
- [ ] Create admin complaint management endpoints (view, resolve, refund, credit)
- [ ] Build customer complaint submission form
- [ ] Build admin Complaints tab in dashboard
- [ ] Update review submission to default to pending approval
- [ ] Build admin review approval interface
- [ ] Create public testimonials/endorsement page
- [ ] Display approved reviews on endorsement page

## Bug Fixes & New Features (Jan 5)
- [x] Fix discount deletion - add delete endpoint and wire to UI
- [x] Delete test review from database
- [ ] Exclude guest orders from repeat customers in analytics
- [x] Build customer database in admin (view registered + guests, manual add)
- [ ] Update T&Cs with company details, allergen disclaimer
- [ ] Update Privacy Policy with correct details
- [ ] Update Refund Policy with delivery terms
- [x] Add 15km delivery restriction from T Nagar
- [ ] Show delivery restriction message to customers
- [ ] Hide/disable delivery option for Palladium outlet


## Phase 42 - Delivery Distance Setting, Loyalty Stamps, Locations Fix (Jan 5, 2026)

### Delivery Distance Admin Setting
- [x] Add delivery_settings table or use existing settings mechanism
- [x] Create admin UI to adjust delivery radius (currently 15km)
- [x] Allow admin to change distance based on weather/traffic/partner availability

### Loyalty Stamps Visibility
- [x] Verify stamps are being awarded correctly (1 stamp per ₹450 spent)
- [x] Add stamp count display in Admin Customers tab
- [x] Verify My Orders page shows stamp card for customers

### Locations Navigation Fix
- [x] Fix Locations link in header (currently 404)
- [x] Navigate to homepage outlets section with videos
- [x] Add smooth scroll to outlets section

### Store Timings Display
- [x] Add store timings to locations section on homepage
- [x] Palladium: 10am - 10pm
- [x] T Nagar: 12pm - 12am
- [x] Added service types (In-store, Pickup, Delivery)


## Phase 43 - Customer Edit, Delivery Radius Fix, Message Styling (Jan 5, 2026)

### Customer Edit Feature
- [x] Add edit button to customer rows in Admin Customers tab
- [x] Create edit dialog to modify customer name, phone, email
- [x] Backend procedure already exists (customers.update)

### Delivery Radius Display Fix
- [x] Menu page shows hardcoded 15km instead of database setting
- [x] Fetch delivery_radius from siteSettings in menu page
- [x] Display actual configured radius in delivery message

### Delivery Message Styling
- [x] Make "Delivery from T Nagar" message bolder
- [x] Improve visibility and prominence of delivery info (added background, border, larger icon)


## Phase 44 - Branding, Admin Reorganization, New Features (Jan 5, 2026)

### Remove Moutan Branding
- [ ] Remove Moutan name and logo from header
- [ ] Remove Moutan from footer
- [ ] Display Taiwan Maami prominently throughout

### Admin Panel Reorganization
- [ ] Group related tabs into logical categories
- [ ] Create dropdown/submenu structure for cleaner navigation
- [ ] Reduce visual clutter in admin interface

### Store Credit Adjustment
- [ ] Add store credit field to customer edit dialog
- [ ] Allow admin to add/deduct store credit manually

### Quick Delivery Toggle
- [ ] Add one-click toggle in Site Settings to enable/disable all deliveries
- [ ] Useful for bad weather or staff shortages

### Customer Notes Field
- [ ] Add notes field to users table in database
- [ ] Add notes field to customer edit dialog
- [ ] Store special preferences or delivery instructions


## Phase 44 - Branding, Admin Reorganization & Customer Features (Jan 5, 2026)

### Remove Moutan Branding
- [x] Remove Moutan logo and name from header
- [x] Remove Moutan from footer
- [x] Keep only Taiwan Maami brand prominently displayed

### Reorganize Admin Panel
- [x] Group related tabs into dropdown menus
- [x] Menu group: Products, Categories, Add-ons
- [x] Orders group: All Orders, Tables, KOT Reports
- [x] Pricing group: Discounts, Bulk Pricing
- [x] Customers group: Customer List, Reviews, Complaints
- [x] Reports group: Analytics, Audit Log
- [x] Settings group: Site Settings, Bulk Upload

### Store Credit Adjustment
- [x] Add store credit field to customer edit dialog
- [x] Allow admin to manually add/deduct store credit

### Quick Delivery Toggle
- [x] Add on/off switch for delivery in Site Settings
- [x] Show prominent warning when delivery is disabled
- [x] Disable delivery radius input when delivery is off
- [x] Menu page shows "Delivery temporarily unavailable" when disabled

### Customer Notes
- [x] Add notes field to users table
- [x] Add notes textarea to customer edit dialog
- [x] Store special preferences, delivery instructions, etc.


## Phase 45 - Order Guidance, Alerts & Privacy (Jan 5, 2026)

### Fix Moutan Branding (Still Showing)
- [x] Moutan was already removed in code - issue was with published version
- [x] Code confirmed to have Taiwan Maami only

### Order Type Guidance
- [x] Add clear order type selector on homepage ("How Would You Like to Order?")
- [x] Guide customers to choose: In-store, Delivery, or Pickup
- [x] Make the three options prominent with icons and descriptions
- [x] Link each option to menu with pre-selected order type

### New Order Email Alerts
- [x] Send notification when new order is placed via Razorpay payment
- [x] Send notification for in-store guest orders (cash at counter)
- [x] Include order details: customer name, phone, amount, items
- [x] Uses built-in notifyOwner function to alert owner

### Privacy Policy Verification
- [x] Added Section 3 "Your Consent" with explicit consent language
- [x] Confirmed language about not sharing with external parties
- [x] Added mention of occasional promotional offers
- [x] Added "Our Promise" box about data storage and no spam


## Phase 46 - Fix Test Data Pollution (Jan 5, 2026)

### Critical: Test Data Polluting Production
- [x] Fix cms.test.ts creating "Test Category" and "Updated Category" in production
- [x] Ensure all tests clean up after themselves using afterAll hook
- [x] Using unique test prefix "__VITEST_TEMP__" that gets cleaned up automatically


## Phase 47 - Order Type UI Fixes (Jan 5, 2026)

### Order Type Tiles
- [x] Make all three order type cards equal height using flex layout
- [x] Fix Dine In-Store card being taller than others (shortened descriptions)

### Navigation Flow
- [x] Change "Order Now" button to scroll to order options section
- [x] Update Menu link in header to show order options first (/#order-options)
- [x] Ensure customers see the three options before menu


## Phase 48 - Order Type Indicator on Menu (Jan 5, 2026)

### Order Type Visual Indicator
- [x] Add order type selector/indicator at top of menu page
- [x] Show icons for In-Store, Delivery, Pickup with selected state
- [x] Allow customers to switch order type from menu page
- [x] Added prominent styling with scale effect on selected option


## Phase 49 - Palladium Pickup Restrictions & Prep Time (Jan 5, 2026)

### Palladium Pickup Availability
- [x] Add availableAtPalladium boolean field to products table
- [x] Add outlet selector when Pickup is chosen (Palladium vs T Nagar)
- [x] Grey out unavailable products at Palladium with "Not at Palladium" overlay
- [x] Add admin toggle in Products tab to control Palladium availability
- [x] Default: Iced Beverages, Mochis, Boba Crème Caramel = available; Food = not available

### Preparation Time Display
- [x] Show estimated times on order type selector cards
- [x] Dine In: 10-30 mins, Delivery: 30-60 mins, Pickup: 10-30 mins
- [x] Show specific estimate at checkout based on cart items
- [x] Drinks only = 10-15 mins, Food = 20-30 mins, Delivery adds time


## Phase 50 - Order Type Selector, Delivery Charges & Admin Tab Fix (Jan 5, 2026)

### Order Type Selector Fix
- [x] Make Dine In/Delivery/Pickup buttons clickable on menu page
- [x] Allow customers to change order type before checkout
- [x] Fixed useEffect overriding user selection from URL parameter

### Delivery Charges
- [x] Add delivery charge field to checkout for delivery orders
- [x] Delivery charges are actual Porter charges (no GST added)
- [x] Show message: "Delivery via Porter - charges will be added to your bill"
- [x] Updated both guest and logged-in checkout views

### Admin Tab Highlight Bug
- [x] Fix Menu dropdown staying highlighted when other tabs are selected
- [x] Ensure correct tab is highlighted based on active selection
- [x] Changed all dropdown buttons to use outline variant with transparent border


## Phase 51 - KOT Polling Automation & Invoice Printing Fix (Jan 5, 2026)

### KOT Polling Automation Script
- [x] Create standalone KOT polling script for Windows/Mac (taiwan-maami-printer.js)
- [x] Created simple batch/shell scripts (Start-Printer.bat, Start-Printer.command)
- [x] Created PRINTER-SETUP-SIMPLE.md with easy instructions
- [x] Script polls both KOT and Receipt queues

### Invoice Printing Issue
- [x] Investigated - receipt queue was NOT being populated after payment
- [x] Root cause: verifyPayment only created KOT, not receipt
- [x] Fixed: Added receipt queueing to verifyPayment procedure
- [x] Receipt now queues automatically alongside KOT after successful payment


## Phase 31 - Printer Script Fix & Admin Access (Jan 5, 2026)

### Admin Access
- [x] Grant Theresa Hu Cy (theresa.hu.cy@taiwanmaami.com) full admin access

### KOT Printer Script Fix
- [x] Fix API URL (changed from taiwanmaami.com to www.taiwanmaami.com)
- [x] Update secret key to correct value
- [x] Upgrade to ESC/POS thermal printer commands for proper formatting
- [x] Add node-thermal-printer library support for compact printing
- [x] Update setup documentation with new installation steps
- [x] Update Start-Printer.bat to auto-install printer library

### Dual KOT Printer Support
- [x] Update printer script to support multiple KOT printers
- [x] Configure Main Bill KOT (front) and Kitchen KOT (kitchen) printers
- [x] Print same KOT to both printers simultaneously


## Phase 32 - CMS, Staff Access & Approval Workflows (Jan 5, 2026)

### Content Management System
- [ ] Create CMS section in### CMS Content Management
- [x] Add CMS section in Admin panel
- [x] Add editable content for About Us
- [x] Add editable content for Terms & Conditions
- [x] Add editable content for Privacy Policy
- [x] Add editable content for Refund Policy

### Staff Access Controls
- [x] Test Employee Master API connection
- [x] Verify staff login via mobile number
- [x] Staff can take orders and collect payments
- [x] Staff can update order status

### Discount Authorization
- [x] Require admin PIN to apply discounts
- [x] Create PIN management for admins
- [x] Log discount authorizations

### Refund Approval Workflow
- [x] Staff can request refund (pending approval)
- [x] Admin sees pending refund requests
- [x] Admin can approve/reject refunds
- [x] Notify staff of approval decision


## Phase 33 - Enhanced CMS for Homepage Content (Jan 5, 2026)

### Feature Highlights Section
- [x] Make Feature Highlights editable (Premium Quality, Crafted Fresh, Quick Delivery)
- [x] Save Feature Highlights to database
- [x] Display saved Feature Highlights on homepage

### Hero Section
- [x] Make hero title editable
- [x] Make hero subtitle editable
- [x] Display saved hero content on homepage

### Category Cards
- [ ] Make category card titles editable
- [ ] Make category card descriptions editable


## Phase 34 - Complete CMS & Invoice Details (Jan 5, 2026)

### Category Cards Editing
- [ ] Add category card titles/descriptions to Site Settings
- [ ] Connect homepage category cards to database
- [ ] Allow editing of all 4 category cards

### Location Cards Editing
- [ ] Add location card details to Site Settings
- [ ] Connect homepage location cards to database
- [ ] Allow editing of both outlet locations

### Invoice/Receipt Company Details
- [x] Add GST number 33AAKCT4782H1Z1 to receipts
- [x] Add company name "Thamarai Foods and Trading Private Limited" to receipts
- [x] Update KOT printer script with company details
- [x] Update online order confirmation with company details


### Header Logo Update
- [x] Remove "Taiwan Maami" text from header
- [x] Make logo bigger
- [x] Use new logo image provided by user


## Phase 35 - Header, Footer, Social Links Updates

### Header Updates
- [ ] Make logo twice as big
- [ ] Make nav links (Menu, About Us, Locations) bolder
- [ ] Remove "Find Us" button from hero section

### Footer Restructure
- [ ] Remove logo and "Taiwan Maami" name from footer
- [ ] Remove "Authentic bubble tea..." tagline
- [ ] Add 5 social media buttons (Instagram, Threads, Facebook, X, YouTube)
- [ ] Consolidate Quick Links + Legal into one section
- [ ] Remove Customer Reviews link
- [ ] Remove Submit Feedback link
- [ ] Update contact email to hello@taiwanmaami.com

### Social Media Links
- Instagram: https://www.instagram.com/taiwan_maami/
- Threads: https://www.threads.com/@taiwan_maami
- Facebook: https://www.facebook.com/Taiwanmaami
- X: https://x.com/taiwanmaami
- YouTube: https://youtube.com/@theresahucy

### About Us Page
- [ ] Add Follow Us section with social media links
- [ ] Fix Locations link to scroll to outlets section on homepage

### CMS for Content Pages
- [ ] Add CMS editing for all Quick Links pages (Terms, Privacy, Refund Policy, FAQ)

- [ ] Add Franchise Opportunity page (CMS editable by Theresa)


## Phase 36 - Menu Restrictions by Outlet

### Palladium Outlet Restrictions
- [ ] Hide Food category for Palladium (instore, delivery, pickup)
- [ ] Hide Hot Beverages category for Palladium (instore, delivery, pickup)
- [ ] Only show these categories at T Nagar outlet


### Subcategory Outlet Availability
- [x] Add availableAtPalladium and availableAtTnagar fields to subcategories table
- [x] Add toggle switches in Admin Menu for each subcategory's outlet availability
- [x] Filter menu items based on subcategory outlet availability
- [x] Apply to instore, delivery, and pickup orders


## Phase 37 - Shipping Policy & Locations Fix
- [x] Add Shipping Policy to footer Quick Links
- [x] Add Shipping Policy page (CMS editable)
- [x] Fix Locations link on About Us page to scroll directly to outlets section


## Phase 38 - FAQ & Franchise CMS
- [x] Add FAQ to footer Quick Links
- [x] Add Franchise Opportunity to CMS Content Pages in Admin
- [x] Add Shipping Policy to CMS Content Pages in Admin
- [x] Ensure Theresa can edit all content pages from Admin


## Phase 39 - Fix Locations Link
- [x] Fix Locations link on About Us page to scroll directly to outlets section


## Phase 40 - Cache Control
- [x] Add cache-busting headers to HTML pages
- [x] Ensure browsers always fetch latest version


## Phase 41 - Performance Optimization
- [ ] Add lazy loading to all images
- [ ] Add lazy loading to videos
- [ ] Optimize image sizes with responsive srcset
- [ ] Add preload hints for critical resources
- [ ] Improve CDN caching headers


## Phase 49 - Performance Optimization: Lazy Loading (Jan 5, 2026)

### Image Lazy Loading
- [x] Add loading="lazy" and decoding="async" to Menu.tsx category images
- [x] Add loading="lazy" and decoding="async" to Menu.tsx subcategory images
- [x] Add loading="lazy" and decoding="async" to Cart.tsx cart item images
- [x] Add loading="lazy" and decoding="async" to Home.tsx CTA section image
- [x] Add loading="lazy" and decoding="async" to Admin.tsx product images
- [x] Add loading="lazy" and decoding="async" to MultiImageUpload.tsx
- [x] Add fetchPriority="high" to Header.tsx logo (above fold)
- [x] ProductCard.tsx already has lazy loading

### Video Lazy Loading
- [x] LazyVideo component uses IntersectionObserver for lazy loading
- [x] Videos only load when within 100px of viewport
- [x] Hero video uses preload="metadata" for faster initial load


## Phase 50 - Critical Bug Fix: OAuth Redirect for Public Visitors (Jan 5, 2026)

### Root Cause
- [x] Identified: Home.tsx was calling `trpc.admin.getSiteSettings.useQuery()` which requires admin authentication
- [x] This caused public visitors to be redirected to Manus OAuth when loading the homepage

### Fix Applied
- [x] Created new public endpoint `trpc.menu.getPublicSiteSettings.useQuery()` in routers.ts
- [x] Updated Home.tsx to use the public endpoint instead of admin endpoint
- [x] Verified fix works in dev preview - homepage loads without OAuth redirect


## Phase 51 - SEO Improvements (Jan 5, 2026)

### Meta Descriptions
- [x] Add meta description to homepage
- [x] Add meta description to menu page
- [x] Add meta description to about page
- [x] Add meta description to other public pages

### Robots.txt
- [x] Create robots.txt file
- [x] Block admin and staff pages from indexing
- [x] Allow all public pages

### Sitemap.xml
- [x] Create sitemap.xml with all public pages
- [x] Include homepage, menu, about, terms, privacy, etc.

### Structured Data (LocalBusiness Schema)
- [x] Add JSON-LD LocalBusiness schema for both outlets
- [x] Include address, phone, hours, cuisine type
- [x] Add Restaurant schema with menu link


## Phase 52 - Product Tile Fixes (Jan 5, 2026)

### Product Tile Sizing
- [ ] Investigate inconsistent tile sizes on menu pages
- [ ] Fix tiles to have uniform height/width
- [ ] Ensure responsive behavior is maintained

### Image Loading Speed
- [ ] Check current image loading implementation
- [ ] Investigate CDN configuration
- [ ] Optimize image loading for faster performance


## Phase 52 - Product Tile Fixes (Jan 5, 2026)

### Product Tile Sizing
- [x] Investigate inconsistent tile sizes on menu pages
- [x] Fix tiles to have uniform height/width using aspect-ratio: 3/4
- [x] Ensure responsive behavior is maintained

### Image Loading Speed
- [x] Check current image loading implementation
- [x] Investigate CDN configuration - CloudFront does not support image resizing without Lambda@Edge
- [x] Add fetchPriority="low" and contentVisibility="auto" for better browser optimization
- [ ] Future: Consider enabling CloudFront image optimization or using a third-party image CDN for true image resizing


## Phase 53 - Cloudinary Hybrid Image Optimization (Jan 6, 2026)

### Setup
- [x] Add Cloudinary credentials as secure environment variables
- [x] Create Cloudinary upload helper module

### Hybrid Upload System
- [x] Implement dual upload: Manus S3 (backup) + Cloudinary (delivery)
- [x] Update Admin panel image upload to use hybrid system
- [x] Ensure original high-res images saved to Manus S3

### Image Delivery Optimization
- [x] Create helper for responsive image URLs
- [x] Auto-optimize for mobile/tablet/desktop
- [x] Auto-convert to WebP/AVIF formats

### Testing
- [x] Test upload flow in Admin panel
- [x] Verify images saved to both Manus S3 and Cloudinary
- [x] Verify optimized delivery on menu pages


## Phase 54 - Bulk Image Migration to Cloudinary (Jan 6, 2026)

### Migration Script
- [x] Query all existing image URLs from database (products, categories, subcategories)
- [x] Create migration script to fetch images from S3 and upload to Cloudinary
- [x] Update database records with new Cloudinary URLs
- [x] Preserve original S3 URLs as backup reference
- [x] Test migration on a few images first
- [x] Run full migration for all 146 images (142 success, 3 skipped, 1 failed)


## Phase 55 - Quick Links Content Saving Bug Fix (Jan 6, 2026)

### Bug Report
- [ ] Investigate why quick links content is not saving from Admin panel
- [ ] Fix the saving issue
- [ ] Test that Theresa can manage content pages independently


## Phase 56 - CMS Content Pages Connection (Jan 6, 2026)

### Bug Fix - Pages not showing CMS content
- [ ] Create public CMS content endpoint for fetching page content
- [ ] Update Terms.tsx to fetch from CMS database
- [ ] Update Privacy.tsx to fetch from CMS database
- [ ] Update Refund.tsx to fetch from CMS database
- [ ] Update FAQ.tsx to fetch from CMS database
- [ ] Update Shipping.tsx to fetch from CMS database
- [ ] Update Franchise.tsx to fetch from CMS database
- [ ] Test all pages display CMS content correctly


## Phase 57 - CMS Content Pages Connection Fix (Jan 6, 2026)

### Bug Fix - Quick Links Content Not Saving
- [x] Identified issue: Content pages (Terms, Privacy, Refund, FAQ, Shipping, Franchise, About) were hardcoded, not connected to CMS database
- [x] Connected Terms.tsx to CMS database (trpc.cms.getContent)
- [x] Connected Privacy.tsx to CMS database
- [x] Connected Refund.tsx to CMS database
- [x] Connected FAQ.tsx to CMS database
- [x] Connected Shipping.tsx to CMS database
- [x] Connected Franchise.tsx to CMS database
- [x] Connected About.tsx to CMS database
- [x] All pages now fetch content from database and display dynamically
- [x] Theresa can now manage all content pages from Admin → Settings → Content Pages


## Phase 58 - CMS Rich Text Editor (Jan 6, 2026)

### Bug Fix - Content Formatting
- [ ] Add rich text editor (WYSIWYG) to Admin CMS content pages
- [ ] Install and configure TipTap or similar rich text editor
- [ ] Update content display pages to render HTML properly
- [ ] Test formatting on Terms, Privacy, Refund, FAQ, Shipping, Franchise, About pages
- [ ] Ensure Theresa can format content with headings, paragraphs, bold, lists, etc.


## Phase 59 - CMS Rich Text Editor & Auto-Formatting (Jan 6, 2026)

### Rich Text Editor
- [x] Install TipTap rich text editor
- [x] Create RichTextEditor component with formatting toolbar
- [x] Replace Textarea with RichTextEditor in Admin CMS
- [x] Add formatting options: bold, italic, underline, headings, lists, links

### Auto-Formatting for Existing Content
- [x] Create textToHtml utility for auto-formatting plain text
- [x] Update Terms, Privacy, Refund, FAQ, Shipping, Franchise, About pages
- [x] Handle numbered sections (1., 1.1, etc.)
- [x] Handle Q&A format
- [x] Handle general paragraph content with sentence pattern detection

## Phase 60 - Fix WYSIWYG Editor Display (Jan 6, 2026)
- [x] Remove auto-conversion from content pages (Refund, Terms, Privacy, FAQ, Shipping, Franchise, About)
- [x] Display HTML from WYSIWYG editor directly using dangerouslySetInnerHTML
- [x] Test Refund Policy page - now shows proper formatting with headings and paragraphs
- [x] Theresa can now use WYSIWYG editor to format content exactly as intended
