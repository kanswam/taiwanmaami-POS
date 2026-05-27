# Taiwan Maami - Project TODO
<!-- Last updated: 2026-03-11 Homepage Redesign + CMS -->

## Active Tasks

- [x] Fix workshop update procedure to accept Date objects for workshopDate and earlyBirdDeadline
- [x] Fix workshop_bookings table missing columns (recreated table with correct schema)
- [x] Fix workshop delete procedure (working - uses confirmation dialog)

- [x] Delete all test data from database (tables already empty)
- [x] Remove 'In-store & Pickup only' caption from Palladium Mall tile in Locations section

- [x] CRITICAL: Fix in-store orders defaulting to Palladium Mall instead of T Nagar
- [x] Remove Palladium Mall restriction notice from Menu page
- [x] Fix cart showing "Palladium Mall is closed" message for T Nagar customers

- [x] Delete test workshop data from database
- [x] Verify CRUD functionality for events in admin panel (added delete buttons)
- [x] Verify CRUD functionality for workshops in admin panel (added delete button)
- [x] Ensure Theresa and owner have admin access to manage events/workshops (admin role required)
- [x] Enhance event order items to link with menu products
- [x] Add customization/special instructions field to event order items
- [x] Build quotation PDF generation with company details and T&Cs
- [x] Build invoice PDF generation with payment terms
- [x] Add edit, regenerate, finalize workflow for quotes/invoices
- [x] Add quotation/invoice status tracking (draft, sent, approved, etc.)
- [x] Integrate event sales into Payment Report
- [x] Integrate workshop sales into Payment Report

- [x] Add cookie consent banner
  - [x] Create CookieConsent component with accept/decline buttons
  - [x] Link to Privacy Policy page
  - [x] Store consent in localStorage
  - [x] Only show on first visit

- [x] Fix product card images being cropped (Cloudinary crop mode changed from fill to limit)

- [x] Fix receipt printing after collect payment (queues receipt when order marked completed)
- [x] Add customer receipt download option on My Orders page (Download Receipt button)
- [x] Fix customer add-to-order flow (activeOrderId in CartContext, addItemsToOrder in Checkout)
- [x] Add staff ability to add items to customer orders (Add Items button in StaffOrders)

- [x] Add payment report to Admin panel
  - [x] Create backend procedure to fetch payments by date and method
  - [x] Build payment report UI with date filter and method breakdown
  - [x] Show payment screenshots in report (View button opens dialog)
  - [x] Add export/download option (CSV export)

- [x] Add payment screenshot/receipt capture for non-cash payments
- [x] Check mobile performance - optimized refresh interval from 10s to 15s, added staleTime
- [x] Delete Kannan's test orders from today (2 orders deleted)

- [x] Add payment method recording at collect payment stage
  - [x] Add paymentMethod field to orders table
  - [x] Add payment method selection dialog when completing in-store orders
  - [x] Options: Cash, GPay/UPI, Swiggy Dineout, Zomato Dineout, Card, Other

- [x] Fix Staff Orders page API errors - resolved (was temporary issue)

- [x] Add Staff Orders link to navigation menu for staff/admin users

- [x] Auto-grant staff access to Employee Master users
  - [x] Update all existing Employee Master emails to staff role
  - [x] Implement auto-grant on OAuth login if email matches Employee Master
  - [x] Protect admin users from being downgraded to staff

- [x] Build Staff Orders page with restricted access
  - [x] Add staff role to database schema (staff role already exists)
  - [x] Create staff-only procedures in routers.ts (staffProcedure)
  - [x] Build live order queue UI with auto-refresh every 10 seconds
  - [x] Add order status management (Pending → Confirmed → Preparing → Ready → Completed)
  - [x] Add filtering by order type, status, outlet
  - [x] Add sound/visual alerts for new orders (bell notification)
  - [x] Add KOT print button with print preview
  - [x] Add quick notes on orders (staffNotes field)
  - [x] Add daily order summary/count (completed, revenue, cancelled)

## Recently Completed

- [x] Fix page not scrolling to top when navigating on mobile (added ScrollToTop component)
- [x] Fix category tile text overflow on mobile (smaller text, line-clamp on mobile)

## Recently Completed

- [x] Preview Jost font (Futura-style) for user approval - APPROVED
- [x] Apply Jost font throughout website

## Completed (Recent)

- [x] Phase 61: Exact WYSIWYG Display - Content pages render HTML exactly as created in editor
- [x] Phase 60: Fixed WYSIWYG editor display - removed auto-conversion
- [x] Phase 59: CMS Rich Text Editor with TipTap
- [x] Phase 58: Connected all content pages to CMS database
- [x] Phase 54: Bulk image migration to Cloudinary
- [x] Phase 53: Cloudinary hybrid image optimization

## Bug Fix (May 13)

- [x] Fix: "Yesterday" date filter on admin orders page shows May 11 instead of May 12 (double-subtraction bug — client was subtracting 1 day AND server was subtracting 1 day)

## Notes

- Full project history archived to /home/ubuntu/taiwan-maami-archive/
- KOT printer scripts kept in root for easy access by staff
- Documentation for printer setup kept in root and docs/

- [x] Improve product image visibility
  - [x] Add prominent full image view in ProductCustomizationModal
  - [x] Make image gallery/carousel more visible
  - [x] Changed modal to show full product image at top with navigation arrows

- [x] Redesign product cards for better image focus
  - [x] Remove + button (clicking card opens modal)
  - [x] Remove white frame/padding at top
  - [x] Make image larger and more prominent (1:1 square aspect ratio)
  - [x] Move name and price to compact white section below image with proper contrast

- [x] Remove all Manus platform references from website
  - [x] Renamed ManusDialog to LoginDialog with generic text
  - [x] Changed localStorage key from manus-runtime-user-info to app-user-info
  - [x] Video CDN URLs kept (not visible to customers in UI)

- [x] Remove all Manus platform references from website
  - [x] Renamed ManusDialog to LoginDialog with generic text
  - [x] Changed localStorage key from manus-runtime-user-info to app-user-info
  - [x] Video CDN URLs kept (not visible to customers in UI)

- [x] Create infrastructure documentation
- [x] Fix page refresh/flash issue on load (cart hydration fix)
- [x] Package and share complete codebase

- [x] Fix subcategory availability not being respected for delivery/pickup
- [x] Add staff ability to toggle subcategory availability (Staff Orders > Availability tab)

- [ ] Fix customer list to exclude staff/admin users
- [ ] Fix stamp calculation to be 1 stamp per ₹450 spent

- [x] Fix customer list to exclude staff/admin users (Boichong onwards are staff)
- [x] Stamp calculation verified correct (1 per ₹450 + welcome stamp for first order)
- [x] Update Iced Beverages tile video with Moutan-FaloodaTea.mov
## Content Updates (Jan 7)

- [x] Update Our Story text
- [x] Rename "What We Offer" to "Taiwan Maami is famous for" with new tile content
- [x] Fix footer links to show on all pages (created shared Footer component)
- [x] Replace "Ready to Order" with "Join our Loyalty Programme" section
- [x] Add running banner ticker above logo on landing page
- [x] Add loyalty programme reminder at checkout for guest users

## SEO Fixes (Jan 7)

- [x] Reduce keywords from 9 to 6 focused keywords
- [x] Shorten meta description from 169 to 131 characters

## Bug Fixes (Jan 7)

- [x] Fix add-ons not being saved to order_item_addons table when placing orders
  - Root cause: productAddons (e.g., eggs for food items) were not being merged with addons array in Checkout.tsx
  - Fixed in 3 places: guest checkout, logged-in checkout, and addItemsToOrder
- [x] Ensure add-ons display on order confirmation page (updated getOrderItems to include addons)
- [x] Ensure add-ons display on KOT print (KOT already includes addons from input.items)

## Business Hours Enforcement (Jan 8)

- [x] Update business hours: Palladium 10AM-10PM, T Nagar 12PM-12AM
- [x] Make ordering restriction outlet-specific
- [x] Last order times: Palladium online 9:45PM, in-store 10PM; T Nagar both 11:45PM
- [x] Added isOutletOpen() function for outlet-specific hour checks
- [x] Updated Cart.tsx and Checkout.tsx to use outlet-specific hours
- [x] All 16 unit tests passing

## Order Modification Feature (Jan 8)

- [x] Add status, cancelledAt, cancelledBy, cancellationReason columns to order_items table
- [x] Create cancelOrderItem backend procedure with dine-in validation
- [x] Update Staff Orders interface with cancel button and dialog (dine-in only)
- [x] Add customer-side cancel for dine-in orders in OrderConfirmation page
- [x] Display cancelled items with strikethrough and "Cancelled" badge
- [x] Recalculate order totals when items are cancelled
- [x] Show cancellation reason on cancelled items
- [ ] Update Admin interface with cancel button (dine-in only)

## Order Modification Next Steps (Jan 8)

- [x] Add cancel button to Admin Orders interface (dine-in only)
- [x] Create supplementary KOT for cancelled items to notify kitchen
- [x] Add refund/credit tracking columns to orders table
- [ ] Show refund options (store credit or refund) for cancelled items in UI
- [ ] Track which items were refunded and the refund amount

## Bug Fixes (Jan 8 - Evening) - CRITICAL

- [x] Add Items button not displaying in Staff Orders page
  - Fixed: Created new AddItemsDialog component with product search
- [x] Add Items dialog missing product customization
  - Fixed: Integrated ProductCustomizationModal for full variant selection
  - Staff can now select eggs, size, sugar level, ice level, boba, etc. before adding items

## Permission Fixes (Jan 8 - Evening)

- [x] Fix order modification permissions
  - Changed cancelOrderItem from protectedProcedure to staffProcedure
  - Removed cancel button from customer-facing OrderConfirmation page
  - Staff and Admin can still cancel items in Staff Orders and Admin Orders tabs
  - Customers can only add items to active dine-in orders, not cancel or modify

## Bug Fixes (Jan 8 - Late Evening)

- [x] Fix duplicate order creation on double-click
  - Root cause: Form submission could be triggered twice if user double-clicked submit button or on slow connections
  - Added submissionLockRef using useRef to prevent multiple simultaneous submissions
  - Lock is set immediately on form submission and only released on error
  - Applied to both handleSubmit (logged-in) and handleGuestSubmit (guest checkout)
  - Prevents race conditions and duplicate order creation

## Bug Fixes (Jan 9 - Morning)

- [x] Fix order list sorting in Admin Orders tab
  - Root cause: Orders were sorted by createdAt instead of orderNumber
  - Orders 00029 and 00030 appeared at top due to recent recreation timestamp
  - Changed sorting to use numeric orderNumber DESC
  - Orders now display in correct sequence

## Order Recovery (Jan 9)

- [x] Restore order 00029 with complete order details from receipt
  - Status: completed, Payment: cash (completed)
  - Date: 9/1/2026, 3:42:02 PM
  - All 5 items restored with correct prices
  - Subtotal: ₹2105.00, SGST: ₹52.63, CGST: ₹52.63, Total: ₹2210.26
- [x] Create order 00030 as cancelled duplicate
  - Created with status: cancelled, paymentStatus: completed, paymentMethod: cash
  - Total: ₹2105

## Features to Implement (Jan 9)
## Features Implemented (Jan 9 - Evening)

- [x] Add "Collect Payment" button to Staff Orders page
  - Added updatePaymentStatus mutation to trigger receipt printing
  - Button appears for in-store orders with pending payment
  - Same functionality as Admin page button
  - Receipt automatically queues for printing when payment collected
- [x] Fix receipt template to include GST in TOTAL
  - Fixed printer field names: stateGst, centralGst, totalAmount
  - Receipt now correctly prints TOTAL = Subtotal + SGST + CGST
  - Updated taiwan-maami-printer.js to use correct field mappings
  - Root cause was field name mismatch between database and printer
- [x] Implement end-of-day reconciliation report
  - Added reconciliation.getEndOfDayReport procedure
  - Generates daily summary with total orders, cash/online split
  - Calculates total subtotal, GST, and amounts collected
  - Identifies discrepancies where totalAmount != subtotal + GST
  - Admin can query by date to track financial accuracy


## Critical UI Fixes (Jan 9 - Late Evening)

- [x] Disable action buttons for completed orders
  - Completed orders now only show "Print Receipt" button
  - "Collect Payment", "Add Items", "Discount" buttons are hidden
  - Prevents duplicate receipt printing and accidental modifications
  - Applied to both Admin and Staff Orders pages
- [x] Disable action buttons for cancelled orders
  - Cancelled orders now only show "Print Receipt" button
  - "Collect Payment", "Add Items", "Discount" buttons are hidden
  - Prevents mistaken modifications to closed orders
  - Applied to both Admin and Staff Orders pages


## Features to Implement (Jan 9 - Evening)

- [ ] Add order modification audit log
  - Create orderAuditLog table to track all modifications
  - Log who made changes, when, and what changed
  - Track payment collection, item additions, cancellations
  - Use for compliance and dispute resolution
- [ ] Implement order lock mechanism
  - Automatically lock orders 24 hours after completion
  - Prevent any modifications to locked orders
  - Show "Locked" status on locked orders
  - Admin can manually unlock if needed
- [ ] Create staff action history widget
  - Display recent actions on admin dashboard
  - Show payments collected, items added, cancellations
  - Include staff member name, timestamp, order number
  - Track accountability and staff performance


## CRITICAL - Razorpay Integration Fix (Jan 10)

- [x] Fix Razorpay order number integration
  - [x] Updated frontend to pass orderNumber to createPaymentOrder
  - [x] Updated backend to accept and use orderNumber
  - [x] Now passes correct order number (00039) instead of internal ID (870005) to Razorpay
  - [x] Order number now appears in Description and Notes fields in Razorpay dashboard

## URGENT - KOT Printing Issue (Jan 10)

- [x] Fix KOT printing failure for Order 36
  - [x] Added reprintKot mutation to backend
  - [x] Added Reprint button to Admin Orders page

## CRITICAL - Business Logic Issues (Jan 10)

- [x] Pickup option restored for T.Nagar
- [x] Table number requirement added for dine-in orders
- [x] Loyalty stamp backend implemented (1 per ₹450)
- [x] Fix location restrictions - Palladium should NOT show any order options
  - [x] Added visible Palladium restriction notice on menu page
  - [x] Shows message when user selects Dine In or Pickup
- [x] Verify table number requirement is actually forcing customers to enter it
  - [x] Added visible table number input field to guest checkout form
  - [x] Added visible table number input field to logged-in checkout form
  - [x] Field now prominently displayed (was only showing as toast error)
- [x] Investigate pricing anomalies - Rocher Mochi showing ₹550 instead of ₹270 on some invoices
- [x] Check all Rocher Mochi orders for pricing consistency

## Priority Features (Jan 10)

- [ ] Delivery distance validation (10km radius check with popup)
- [ ] Payment method selection for dine-in orders (UPI, Card, GPay, Zomato, Swiggy, EazyDiner)
- [ ] Login prompt for loyalty stamps before checkout
- [ ] Soft warning for dine-in orders after 11:45 PM (not blocking)


## Events & Workshops Feature (Jan 13)

### Database Schema
- [x] Add event_inquiries table to database schema
- [x] Add event_orders table to database schema
- [x] Add event_order_items table for line items
- [x] Add workshops table to database schema
- [x] Add workshop_bookings table for ticket purchases

### Event Inquiry System
- [x] Create event inquiry form on Events page
- [x] Build inquiry submission backend procedure
- [x] Capture: name, company, email, phone, event type, guests, date, time, venue
- [x] Capture: catering type (bubble tea/food/both), budget, preferred items, special requirements
- [x] Show confirmation to customer after submission

### Event Order Management (Admin)
- [x] Create admin event inquiries list view
- [x] Build event order builder with manual pricing
- [x] Add beverages/food items with custom prices
- [x] Add additional charges (staff, delivery, equipment)
- [x] Calculate totals with GST and discounts
- [ ] Generate PDF quote for customer (future enhancement)

### Workshop Ticketing System
- [x] Create workshop listing component with inventory display
- [x] Build workshop detail modal
- [x] Implement ticket booking flow (quantity → attendee info → payment)
- [x] Add Razorpay integration for workshop tickets
- [x] Implement sold-out logic and inventory management
- [ ] Send confirmation email with ticket (future enhancement)

### Admin Workshop Management
- [x] Create workshop CRUD interface
- [x] View workshop bookings
- [x] Track ticket sales and capacity

### Events Page UI
- [x] Create Events page with showcase section
- [x] Add past events gallery
- [x] Add event inquiry form section
- [x] Add upcoming workshops section
- [x] Add link to Events page in landing page navigation
- [x] Add Events link to header navigation
- [x] Add Events link to footer

### Testing
- [x] Write Vitest tests for events and workshops functionality (12 tests passing)

### Events Page Content Update (Jan 13)
- [x] Read EventPage.docx for exact wording
- [x] Upload wedding event photo to Cloudinary
- [x] Upload corporate event photo to Cloudinary  
- [x] Upload school event photo to Cloudinary
- [x] Update Events page with document content
- [x] Add real event photos to past events gallery
- [x] Test Events page displays correctly

### Events Page Redesign (Jan 13)
- [x] Fix wedding/corporate photo mix-up (swap images)
- [x] Add hero carousel with beverage and food product photos
- [x] Improve overall visual design and layout
- [x] Make page more impressive and attractive

### Events Page Fixes (Jan 13)
- [x] Correctly swap wedding/corporate photos (wedding=colorful buffet saree, corporate=yellow kurta bubble tea)
- [x] Update stats to realistic numbers (5+ events, 5,000 guests)

### Remove Palladium References (Jan 13) - CRITICAL
- [x] Update all orders in database from Palladium to T Nagar (orders use outletId, display changed to always show T Nagar)
- [x] Remove Palladium delivery message from codebase
- [x] Remove Palladium from outlet options in Payment Report filter
- [x] Remove Palladium hours from Footer and Home page
- [x] Remove Palladium location card from About page
- [x] Remove Palladium from index.html meta tags and structured data
- [x] Remove Palladium phone from Complaint page


### CORRECTION: Restore Palladium Outlet Info (Jan 13)
- [x] Rolled back to checkpoint 69ad9e03 with Palladium info intact
- [x] Updated Payment Report filter to only show T Nagar orders (website transactions are T Nagar only)
- [x] Updated all orders in database to outletId=2 (T Nagar)
- [x] Palladium outlet info remains on About page, Footer, index.html, Complaint page
- Note: Palladium Mall outlet is still operational, only this website's transactions are from T Nagar

### Add Palladium Hours (Jan 13)
- [x] Add Palladium hours (10am-10pm) to Footer Hours section
- [x] Add Palladium hours to Home page Hours section

### Events & Workshops Admin Interface (Jan 13)
- [x] Add tRPC procedures for event inquiries (list, update status, add notes) - ALREADY EXISTS
- [x] Add tRPC procedures for event orders (create, list, update) - ALREADY EXISTS
- [x] Add tRPC procedures for workshops (CRUD operations) - ALREADY EXISTS
- [x] Add tRPC procedures for workshop bookings (list, update status) - ALREADY EXISTS
- [x] Add Events & Workshops tab to Admin navigation
- [x] Create Event Inquiries management UI
- [x] Create Event Orders/Quotes management UI
- [x] Create Workshops management UI (create, edit, pricing, capacity)
- [x] Create Workshop Bookings management UI
- [x] Write Vitest tests for new functionality (tests written, requires db schema sync)

### About Us Page Fix & Order Cleanup (Jan 13)
- [x] Add Palladium location card back to About Us page
- [x] Delete test orders 66 and 67 from database

### About Us Page Map Directions (Jan 13)
- [x] Add map directions links to location cards (like landing page)
- [x] Update Palladium phone number to +91 89259 14303

### Workshop Creation Error Fix (Jan 13)
- [ ] Fix database insert error for workshops (column mismatch)
- [ ] Provide stable version before Events & Workshops addition

### Workshop Creation Error Fix (Jan 13)
- [x] Fix database insert error for workshops (column mismatch)
- [x] Fixed Date object rendering in React (workshopDate instanceof Date check)
- [x] Workshop creation now working (test workshop "Bubble Tea Making Workshop" created successfully)
- Note: Stable version before Events & Workshops is f09824c8 (kept for reference)

### Fix Payment Report Outlet Filter (Jan 14) - PERMANENT FIX
- [ ] Update ALL orders in database to outletId=2 (T Nagar) so T Nagar filter matches All Outlets

- [x] CRITICAL: Fix React error #31 - Date serialization issue in workshop data

- [x] URGENT: Investigate KOT printing issue - Order 82 KOT queued but not printing
  - Root cause: orders.create procedure for logged-in users didn't auto-queue KOT for in-store orders
  - Fixed: Added automatic KOT queuing for in-store orders in orders.create
  - Manually queued KOT for Order 82

- [x] Fix KOT to include item-level special instructions (e.g., "No garlic")
  - Code already includes specialInstructions in KOT data (line 308 in routers.ts)
  - Printer client already handles item.specialInstructions (line 160-164 in kot-printer-client.mjs)
  - Order 84 issue was due to manual queue not including the data

- [x] CRITICAL: Ensure KOT printing works 100% of the time for all in-store orders
  - [x] Audit all order creation paths (found 2: orders.create and guest.createOrder)
  - [x] Fixed guest.createOrder to queue KOT for ALL in-store orders (not just cash_at_pickup)
  - [x] Added error handling with owner notification if KOT queuing fails
  - [x] Tested and verified - Order 83 printed with special instructions correctly

- [x] Fix workshop visibility - published workshop not showing on Events page
  - [x] Added prominent workshop announcement banner on homepage (orange gradient, shows date/time/spots)
  - [x] Fixed Events page to use correct field names (workshopDate, maxCapacity, startTime, endTime)
  - [x] Workshop now displays correctly with all details (date, time, venue, instructor, price, seats)

  - [ ] Link to workshop details page

## Workshop Display Improvements (Jan 15)

- [x] Move workshop banner above "Crafted Daily" hero section for more prominence
- [x] Fix banner link to auto-scroll to #workshops section on page load
- [x] Display full workshop details on Events page (description, venue, instructor, pricing)


## Workshop Booking System (Jan 15)

- [x] Clean up workshop card UI - remove broken image/link, center content prominently
- [x] Implement booking form - collect customer name, mobile, email
- [x] Integrate Razorpay payment with early bird/regular pricing based on deadline
- [x] Generate invoice PDF after successful payment (stored in S3)
- [x] Track bookings in real-time and update remaining slots (bookedCount updated on payment)
- [x] Close booking automatically when max capacity is reached (shows SOLD OUT badge)


## BUG FIX - Order Total Missing GST (Jan 15)

- [x] Fixed guest order totalAmount calculation in backend (was missing GST)
  - Changed `subtotal + deliveryCharge` to `subtotal + gstDetails.total + deliveryCharge`
- [x] Fixed all affected orders in database (orders 72-84 that had incorrect totalAmount)
  - Updated totalAmount = subtotal + stateGst + centralGst for all affected orders
- [x] Payment collection was always correct (Razorpay charged correct amount)
  - The bug was in how totalAmount was stored in database
  - UI was correctly displaying the (incorrect) database value

Orders fixed:
- Order 84: ₹1120 → ₹1176
- Order 83: ₹230 → ₹241.50
- Order 82: ₹1260 → ₹1323
- Order 78: ₹1320 → ₹1386
- Order 77: ₹2645 → ₹2777.26
- Order 76: ₹2085 → ₹2189.26
- Order 74: ₹840 → ₹882
- Order 73: ₹405 → ₹425.26
- Order 72: ₹360 → ₹378

- [x] Fixed Admin UI to show lineTotal (includes add-ons) instead of unitPrice × quantity
  - Order 79 was correct (₹845) - the Iced Black Americano had a ₹40 add-on

## BUG FIX - Delivery Charges (Jan 16)

- [x] Fix receipt template to show delivery charge as visible line item
  - Fixed receipt-printer-client.mjs to handle both field name formats (sgst/cgst vs stateGst/centralGst, total vs totalAmount)
- [x] Fix automatic ₹100 delivery charge for future delivery orders
  - Updated logged-in user order creation (line 212)
  - Updated guest order creation (line 2850)
  - Changed from ₹50 to ₹100 (10000 paise)

## Features & Fixes (Jan 16)

- [ ] Fix Order 88 payment method to show "Razorpay" instead of "Not Recorded"
- [ ] Add sortable columns to Customer Database (Name, Orders, Total Spent, Stamps, Last Order)
- [ ] Implement free delivery for orders above ₹2500

## Features & Fixes (Jan 16 - Afternoon)

- [x] Fix Order 88 payment method to show Razorpay (was showing "Not Recorded")
  - Added 'razorpay' to paymentMethod enum in database
  - Updated Order 88 paymentMethod to 'razorpay'
- [x] Add sortable columns to Customer Database
  - Can now sort by: Name, Orders, Total Spent, Stamps, Last Order
  - Click column header to sort, click again to reverse order
- [x] Implement free delivery for orders above ₹2500
  - Both logged-in and guest orders now get free delivery when subtotal ≥ ₹2500
  - Orders below ₹2500 still have ₹100 delivery charge

## Staff Orders - Razorpay Payment Indicator (Jan 16)

- [x] Add prominent payment indicator on Staff Orders page for Razorpay orders
  - Shows "✅ Paid (Razorpay)" green badge for Razorpay orders
  - Shows "💰 Pay at Counter" amber badge for in-store pending payment orders
  - Staff can immediately see which orders are pre-paid vs need payment collection


## Workshop Image Display Fix (Jan 16)

- [x] Fixed workshop image not showing on Events page
  - The imageUrl was stored correctly in database but not rendered in the card
  - Added image display at top of workshop card with proper aspect ratio
  - Shows "SOLD OUT" overlay on image if workshop is sold out


## BOBALOVE10 Discount Code (Jan 16)

- [x] Create BOBALOVE10 discount code in database
  - 10% discount
  - First-time registered customers only (firstTimeOnly=true)
  - Delivery orders only (orderTypeRestriction='delivery')
  - One use per customer (tracked via discount_usage table)
  - Max discount cap: ₹500
- [x] Added validation logic in backend:
  - Checks if user has used this discount before
  - Checks if user has any previous orders (must be first-time customer)
  - Checks if order type matches restriction (delivery only)
- [x] Records discount usage after successful order creation
- [x] Updated Cart.tsx to pass orderType to discount validation


## UI Improvements (Jan 16 - Afternoon)

- [x] Add BOBALOVE10 discount banner at checkout for first-time delivery customers
  - Shows "🎉 First Delivery Order? Use code BOBALOVE10 for 10% off!" in Order Summary
- [x] Fix Customer Database sorting for all columns (Name, Orders, Stamps, Last Order)
  - All columns now sortable with click-to-sort functionality
- [x] Show delivery charge in cart summary
  - Shows "Delivery: ₹100" for orders under ₹2500
  - Shows "Delivery: FREE" for orders ₹2500+
  - Note at bottom: "Free delivery on orders above ₹2500. ₹100 delivery charge applies."


## Cleanup & Workshop Video (Jan 16)

- [x] Delete test data from production database (no test data found)
- [x] Update workshop to use video URL instead of image
  - Updated database with video URL: https://res.cloudinary.com/drpu1dbqk/video/upload/v1768559062/Taiwan_Maami_workshop_wujpzy.mp4
- [x] Implement lazy loading for workshop video
  - Video auto-plays, loops, muted with preload="metadata" for lazy loading
  - Falls back to image display for non-video URLs


## Workshop Multi-Date & Sorting Fix (Jan 16)

- [ ] Fix Customer Database sorting - all columns must be clickable and sortable
- [ ] Add workshop_dates table for multiple dates per workshop
- [ ] Create 4 workshop dates: Feb 7, 14, 21, 28 with 8 capacity each
- [ ] Update Events page UI with date selection dropdown
- [ ] Update booking flow to select specific date
- [ ] Track bookings per date (not just per workshop)

## Workshop Multi-Date Selection System (Jan 16)

- [ ] Implement multi-date workshop system for "Biang Biang Noodles Workshop"
  - [ ] Create workshop_dates table for storing multiple dates per workshop
  - [ ] Add date selection dropdown in booking flow
  - [ ] Track capacity and bookings per date (8 per date)
  - [ ] Update workshopBookings to reference specific date
  - [ ] Update Admin panel to show bookings by date
  - [ ] Dates: Feb 7, 14, 21, 28 (2026)


## Workshop Multi-Date Selection (Jan 16) - COMPLETED
- [x] Create workshop_dates table in database
- [x] Add workshopDateId column to workshop_bookings
- [x] Insert 4 dates for Feb 7, 14, 21, 28 with 8 capacity each
- [x] Add getWorkshopDates backend route
- [x] Update bookTickets to accept workshopDateId
- [x] Update verifyPayment to increment date-specific booked count
- [x] Add date selection dropdown to Events page booking dialog
- [x] Update Admin panel to show bookings grouped by date
- [x] Test complete booking flow - verified working


## Workshop Booking Enhancements (Jan 16) - COMPLETED
- [x] Create workshop_waitlist table in database
- [x] Add joinWaitlist backend route
- [x] Add getWaitlistPosition backend route
- [x] Create waitlist UI for sold-out dates
- [x] Add "Add to Calendar" feature (Google Calendar, Apple Calendar, ICS download)
- [x] Add T&Cs link to booking dialog
- [x] Add refund policy notice: "Full refund provided for cancellation 48 hours before start of workshop only"
- [x] Update booking success dialog with calendar options


## Bug Fix - Duplicate KOT Printing (Jan 16)

- [x] Fix duplicate KOT printing for in-store orders
  - Root cause: KOT queued twice - once in backend orders.create, once in frontend createKotForInstore call
  - Solution: Removed redundant createKotForInstore call from Checkout.tsx


## Cancellation Policy Update (Jan 16)

- [x] Update cancellation policy from 48 hours to 72 hours before workshop start


## Workshop UI Fixes (Jan 16)

- [x] Update workshop banner to show multiple dates (Feb 7, 14, 21, 28) instead of single date
- [x] Fix booking popup dialog to be scrollable so users can see full content


## CRITICAL Bug Fixes (Jan 16 - Evening)

- [x] Fix Razorpay payment method not being recorded (Order 90 shows "Not Recorded")
  - Root cause: orders.verifyPayment was not updating paymentMethod, razorpayOrderId, razorpayPaymentId on orders table
  - Fixed: Added these fields to the update statement
- [ ] Fix receipt to show delivery charge as line item (currently missing from printed receipt)
  - Note: Backend sends deliveryCharge correctly in receipt data
  - Issue is in the PRINTER SOFTWARE (desktop app) - not rendering the deliveryCharge field
  - Printer software needs to be updated to display deliveryCharge line item


## Bug Fix - Workshop Booking Amount Display (Jan 17)

- [x] Fix workshop booking amount showing ₹28.80 instead of ₹2,880
- [x] Delete test booking data (John Doe, Test Customer)

## Workshop Booking Management Features (Jan 17)

- [x] Add Razorpay order ID to admin booking view (shows payment ID if exists)
- [x] Add Cancel Booking button to release unpaid spots
- [x] Add time since booking display to identify stale bookings (highlights unpaid >2hrs in red)
- [x] Capacity logic already correct - only counts paid bookings (bookedCount incremented only after payment verified)


## Workshop Booking Display Fixes (Jan 17)

- [x] Add Date column showing which workshop session date was booked
- [x] Ensure Cancel booking button (X) is visible in Actions column
- [x] Ensure "No payment" warning shows under Pending status
- [x] Add time since booking with stale unpaid booking warning
- [ ] Publish changes to production


## CRITICAL BUG - T.Nagar Dine-in Orders Blocked (Jan 17)

- [x] Fix checkout form validation blocking T.Nagar dine-in orders
  - Root cause: Production site not published with latest code
  - Old code had Select dropdown for Preferred Time that was incorrectly required
  - Current code uses Input type="datetime-local" which is optional
- [x] Customer seeing "Please fill in this field" error - FIXED (need to publish)
- [x] Investigated - NOT related to Palladium closure, just unpublished code

## Skip Scheduling Button (Jan 17)

- [x] Add "Prepare Now" / "Schedule Later" toggle buttons to checkout form
- [x] Make it clear that time field is optional - datetime picker only shows when Schedule Later is selected
- [x] Added helpful text: "Your order will be prepared immediately after payment" or "at the scheduled time"

## Product Modal Scroll/Close Bug (Jan 18)

- [x] Fix product modal not scrolling properly for Sweet Pillow Brioche items
- [x] Ensure close button (X) is visible and accessible - Added custom close button with dark background that floats over the image
- [x] Modal content scrollable with max-h-[90vh] overflow-y-auto

## Custom Item Addition for Staff Orders (Jan 18)

- [x] Add "+ Custom" button to Staff Orders page (next to Add Items button)
- [x] Allow staff to enter custom item name (e.g., "Extra Egg")
- [x] Allow staff to enter custom price (e.g., ₹25)
- [x] Allow staff to enter quantity and optional notes
- [x] Custom items appear in order with "[Custom]" prefix
- [x] Custom items tracked in order data and KOT printed
- [x] Order totals automatically recalculated with GST


## Bug Fix - Receipt Showing Cancelled Items (Jan 18)

- [x] Fix tax invoice to exclude cancelled items from printed receipt
- [x] Order 110: Cinnamon Vanilla Assam was cancelled but still showed on invoice
- [x] Total was correct but item list should not include cancelled items
- [x] Fixed both receipt queue and KOT reprint to filter out cancelled items

## Bug Fix - Loyalty Stamps on Cancelled Orders (Jan 18)

- [ ] Remove loyalty stamps from cancelled orders (e.g., Rangan Swamy)
- [ ] Fix order cancellation logic to deduct stamps when order is cancelled
- [ ] Cancelled orders should not carry loyalty stamps

## Bug Fix - Loyalty Stamps on Cancelled Orders (Jan 18)

- [x] Cancelled orders should not carry loyalty stamps
- [x] Rangan Swamy's stamps from cancelled order - manually reset to 0
- [x] Added automatic stamp deduction when order is cancelled
- [x] Deduction recorded in stamp_transactions table with 'deduct' action


## Automated Database Backup System (Jan 18)

- [ ] Create backup script to export all tables to JSON
- [ ] Integrate with S3 storage for backup file storage
- [ ] Implement 90-day retention with auto-cleanup of old backups
- [ ] Add email notifications for backup success/failure
- [ ] Create admin UI for manual backup trigger
- [ ] Create admin UI to view backup history and download backups
- [ ] Set up scheduled daily backup at 4:00 AM IST
- [ ] Test backup and restore process


## Automated Database Backup System (Jan 18) - COMPLETED

- [x] Create backup script with S3 storage
- [x] Export all critical tables (18 tables including orders, customers, payments, products, etc.)
- [x] Add email notifications for backup success/failure (notifies owner)
- [x] Create admin UI with "Backup Now" button in Settings > Database Backup
- [x] Show backup history with download links and error viewing
- [x] Set up daily scheduled backup at 4:00 AM IST
- [x] Implement 90-day retention with auto-cleanup
- [x] Test backup: 739 rows, 573.7 KB, 18 tables - SUCCESS


## Backup System Expansion (Jan 18)

- [x] Create content_pages table for T&Cs, Privacy Policy, and other policy documents
- [x] Extend backup to include all 45 database tables (was 18)
- [x] Add addresses, discounts, discount_usage, store_locations, outlet_products
- [x] Add site_settings, complaints, refund_requests, guest_orders
- [x] Add addon mappings, customization_options, audit logs
- [x] Test expanded backup - 1,602 rows, 1.23 MB verified


## One-Click Database Restore (Jan 19)

- [x] Create restore function in backup.ts to import JSON data back to database
- [x] Add restore API endpoint with admin authentication
- [x] Add Restore button to backup history in Admin UI
- [x] Add confirmation dialog requiring typed "RESTORE" confirmation
- [x] Auto-create backup before restore for safety
- [x] Send email notification on restore completion
- [x] Add vitest tests for restore functionality
- [x] Update backup_logs schema to include 'restored' status

## KOT Printer Configuration - Palladium Mall (Jan 19)

- [x] Configure Palladium KOT printer (IP: 192.168.0.115, Name: BILL)
- [x] KOT print triggers:
  - [x] Delivery: After Razorpay payment success
  - [x] In-Store (Pay at Counter): Upon order confirmation
  - [x] In-Store (Razorpay): After Razorpay payment success
  - [x] Pickup (any payment): Upon order confirmation
- [x] Tax Invoice: Print after order marked Completed
- [x] Created kot-printer-palladium.mjs client
- [x] Created receipt-printer-palladium.mjs client
- [x] Created Windows batch files for auto-start
- [x] Created PALLADIUM-PRINTER-SETUP.md guide

## Outlet-Based Order Flow (Jan 21)

- [x] Order type selection flow:
  - [x] Customer selects order type first (Dine-in, Pickup, Delivery)
  - [x] Delivery → Automatically T. Nagar (no outlet choice)
  - [x] Dine-in/Pickup → Show outlet selection (T. Nagar or Palladium)
- [x] Menu filtering by outlet:
  - [x] Products filtered by availableAtPalladium/availableAtTnagar fields
  - [x] Subcategories filtered by outlet availability
  - [x] Added availableAtTnagar column to products table
- [x] KOT routing:
  - [x] KOT prints ONLY at selected outlet
  - [x] outletId passed from frontend to backend
  - [x] KOT queue uses correct outletId (1=Palladium, 2=T.Nagar)

## Data Cleanup & UX Fix (Jan 21)

- [x] Delete all test data from the system (132 orders, 318 order items, 150 KOT queue, 140 receipt queue)
- [x] Force outlet selection first for Dine-in/Pickup before showing menu
  - Added modal dialog that appears when clicking Dine In or Pickup
  - Customer must select outlet (Palladium Mall or T. Nagar) before viewing menu

## Production Data Safeguards (Jan 21) - CRITICAL

- [x] Add isTestData flag to orders table (and order_items)
- [x] Create safe delete function that only deletes test data (server/safeDelete.ts)
- [x] Set up automated 4 AM daily backup (scheduled task)
- [x] Email notification when backup completes (via notifyOwner)
- [x] Require confirmation code "DELETE_TEST_DATA" before any delete
- [x] Auto-backup before any delete operation
- [x] Keep 90 days of backup history
- [x] Added admin endpoints: safeDeleteTestData, markOrdersAsTestData, checkDataStatus

**Current Status:**
- 120 production orders protected (isTestData=false)
- 0 test orders (safe to delete)
- All future orders default to production (isTestData=false)

## Outlet Selection Flow Fix (Jan 21)

- [x] CRITICAL: Fix outlet selection flow for Dine-in/Pickup orders
  - [x] Changed from modal-based to blocking screen approach
  - [x] Menu is completely hidden until outlet is selected
  - [x] Outlet selection resets when switching between order types
  - [x] Delivery mode works without outlet selection (auto T.Nagar)
  - [x] Dine-in shows "Select Your Location" blocking screen
  - [x] Pickup shows "Select Your Location" blocking screen
  - [x] No way to bypass outlet selection for Dine-in/Pickup


## KOT Printer Audio Alert (Jan 21)

- [x] Add audio alert/bell sound to KOT printer when new order arrives
  - [x] Play sound when KOT is printed (3 beeps at 1000Hz)
  - [x] Use system beep or optional custom WAV file for notification
  - [x] Configurable beep count and delay


## KOT Outlet Routing Bug (Jan 21)

- [x] Fix KOT printing to only print at selected outlet
  - [x] Order #133 printed at both Palladium and T.Nagar when Palladium was selected
  - [x] Root cause: T.Nagar printer scripts were polling without outlet filter
  - [x] Fixed kot-printer-client.mjs (BAR) to filter by outletId=2 (T.Nagar)
  - [x] Fixed kot-printer-client-kitchen.mjs (KITCHEN) to filter by outletId=2 (T.Nagar)
  - [x] Palladium script already had correct outletId=1 filter


## Order #134 Issues (Jan 21)

- [ ] Order #134 KOT printed at Palladium instead of T.Nagar
  - [ ] Investigate outlet assignment in database
  - [ ] Check KOT queue outlet ID
- [ ] Payment status showing "pending" despite Razorpay showing captured
  - [ ] Check webhook processing
  - [ ] Verify order payment status in database



## Critical Bugs (Jan 21 - Afternoon)

- [x] KOT printing at wrong outlets - ROOT CAUSE FOUND AND FIXED
  - [x] Order #134 (T.Nagar instore) printed at Palladium - orders had wrong outletId
  - [x] Order #133 (Palladium pickup) printed at T.Nagar - T.Nagar printer not updated yet
  - [x] Root cause: Guest checkout was using hardcoded storeLocationId instead of selected outlet
  - [x] Fixed Checkout.tsx to calculate guestOutletId from selectedOutlet (same as logged-in checkout)
  - [x] T.Nagar printer scripts already updated (need to be deployed)

- [x] Razorpay payments not showing in Payment Report - CLARIFIED
  - [x] Order #133 is in 'ready' status, not 'completed' - Payment Report only shows completed orders
  - [x] Order #134 shows "Not Recorded" because it's a Pay at Counter order with no payment collected
  - [x] This is correct behavior - Payment Report is for financial reconciliation of completed orders

## Payment Report Improvements (Jan 21)

- [x] Add workshop payments to Payment Report
  - [x] Workshop bookings now included in report (shown with purple highlight)
  - [x] Workshop bookings show ticket count and payment method
- [x] Verify outlet attribution in Payment Report
  - [x] Fixed outlet filter to properly filter by Palladium (outletId 1) or T.Nagar (outletId 2)
  - [x] Orders now show correct outlet name based on outletId
- [x] Added Razorpay to payment method options
  - [x] Added Razorpay filter option
  - [x] Added Razorpay label and icon

## Automated Daily Backup (Jan 21)

- [x] Create database backup procedure (already exists in server/backup.ts)
- [x] Set up email notification for backup failures (uses notifyOwner system)
- [x] Schedule daily backup at 4am IST (cron: 0 0 4 * * *)
- [x] Send alert to kannan.swamy@taiwanmaami.com on failure (via Manus notification system)


## Wholesale Portal (Jan 24)

- [x] Database schema for wholesale tables
  - [x] wholesale_products (name, description, category, photos, videos, price, unit, stock)
  - [x] wholesale_customers (business_name, gst_number, contact_person, email, phone, address)
  - [x] wholesale_orders (customer_id, items, subtotal, gst, total, payment_status, shipping_status)
  - [x] wholesale_order_items (order_id, product_id, quantity, unit_price, total)
  - [x] wholesale_cart (customer_id, product_id, quantity)
  - [x] wholesale_categories (name, slug, description, image_url)
  - [x] wholesale_password_resets (customer_id, token, expires_at)

- [x] Backend API endpoints
  - [x] Wholesale product CRUD (admin)
  - [x] Wholesale customer registration/login
  - [x] Cart management (add, update, remove, get)
  - [x] Order placement with Razorpay
  - [x] Order history for customers
  - [x] Admin order management

- [x] Wholesale customer registration/login
  - [x] Registration form (business name, GST, contact person, email, phone, address)
  - [x] Login with email/password
  - [x] Password reset functionality

- [x] Wholesale product catalog pages
  - [x] /wholesale landing page with value proposition
  - [x] /wholesale/products catalog with category filters
  - [x] Product detail page with photos/videos
  - [x] Prices visible only after login

- [x] Shopping cart and checkout
  - [x] Add to cart functionality
  - [x] Cart page with quantity adjustment
  - [x] Checkout with business details
  - [x] Razorpay payment integration
  - [x] GST calculation (18%)
  - [x] Order confirmation page

- [x] Wholesale admin panel (accessible from Admin > Settings > Wholesale Portal)
  - [x] Product management (add, edit, delete, stock)
  - [x] Category management
  - [x] Order management (view, update status)
  - [x] Customer list
  - [x] Dashboard with stats (orders, revenue, pending, customers)

- [x] Testing
  - [x] Write vitest tests for wholesale APIs (14 tests passing)
  - [x] Test with test data only (TEST_WHOLESALE_ prefix)
  - [x] Clean up test data after testing (afterAll hook)

- [x] Add "Wholesale" link to main navigation header (next to Locations, Events)

## Wholesale Admin Enhancements (Jan 24)

- [x] Full CRUD for wholesale categories
  - [x] Create category with image upload
  - [x] Edit category (name, description, image)
  - [x] Delete category (with confirmation)
  - [ ] Reorder categories (future enhancement)

- [x] Full CRUD for wholesale products
  - [x] Create product with photo/video upload
  - [x] Edit product (all fields including media)
  - [x] Delete product (with confirmation)
  - [x] Multiple image upload per product (3 images)
  - [x] Video upload support (50MB max)

- [x] Media upload functionality
  - [x] Cloudinary integration for wholesale images/videos
  - [x] Image preview before upload
  - [x] Video preview
  - [x] Delete media from product/category (X button)

## Bug Fix (Jan 24)

- [x] Fix Signature Mochi products showing "Out of Stock" for delivery despite being marked available
- [x] Fix Staff Orders availability toggle layout for mobile (toggle was cut off on narrow screens)

## Staff Orders Availability Panel Fix (Jan 24)

- [x] Fix toggle switch not showing for "Out" items (now uses explicit boolean check for isAvailable)
- [x] Group products by category with collapsible sections (already existed, improved with item count)
- [x] Add "Expand All" / "Collapse All" buttons like admin panel


## CRITICAL: Payment Amount Bug Fix (Jan 25)

- [x] Fix delivery charge not included in Razorpay payment amount
  - [x] Use backend totalAmount (which includes delivery) for Razorpay instead of frontend displayTotal
  - [x] Verify amount sent to Razorpay matches order totalAmount
- [x] Fix stale displayTotal causing wrong payment amounts
  - [x] Pass orderData.totalAmount from backend response to handleRazorpayPayment
- [x] Fix idempotency key to prevent duplicate orders
  - [x] Remove timestamp from idempotency key
  - [x] Use stable key based on phone + cart hash
- [x] Add Razorpay script load check before creating order
- [x] Cancel order if Razorpay payment initiation fails
- [x] Added cancelOrder procedure to backend for auto-cancellation on payment failure
- [ ] Add payment amount to payments table (future enhancement)

**Revenue Loss Report:**
- 7 delivery orders affected
- Total delivery charges not collected: ₹650
- Order 184 also has additional ₹404 discrepancy (stale cart issue)

**Fix Applied:**
- Checkout.tsx now uses orderData.totalAmount from backend (which includes delivery charges)
- Both logged-in and guest checkout flows fixed
- Idempotency key now stable (phone + cart hash, no timestamp)
- Orders auto-cancel if Razorpay script fails to load or payment initiation fails
- All 5 unit tests passing


## Payment Reconciliation Report (Jan 25)

- [x] Create Razorpay payment reconciliation report for accountant
  - [x] Backend procedure to fetch Razorpay payments with order totals
  - [x] Compare payment.amount vs order.totalAmount for discrepancies
  - [x] Date filtering: daily, weekly, monthly, custom range (Today, Yesterday, Last 7 Days, Last 30 Days + custom)
  - [x] Summary stats: total collected, total expected, total discrepancy
  - [x] Highlight orders with payment discrepancies (red background)
  - [x] Admin UI in Reports dropdown → Razorpay Reconciliation
  - [x] CSV export for accountant
  - [x] Include Razorpay payment ID, order number, customer, amounts
  - [x] Fetch actual amounts from Razorpay API (bulk fetch button)
  - [x] Daily breakdown table
  - [x] Show only discrepancies toggle filter


## Bug Fixes (Jan 25 - Part 2)

- [x] Store actual Razorpay payment amounts in payments table
  - [x] Updated verifyPayment procedure to fetch payment from Razorpay API
  - [x] Now stores actual collected amount (in paise) in payments.amount field
  - [x] Eliminates need to fetch from Razorpay API for reconciliation
- [x] Fix TypeScript errors (reduced from 523 to 17)
  - [x] Added missing AppRouter type export in routers.ts
  - [x] Fixed events.getOrder return type to include order property
  - [x] Fixed Admin.tsx orderDetails property accesses
  - [x] Fixed AdminEvents.tsx updateBookingAttendance procedure name
  - [ ] Remaining 17 errors in wholesale pricingTiers types (pre-existing, non-blocking)


## TypeScript Error Fixes (Jan 25 - Part 3)

- [x] Fix all 17 remaining TypeScript errors (now 0 errors!)
  - [x] Fix wholesale pricingTiers type mismatch in WholesaleCart.tsx
  - [x] Fix wholesale pricingTiers type mismatch in WholesaleProducts.tsx
  - [x] Fix Events.tsx Date comparison errors
  - [x] Fix Events.tsx null checks for workshop.price
  - [x] Fix AdminEvents.tsx Date rendering and type errors
  - [x] Fix Admin.tsx type errors
  - [x] Fix CartContext.tsx type comparison errors


## Razorpay Reconciliation Report Fix (Jan 25)

- [x] Fix reconciliation report to be actually useful
  - [x] Auto-fetch Razorpay payment amounts when report loads
  - [x] Display actual collected amounts vs expected amounts
  - [x] Calculate and show discrepancies properly
  - [x] Update summary stats to show real totals
  - [x] Reset and re-fetch when date range changes


## Reconciliation Report - Missing Payments Issue (Jan 25)

- [x] Fix reconciliation report to show ALL Razorpay payments
  - [x] Include orders with razorpayPaymentId regardless of paymentMethod field
  - [x] Include in-store orders that were paid via Razorpay (card, upi, etc.)
  - [x] Added paymentMethod column to show how each order was recorded
  - [x] Investigated orders 129 and 121: paymentMethod=razorpay but razorpayPaymentId=null (old bug)
  - [ ] Add unmatched Razorpay payments section for orphan payments (future enhancement)


## CRITICAL BUG: Unpaid Delivery Order Created (Jan 27)

- [x] Investigate order #199 - delivery order created without payment
  - [x] Check database for payment status and razorpayPaymentId (both null)
  - [x] Root cause: Order created first, then Razorpay payment initiated - if payment fails, order remains unpaid
  - [x] Staff manually changed status to "preparing" without payment verification
- [x] Fix checkout flow to prevent unpaid delivery orders
  - [x] Added server-side validation in updateStatus procedure
  - [x] Delivery orders cannot be prepared/completed unless paymentStatus = 'completed'
  - [x] Pickup orders with online payment also require payment verification
  - [x] Error message guides staff to wait for payment or cancel the order


## Mark Orders as Reconciled Feature (Jan 27)

- [ ] Add ability to mark orders as reconciled when discrepancies are settled
  - [ ] Add reconciliationNote and reconciledAt fields to orders table
  - [ ] Create backend procedure to mark order as reconciled with note
  - [ ] Add "Mark Reconciled" button in reconciliation report for orders with discrepancies
  - [ ] Show reconciled status and note in the report
  - [ ] Filter option to hide reconciled orders


## Reconciliation Report Fixes (Jan 27)

- [x] Show ₹0 discrepancy for reconciled/written-off orders
- [x] Add "Write Off" option for unrecoverable discrepancies (different from Reconciled)
  - [x] Write Off = loss accepted, cannot be recovered (orange badge)
  - [x] Reconciled = payment received through alternative means (green badge)
- [x] Different dialog content for Write Off vs Reconciled
- [x] Notes prefixed with [WRITE-OFF] or [RECONCILED] for clarity

- [x] Show reconciliation/write-off notes when hovering on the badge (tooltip)
- [x] Allow viewing the recorded message for reconciled/written-off orders


## CRITICAL BUG - Delivery Fee Still Missing (Jan 28)

- [ ] Order 00206 charged ₹1,743.50 instead of ₹1,843.50 (missing ₹100 delivery fee)
- [ ] Investigate why previous fix is not working
- [ ] Fix the payment amount calculation


## Admin Order Details Enhancement (Jan 28)

- [x] Show discount code used in order modal
- [x] Show discount amount in order modal
- [x] Show delivery charge in order modal
- [x] Add full price breakdown (Subtotal, Discount, GST, Delivery, Total)
- [x] Add View/Download Invoice button to admin order details


## Invoice Encoding Fix (Jan 28)

- [x] Fix Rupee symbol encoding in tax invoice (added UTF-8 charset meta tag)
- [x] Fix Chinese character encoding in tax invoice (UTF-8 charset)


## New Features (Jan 28 - Batch 2)

- [x] Verify BOBALOVE10 discount prevents reuse by same customer (already implemented)
- [x] Add birthday capture feature (month/day) on login
- [x] Show birthday offer prompt to encourage users to enter birthday
- [x] Add View Invoice button to customer My Orders page
- [x] Add Download Invoice capability for customers


## CRITICAL: Invoice Encoding Bug (Jan 28)

- [x] Fix Rupee symbol showing as â,' instead of ₹ (used Unicode escape \u20B9)
- [x] Fix Chinese characters showing as garbled text (added UTF-8 charset meta tag)
- [x] Ensure proper UTF-8 encoding in HTML blob creation (charset=utf-8)


## CRITICAL: Fix Company Details on Invoices (Jan 28)

- [x] Fix GSTIN from 33AADCT4567A1ZH to 33AAKCT4782H1Z1
- [x] Add phone number: 9150570557
- [x] Add email: hello@taiwanmaami.com
- [x] Remove old Print Bill button (replaced with View Invoice in OrderConfirmation.tsx)


## Customer Profile Page (Jan 28)

- [ ] Create Customer Profile page with Taiwan Maami branding
- [ ] Add name, phone, email editing
- [ ] Add birthday month/day editing
- [ ] Add saved delivery addresses management
- [ ] Add loyalty stamp progress display
- [ ] Investigate OAuth page branding customization (remove Manus reference)


## Customer Profile Page (Jan 28)

- [x] Create customer profile page at /profile
- [x] Show/edit name, phone, email
- [x] Show/edit birthday (month/day) for birthday offer
- [x] Manage saved delivery addresses (add, edit, delete, set default)
- [x] Display loyalty stamp progress (current stamps, lifetime stamps, free rewards earned)
- [ ] Add link to profile from header/navigation
- [x] Fix GSTIN on all invoices to 33AAKCT4782H1Z1
- [x] Fix phone number on invoices to 9150570557
- [x] Fix email on invoices to hello@taiwanmaami.com
- [x] Remove old Print Bill button (replaced with View Invoice)
- [ ] OAuth branding customization (Manus platform limitation - cannot be changed from our side)


## Profile Link in Navigation (Jan 28)

- [x] Add Profile link/icon to Header for logged-in users (desktop and mobile)

## Birthday Feature Updates (Jan 28)

- [x] Lock birthday editing after first entry (users cannot change birthday once set)
- [x] Update birthday offer text to "FREE large boba drink (worth over ₹450) with any food or drink purchase"
- [x] Add server-side validation to prevent birthday changes via API
- [x] Add "Birthday cannot be changed once set" message on Profile page

## Address Form Improvements (Jan 28)

- [x] Change Area field from dropdown to text input with autocomplete
- [x] Show locality names (e.g., "Triplicane") instead of just pincodes
- [x] Auto-populate pincode field when locality is selected

## Chennai Localities & Pincode Lookup (Jan 28)

- [x] Find comprehensive Chennai localities and pincodes data (from India Post via GitHub)
- [x] Populate delivery_areas table with 73 verified Chennai localities
- [x] Implement searchable locality lookup with autocomplete
- [x] Ensure all pincodes are correct and verified


## Birthday Gift Order Handling (Jan 29)
- [x] Add "Birthday Gift" payment type for complimentary orders
- [x] Update order #214 payment status to show as "Birthday Gift" instead of "N/A - Pending"
- [x] Update payment reports to categorize birthday gifts separately
- [x] Exclude birthday gift orders from "Not Recorded" category
- [x] Show birthday gifts as promotional/complimentary in sales totals
- [x] Ensure collected revenue reflects actual payments (excluding gifts)

## Google Analytics Integration (Jan 30)
- [x] Add Google Analytics tracking code (G-LN94GLCCQG) to website

## Traffic & Conversion Improvements (Jan 30)
- [ ] Add "Order Online & Save" promotional banner to homepage
- [ ] Add floating WhatsApp order button
- [ ] Update Biang Biang workshop banner - remove dates 7, 21, 28 Feb
- [ ] Disable workshop bookings for removed dates (7, 21, 28 Feb)

## Traffic & Conversion Improvements (Jan 30)
- [x] Add "Order Online & Save" promotional banner on homepage
- [x] Add floating WhatsApp order button (links to 919150570557)
- [x] Update Biang Biang workshop banner to show only Feb 14
- [x] Disable bookings for Feb 7, 21, 28 workshop dates (isActive = 0)
- [x] Add Google Analytics tracking code (G-LN94GLCCQG)

## Contact Numbers Update (Jan 30)
- [x] Update WhatsApp button to use owner's number (7845053909)
- [x] Add contact numbers section to footer (7845053909 and 9150570557)

## Hero Section Update (Jan 30)
- [x] Replace "Order Now" button with "Order Online & Save" green banner in hero section

## WhatsApp Number Update (Jan 30)
- [x] Change WhatsApp button to T Nagar shop number (9150570557) instead of owner number
- [x] Verify footer has both contact numbers displayed (already has both)

## Blog Section & SEO Articles (Jan 30)
- [ ] Create blog page with article listing
- [ ] Write draft article: "What is Bubble Tea? A Complete Guide"
- [ ] Write draft article: "Best Bubble Tea Flavors to Try in Chennai"
- [ ] Write draft article: "Taiwan Maami - Our Story"
- [ ] Add blog link to navigation
- [ ] Verify footer has both phone numbers (production needs publishing)

## Blog Section (Jan 30)

- [x] Create blog_articles database table with SEO fields
- [x] Add blog router with CRUD procedures (getPublished, getBySlug, getAll, create, update, delete)
- [x] Create public Blog listing page at /blog
- [x] Create BlogArticle page for individual articles at /blog/:slug
- [x] Add static SEO articles as fallback content (What is Bubble Tea, Best Flavors, Our Story)
- [x] Create AdminBlog page for article management at /admin/blog
- [x] Add article status workflow: draft → pending_review → published
- [x] Add "Submit for Review" button for Theresa approval workflow
- [x] Add Blog link to navigation menu (added to footer quick links)
- [x] Fix Footer contact section to show shop phone number (both Footer.tsx and Home.tsx updated)


## Bug Fixes (Jan 31)

- [x] Remove duplicate "Order Online & Save!" banner from landing page (keep only the one in hero section)


## GA4 E-commerce & Traffic Optimization (Jan 31)

- [x] Create GA4 analytics utility with e-commerce event functions (client/src/lib/analytics.ts)
- [x] Add view_item event when viewing product details (ProductCustomizationModal)
- [x] Add add_to_cart event when adding items to cart (CartContext)
- [x] Add view_cart event when viewing cart page (Cart.tsx)
- [x] Add begin_checkout event when starting checkout (Cart.tsx)
- [x] Add purchase event when order is completed (Checkout.tsx - both online and cash)
- [x] Add lead generation tracking (birthday signup, WhatsApp order clicks)
- [ ] Test events in GA4 Realtime DebugView


## Manual Payment Override (Jan 31)

- [ ] Add manual payment confirmation for delivery orders (staff can confirm QR code payment)
- [ ] Add "Confirm Payment" button in Admin/Staff Orders for pending delivery orders
- [ ] Update order status to allow progression after manual payment confirmation



## Manual Payment Override (Jan 31)

- [x] Add confirmPaymentManually procedure to server (server/routers.ts)
- [x] Add Confirm Payment button to Admin orders page for delivery/pickup orders
- [x] Manually confirmed payment for Order #230 via database



## Staff Stamp Prevention (Jan 31)

- [x] Reset Rinold's stamps to 0 (current and lifetime)
- [x] Add check in stamp-earning logic to skip staff/admin accounts


## Walk-in Account & Staff Stamp Reset (Feb 1)

- [x] Create "Walk-in Customer" account for staff to use when entering orders (ID: 20610643)
- [x] Check all staff accounts and reset their stamps to 0 (11 accounts reset)


## Physical to Digital Stamp Transfer (Feb 1)

- [ ] Add server procedure for manual stamp adjustment (addStampsToCustomer)
- [ ] Add UI in admin Customers section to add stamps to customer accounts
- [ ] Test the feature



## Physical to Digital Stamp Transfer (Feb 1)

- [x] Add server procedure for manual stamp adjustment (addStamps in customers router)
- [x] Add UI in admin panel for staff to add stamps to customer accounts
- [x] Staff can transfer physical loyalty card stamps to digital accounts


## Bug Fixes (Feb 4)

- [x] Fix customer search in Admin Panel not finding customers
  - Issue: Search was filtering client-side on limited results (100 customers)
  - Solution: Pass search term to server-side query with debouncing, increased limit to 500
  - Customer Additi (phone: 9884058200) now searchable by name or phone

## Menu Updates (Feb 5)

- [ ] Remove 'regular' size for Creme Caramel Oolong Latte (large only)
- [ ] Remove 'regular' size for Creme Caramel Taro Latte (large only)

## Menu Updates (Feb 5)

- [x] Remove 'regular' size for Crème Caramel Milk Oolong (large only)
- [x] Remove 'regular' size for Crème Caramel Taro Latte (large only)

## Bug Fixes (Feb 6)

- [x] Fix BOBALOVE10 discount code showing as invalid when customers apply it (removed delivery-only restriction, kept first-time-only)

- [x] Add BOBALOVE10 discount code promotion to the scrolling ticker banner

## Account Merge Feature (Feb 6)

- [x] Build server-side account merge logic (transfer stamps, credits, orders)
- [x] Create admin tRPC procedure for merging accounts
- [x] Write Vitest tests for merge logic
- [x] Build Admin UI for account merge (search, select, preview, confirm)
- [x] End-to-end test on dev server

## Merge UI Bug Fix (Feb 6)

- [ ] Fix target account search field not working as searchable input
- [ ] Ensure both duplicate accounts show in search results (source and target)

## Guest Account Merge Fix (Feb 6)

- [x] Fix guest order queries to handle both userId=0 AND userId IS NULL
- [x] Guest account names now display correctly (e.g., "Swathi Varadarajan" instead of "Guest")
- [x] Updated previewMerge and executeMerge procedures with or(eq(orders.userId, 0), isNull(orders.userId))
- [x] Added Vitest tests for guest account merge scenarios (two-guest rejection, guest source format)
- [x] Verified merge preview shows correct data for Swathi's accounts

## Merge UI Bug Fix (Feb 6 - continued)

- [x] Fix target account search field not showing dropdown results when typing (confirmed working on dev)
- [x] Guest account (phone 9025331599) appears correctly in target search results

## Food Item Customization Bug (Feb 6)

- [x] Fix food items showing beverage-specific options (Regular/Large 480ml/700ml, Boba, Boba Type)
- [x] Food items (Main Course, etc.) should only show relevant customizations (e.g., eggs add-on)
- [x] Beverage options (size, boba, sugar level, ice level) should only appear for drink categories

## Schema Default Fix (Feb 6)

- [x] Change hasSizeVariants default from true to false in schema
- [x] Change hasBobaOption default from true to false in schema
- [x] Push migration (applied via ALTER TABLE + schema update)

## GST Sales Report Excel Export (Feb 7)

- [x] Build server-side Excel export endpoint that includes ALL revenue sources (orders + workshops + events)
- [x] Include columns: Invoice Number, Date, Taxable Amount, CGST, SGST, Total GST, Total Amount, Payment Method, Source, Outlet
- [x] Remove customer name from export (not needed for GST)
- [x] Include workshop bookings (e.g., Biang Biang workshop ₹5,760) in the report
- [x] Add Export to Excel button on analytics dashboard
- [ ] Fix analytics dashboard totals to include workshop/event revenue
- [x] Write tests for the export endpoint

## Advanced Analytics Dashboard (Feb 7 - planned)

- [x] Dynamic item-level analysis (which items sell most on which days)
- [ ] Product performance trends over time
- [x] Day-of-week and time-of-day analysis

## GST Report Paise Bug Fix (Feb 7)

- [x] Fix GST report CSV showing CGST/SGST in paise while taxableValue is in rupees
- [x] Format Excel export with proper ₹ currency formatting (3 sheets: Sales Report, GST Summary, Payment Summary)
- [x] Add totals row at the bottom of the Excel report
- [x] Include workshop/event revenue in the comprehensive sales report

## GST Report Formatting Fix (Feb 7)

- [x] Changed GST report tab export to use the formatted Excel endpoint instead of raw CSV
- [x] GST report now exports with proper column headers, styling, and totals via Excel

## Item-Level Analytics Dashboard (Feb 7)

- [x] Build backend procedures for item-level sales analysis
- [x] Product performance ranking (top sellers by quantity and revenue)
- [x] Day-of-week analysis heatmap (which products sell on which days)
- [x] Time-of-day analysis (peak hours for different product categories) - with IST timezone fix
- [x] Product mix analysis (what items are commonly ordered together)
- [x] Build frontend UI with interactive heatmaps, data tables, and insights
- [x] Correlation analysis between day-of-week and product sales
- [x] Day-of-Week Insights (best/worst day, weekend vs weekday comparison)
- [x] Time-of-Day Insights (peak hour, lunch vs dinner rush)
- [x] Key Insights for product mix (top combos, cross-category ordering patterns)

## AI Business Insights & Recommendations (Feb 7)

- [x] Add actionable business recommendations section to Insights tab
- [x] Generate insights from sales data (day-of-week patterns, product performance, combos)
- [x] Suggest focus areas for improving sales (underperforming categories, peak time optimization)
- [x] Recommend combo deals based on product mix analysis
- [x] Highlight growth opportunities and areas needing attention

## Website Traffic Analytics Page (Feb 7)

- [x] Build separate Website Traffic Analytics page in admin
- [x] Show traffic sources breakdown (Instagram, Google, Direct, WhatsApp, etc.)
- [x] Show referrer analysis with focus on Instagram traffic
- [x] Display page views and unique visitors over time
- [x] Show device type breakdown (mobile vs desktop)
- [x] Show top landing pages and user flow
- [x] Add navigation link to traffic analytics from Sales Analytics header

## Comprehensive Sales Analysis with Delivery Data (Feb 7)

- [ ] Analyze ItemwiseDeliverySalesJan2026.xlsx (Swiggy/Zomato itemwise breakdown)
- [ ] Analyze TNagarDeliverySalesJan2026.xlsx (T. Nagar delivery sales)
- [ ] Combine website sales data with delivery platform data
- [ ] Generate comprehensive analysis report with insights and recommendations
- [ ] Deliver PDF report to user

## Delivery Data Integration into Analytics Dashboard (Feb 7)

- [x] Create database tables for delivery sales data (itemwise + summary)
- [x] Build Excel upload endpoint to parse Petpooja reports (server-side ExcelJS parsing)
- [x] Build combined analytics procedures (website + delivery)
- [x] Add "All Channels" view to Analytics dashboard with channel breakdown
- [x] Show combined top products, category comparison, AOV by channel
- [x] Add delivery platform breakdown (Zomato vs Swiggy vs Dine-in)
- [x] Add cross-channel insights and recommendations
- [x] Add upload UI for Petpooja Excel files in admin
- [x] Fix product name matching (trim whitespace for accurate merging)
- [x] Fix date range overlap query for delivery period matching
- [x] Add delivery channel insights to Business Recommendations (commission savings, AOV comparison, Swiggy growth, delivery-exclusive products)

## CRITICAL BUG - Order #00302 Payment Not Captured (Feb 7)

- [x] BUG: Order #00302 - Razorpay payment captured (₹908.50) but order shows payment pending, KOT didn't print
- [x] Investigate Razorpay webhook/payment verification flow root cause
  - Root cause: Frontend verifyPayment callback failed (customer likely closed browser after payment)
  - razorpayOrderId was not saved at createPaymentOrder stage, only at verifyPayment
- [x] Fix the immediate order #00302 to reflect correct payment status
  - Updated paymentStatus to 'completed', orderStatus to 'confirmed'
  - Created KOT and receipt queue entries
- [x] Add Razorpay webhook endpoint (/api/razorpay/webhook) as safety net
  - Handles payment.captured events server-side
  - Verifies HMAC signature for security
  - Updates order status, creates payment record, generates KOT
  - Idempotent: skips if payment already processed
  - Registered before JSON parser for raw body access
- [x] Save razorpayOrderId at createPaymentOrder stage (not just verifyPayment)
  - Ensures webhook can find order by razorpayOrderId even if frontend callback fails

## Website Traffic Analytics - Self-hosted Tracking (Feb 7)

- [x] BUG: Website Traffic Analytics page showing blank/zero data
  - Root cause: Manus-managed Umami analytics API requires authentication credentials not available to the app
  - All read API endpoints return 401 Unauthorized; share API endpoints return 404
- [x] Build self-hosted pageview tracking system
  - Created `pageviews` table in database (sessionId, url, referrer, browser, os, device, UTM params)
  - Created `daily_traffic_stats` table for aggregated daily stats
  - Added `/api/track` POST endpoint for recording pageviews (lightweight, non-blocking)
  - Server-side browser/OS detection from User-Agent header
- [x] Add client-side tracking hook (`usePageTracking`)
  - Tracks page navigation via wouter location changes
  - Generates anonymous session IDs (sessionStorage)
  - Extracts UTM parameters from URL
  - Detects device type (desktop/mobile/tablet)
  - Uses sendBeacon API for reliability
  - Excludes admin pages from tracking
- [x] Replace Umami API calls with own database queries in `getWebsiteTraffic` procedure
  - Calculates unique visitors, sessions, pageviews, avg duration
  - Provides referrer, browser, OS, device, page, entry page, and UTM channel breakdowns
- [x] Write vitest tests for pageview tracking (4 tests, all passing)

## UTM Link Builder & Razorpay Webhook Setup (Feb 8)

- [x] Build UTM link builder tool in admin panel for generating marketing links
- [x] Add pre-built UTM templates for Instagram, WhatsApp, Google, etc.
- [x] Show UTM-tagged link copy functionality
- [ ] Configure Razorpay webhook in Razorpay Dashboard for payment.captured events (requires user login to Razorpay Dashboard)


## CRITICAL BUG - Order #309 SQL INSERT Failure (Feb 8)

- [x] BUG: Order #309 - SQL INSERT into orders table fails, raw SQL error shown to customer
- [x] Investigate column mismatch between Drizzle schema and actual database table
  - Root cause: tableNumber varchar(10) too short, customer entered phone number (+919600175631 = 13 chars)
- [x] Fix the root cause of the INSERT failure
  - Widened tableNumber column to varchar(50) in both DB and Drizzle schema
- [x] Add proper error handling so raw SQL errors are never shown to customers
  - Added try-catch in both createOrder and guest.createOrder procedures
  - Returns user-friendly "Failed to create order" message instead of raw SQL
- [x] Add frontend validation for table number field
  - maxLength=10 on input fields
  - Regex check rejects phone number patterns (10+ consecutive digits)
  - Toast error: "Please enter a valid table number (e.g., 5 or A1), not a phone number"
- [x] Ensure order #309 customer (hubertchiu) can complete their order


## CRITICAL BUG - Loyalty Stamp Redemption Not Working (Feb 8)

- [x] BUG: Customer Gary Chiang has 16 stamps but free drink reward was not automatically applied
  - Root cause: addStamps procedure (physical card transfer) didn't check for 10-stamp threshold
- [x] 10 stamps should = 1 free large drink, stamps should be deducted automatically
- [x] Investigate current stamp redemption logic in ordering flow
- [x] Fix automatic stamp redemption: detect 10+ stamps → apply free drink → deduct 10 stamps
  - Fixed addStamps procedure to create rewards when stamps reach 10+
  - Added REWARD: prefix discount code handling in createOrder
  - Backend now redeems voucher, deducts 10 stamps, and logs transaction
- [x] Manually fix Gary Chiang's stamps (deduct 10, set to 6)
  - Created reward voucher REWARD-3A6BCF43 (expires May 9, 2026)
- [x] Ensure the free drink discount appears in the order/checkout flow
  - Added loyalty reward banner to Cart page with one-click "Apply" button
  - Shows when logged-in customer has available unredeemed rewards
  - Applies discount equal to the most expensive large drink in cart
- [x] Test the complete redemption flow (13 vitest tests passing)

## Razorpay Webhook Dashboard Configuration (Feb 8)

- [x] Verify webhook endpoint code is properly implemented (POST /api/razorpay/webhook with HMAC signature verification, idempotent, creates KOT)
- [ ] Provide step-by-step instructions for configuring webhook in Razorpay Dashboard

## Admin Manual Stamp Adjustment Tool (Feb 8)

- [x] Add stamp adjustment UI to admin panel (upgraded existing Add Stamps dialog to full Stamp Adjustment dialog)
- [x] Allow admin to search for a customer by name/phone (existing customer table with star icon)
- [x] Allow admin to add or deduct stamps with a reason (add/deduct toggle, required reason field)
- [x] Log all manual adjustments in stamp_transactions table (action: 'admin_deduct' for deductions)
- [x] Auto-create rewards when stamps reach 10+ after manual adjustment
- [x] Write vitest tests for the stamp adjustment feature (21 tests passing)

## Razorpay Webhook URL Mismatch Fix (Feb 8)

- [x] Add /api/payment/webhook route to match Razorpay Dashboard config
- [x] Both /api/razorpay/webhook and /api/payment/webhook should work (shared handler function)
- [x] Verify webhook handler processes events correctly at both URLs (0 TS errors)

## Cleanup Test Workshops (Feb 8)

- [x] Query all workshops in the database (found 15 total: 1 real + 13 test)
- [x] Identify and delete test workshops (deleted 13 "Test Workshop" entries, all draft status)
- [x] Verify the real workshop is untouched (ID 60001 "Biang Biang Noodle Workshop" with 4 bookings intact)

## BUG - Addons Not Shown in Order Detail, Invoice, and KOT (Feb 8)

- [x] BUG: Order #318 - Biang Biang Noodles shows ₹655 but addons (chicken, eggs) not listed
- [x] Investigate how addons are stored in order_item_addons table
  - Data is correct: Chicken Bites addon (₹240) stored in order_item_addons, addonsTotal=24000 paise
- [x] Fix addon display in admin order detail modal (show addons under each item with blue text)
- [x] Fix addon display in invoice/receipt PDF (addons listed with prices under each item)
- [x] Fix addon display in KOT report (addons shown in detailed order list)
- [x] Backend getById procedure now fetches addonsList for each order item
- [x] KOT daily summary now includes addons in item data
- [x] Receipt queue already had addons (was correct)
- [x] Verify fix works - 0 TS errors, 21 loyalty tests passing

## UTM Link Builder - Deep Link to Specific Menu Items (Feb 8)

- [x] Add subcategory/product deep-link support to UTM Link Builder
- [x] Allow selecting specific menu subcategories (e.g., ChickGozilla) as target page
  - When "Menu" is selected, category and subcategory dropdowns appear
  - All 4 categories and 22 subcategories available for deep linking
- [x] Ensure the generated URL lands directly on the correct subcategory/product section
  - Menu page already reads category/subcategory URL params on load
- [x] Added Instagram Reel quick template to UTM templates

## BUG - Intermittent "Permission denied: Redirect URI is not set" on Login (Feb 9)

- [x] BUG: Users intermittently get "Permission denied: Redirect URI is not set" when clicking Login
- [x] Investigate how login URL and redirect_uri parameter are constructed
  - Root cause: window.location.origin can be empty/"null" on some mobile browsers (iOS Safari)
  - getLoginUrl() was called eagerly during render, not at click time
  - useAuth called getLoginUrl() as default parameter on every render
- [x] Fix the redirect URI to be reliably set on every login attempt
  - Added robust getReliableOrigin() with fallback to https://www.taiwanmaami.com
  - Changed Header login from <a href> to onClick handler (URL generated at click time)
  - Fixed useAuth to generate login URL lazily only when redirect is needed
  - Added validation for oauthPortalUrl and appId before building URL
- [x] 0 TypeScript errors, dev server running clean

## Remove Manus Branding from Login Flow (Feb 9)

- [x] Search all frontend code for visible Manus references (buttons, labels, tooltips, footer)
  - Only CDN URLs (files.manuscdn.com) found — not visible to customers
  - Login buttons say "Login" with no Manus text
  - No Manus branding in Header, Footer, Cart, Checkout, or any customer-facing page
- [x] Remove or replace Manus branding in customer-facing UI (none found — site is clean)
- [x] Draft request to Manus team for OAuth login page branding customization

## Login Transition & Menu Tile Rearrangement (Feb 9)

- [x] Add branded "Redirecting to secure login..." transition page before OAuth redirect
- [x] Rearrange Explore our Menus tiles: Food (top-left), Iced Beverages (top-right), Hot Beverages (bottom-left), Asian Sweet Bites (bottom-right)
- [x] Rename "Main Course" to "Food" in database site_settings

- [x] Fix Hot Beverages category description typo ('n-store' → 'in-store')

## Google Search & SEO Optimization (Feb 9)

- [x] Add Restaurant JSON-LD structured data for Velachery / Palladium Mall location
- [x] Add hasMenu to T Nagar Restaurant JSON-LD and add Mochi to servesCuisine
- [x] Add FoodMenu JSON-LD with all categories & subcategories (Iced Beverages, Hot Beverages, Food, Asian Sweet Bites)
- [x] Add FAQPage JSON-LD structured data (6 common questions)
- [x] Add BreadcrumbList JSON-LD structured data
- [x] Create reusable SEO component (react-helmet-async) for dynamic per-page meta tags
- [x] Add HelmetProvider wrapper in main.tsx
- [x] Add per-page SEO meta tags to Home, Menu, About, Events, Blog, FAQ, Franchise, Testimonials
- [x] Update sitemap.xml with all public pages including menu categories, events, blog, franchise
- [x] Write vitest tests for all SEO optimizations (33 tests passing)

## Non-Veg Dietary Label (Feb 9)

- [x] Add 'isNonVeg' boolean field to products schema
- [x] Push database migration (via direct SQL ALTER TABLE)
- [x] Update ProductCard to display Non-Veg badge in red with Drumstick icon
- [x] Update admin product management to include Non-Veg toggle (edit & create dialogs)
- [x] Update server routers (createProduct & updateProduct) to accept isNonVeg
- [x] Add .badge-nonveg CSS class (red #dc2626 background, white text)
- [x] Write vitest tests for Non-Veg label (16 tests passing)

## Blog Posts - SEO Content (Feb 10)

- [x] Audit current blog system (schema, admin, display)
- [x] Write Blog 1: The Story Behind Authentic Taiwanese Bubble Tea
- [x] Write Blog 2: Taiwan Maami's Tea Journey — From Leaf to Cup
- [x] Write Blog 3: How to Order Bubble Tea Like a Pro
- [x] Write Blog 4: Behind the Menu: How We Created Our Signature Mochis
- [x] Write Blog 5: Taiwanese Street Food & Asian Flavours — Beyond Bubble Tea
- [x] Add SEO meta tags to all blog posts (metaTitle, metaDescription, keywords)
- [x] Verify blog posts display correctly on the website (all 5 posts visible, content renders properly)

## Blog Improvements (Feb 10)

- [x] Add featured images to all 5 blog posts (uploaded to CDN, updated in database)
- [x] Improve blog post page layout for better readability (hero image, breadcrumb, better structure)
- [x] Improve blog post typography (line spacing, paragraph spacing, heading styles, drop cap)
- [x] Add visual elements (styled h2 with accent border, h3 with left border, drop cap, reading time)
- [x] Improve blog listing card design (images now showing from CDN)
- [ ] Add admin ability to upload/change blog featured images

## Blog Image Upload in Admin (Feb 10)

- [x] Add image upload button to blog edit dialog in Admin (drag & drop style uploader)
- [x] Upload image to S3 via server endpoint (blog.uploadImage tRPC procedure)
- [x] Update blog post imageUrl in database after upload
- [x] Show current image preview in edit dialog (with replace/remove buttons)
- [x] Allow replacing existing image
- [x] Add image upload to create dialog (stores base64, uploads after article created)
- [x] Show thumbnail in article list cards
- [x] Write vitest tests (11 tests passing)

## Bug Fix: Blog Management Missing from Admin (Feb 10)

- [x] Blog Management not visible in Admin navigation - added to Settings dropdown
- [x] Blog Management link navigates to /admin/blog with image upload support

## Blog Draft/Publish Workflow (Feb 10)

- [x] Verify draft posts are filtered out from public blog page (getPublished only returns published)
- [x] Fix getBySlug to block public access to draft articles (admin-only for non-published)
- [x] Add draft/review preview banner on BlogArticle page for admin preview
- [x] Set all 5 existing blog posts to draft status for user review

## Remove WhatsApp Button (Feb 10)

- [x] Remove "Order via WhatsApp" floating button from the website

## LLM-Powered Chatbot Ordering Assistant (Feb 11)

- [x] Audit existing AIChatBox component, cart context, and invokeLLM
- [x] Build server-side chatbot tRPC endpoint with system prompt
- [x] Add LLM tool calls: searchMenu, getProductDetails, getCategories, getPopularItems, getStoreInfo
- [x] Build floating chat widget button (bottom-right, Taiwan Maami branded)
- [x] Integrate chat with AIChatBox component and tRPC chatbot endpoint
- [x] Handle FAQs via LLM tool calls (delivery, hours, allergens, loyalty, promos, locations)
- [x] Write vitest tests for chatbot endpoint (11 tests passing)
- [x] Verify chatbot widget renders on site with zero TS errors

## Add Blog to Main Navigation (Feb 11)

- [x] Add "Blog" link to the main navigation header (desktop and mobile)

## Chatbot Enhancements (Feb 11)

- [x] Add workshop/event data fetching to chatbot with booking links
- [x] Direct customers to specific menu category pages when asking about products (e.g., /menu?category=food for chicken)
- [x] Reference blog posts when customers ask about bubble tea with brief description and link
- [x] Test all new chatbot scenarios (workshops, product links, blog references)

## Chatbot Enhancement - Product Photos & Rich Cards (Feb 11)

- [x] Enhance chatbot backend to return structured product data (images, prices, links)
- [x] Add workshop/event detection and data fetching to chatbot
- [x] Add blog post integration to chatbot for bubble tea topics
- [x] Add direct menu category links in chatbot responses
- [x] Update chatbot tRPC response to include product cards alongside text reply
- [x] Build rich product card UI in chat widget (photo, name, price, order link)
- [x] Build workshop card UI in chat widget (title, date, price, book link)
- [x] Build blog post card UI in chat widget (title, excerpt, read link)
- [x] Update system prompt to instruct LLM to reference products by name for card matching
- [x] Write vitest tests for enhanced chatbot (24 tests passing)

## Bug Fix - Chatbot Mochi Search (Feb 11)

- [x] Fix chatbot saying "no mochi items" when customer asks about mochis
- [x] Root cause: plural handling - "mochis" didn't match "mochi" in product names

## Bug Fix - Chatbot Search & Cards (Feb 11)

- [x] Fix chatbot returning wrong products (chicken shown for bubble tea query)
  - Replaced simple word matching with relevance scoring (name > subcategory > category > description)
  - Added known phrase extraction ("bubble tea", "milk tea", etc.)
  - Added bidirectional prefix matching ("chicken" matches "ChickGozilla")
- [x] Fix chatbot not finding mochi products (plural stemming: mochis → mochi)
- [x] Make product cards static (show photo only, no click navigation)
- [x] Improve search relevance - match whole phrases before individual words
- [x] Add fallback intent detection for query patterns ("do you have X?", "tell me about X")

## Bug Fix - Chatbot Says "Tap" on Static Cards (Feb 11)

- [x] Fix system prompt to tell LLM that product cards are static display-only (not tappable)
- [x] LLM should NOT say "tap on any mochi" or "click to add to cart" since cards are just photos
- [x] LLM should instead direct customers to visit the Menu page to order

## Chatbot Greeting Image (Feb 11)

- [x] Generate illustration of Chinese/Taiwanese woman greeting with folded hands
- [x] Integrate image into chat widget bubble with CSS animation (gentle wave/bounce)
- [x] Ensure it fits the Taiwan Maami brand aesthetic

## Chatbot Greeting Lady - Image Update (Feb 11)

- [ ] Regenerate illustration with bright red chipao (not dark red/gold pattern)
- [ ] Hands in Indian namaste position (palms pressed together at chest)
- [ ] Upload new image to CDN and update ChatWidget.tsx

## Chatbot Greeting Lady - Image Upd- [x] Regenerate illustration with bright red chipao (not dark red/gold pattern)
- [x] Hands in Indian Vanakkam position (palms pressed together at chest level)
- [x] Upload new image to CDN and update ChatWidget.tsx## Chatbot Greeting Lady - Image Revision 2 (Feb 11)

- [x] Qipao must have proper flower/floral pattern (not plain solid red)
- [x] Woman must face forward (not turned to the side)
- [x] Vanakkam greeting at chest level only (palms together at chest, NOT near face)
- [x] Keep bright red color for the qipao

## Chatbot Greeting Lady - Image Revision 3 (Feb 11)

- [x] Add red pottu (bindi) on her forehead
- [x] Ensure image is small enough to fit nicely at the bottom right corner

## Chatbot Greeting - Add Tamil Vanakkam (Feb 11)

- [x] Add வணக்கம் (Vanakkam) alongside Nǐ hǎo in the speech bubble

## Remove Static Product Cards & Add Typing Animation (Feb 11)

- [x] Remove static product cards from chat UI (ProductCardInline, WorkshopCardInline, BlogCardInline, CategoryPill)
- [x] Remove cards from backend chatbot response (no longer needed)
- [x] Add typing animation effect — bot response appears character by character
- [x] Natural typing speed with slight randomness to feel human

## Fix Category Links & Add Quick-Reply Chips (Feb 11)

- [x] Fix chatbot category links leading to empty menu page (wrong URL format - now uses slugs)
- [x] Add quick-reply chips after bot responses (contextual suggestion buttons)
- [x] Add inline "Order Now" links in bot text for specific menu categories
- [x] Remove persist chat history suggestion (not valuable for food ordering)

## Bug Fix - Workshop Date & Chat Scroll (Feb 11)

- [x] Fix chatbot showing wrong workshop date (now uses workshop_dates session dates, shows next upcoming)
- [x] Fix chat window not scrollable (removed minHeight, added scroll-up detection to pause auto-scroll)
- [x] Fix category links using slug format instead of display name
- [x] Add quick-reply chips after bot responses (Bubble Tea, Mochis, Food, Store Hours, Workshops, Delivery Info)
- [x] Add inline menu links in bot text (system prompt now includes exact slug-based links)

## Bug Fix - Chatbot Hallucinating Fake Store Address (Feb 11)

- [x] Fix chatbot giving fake Anna Nagar address (W-122, 3rd Ave, W Block, Anna Nagar)
  - Root cause: old address data (64 GN Chetty Rd) + weak guardrails let LLM hallucinate
  - Fixed store data to exact addresses: New No. 29 Burkit Road + Palladium Mall Velachery
  - Fixed hours: T Nagar 12PM-12AM, Palladium 10AM-10PM
  - Fixed phone numbers per outlet
- [x] Harden system prompt to ONLY allow the two real locations
  - Added CRITICAL RULES section with explicit anti-hallucination instructions
  - Added blacklist of neighborhoods (Anna Nagar, Adyar, Mylapore) to never mention
- [x] Add explicit instruction: NEVER invent or guess addresses
- [x] Test with Tamil location query to verify fix (responds correctly in Tamil)
- [x] Test with "Anna Nagar branch?" query — correctly says no branch there

## Chatbot Enhancements - Quick Replies, Inline Links, Promo Codes (Feb 11)

- [x] Add quick-reply chips after each bot response (contextual suggestions)
- [x] Generate smart quick-reply suggestions based on conversation context
  - Context-aware: suggests Mochis/Food after bubble tea query, Bubble Tea after mochi query, etc.
  - Returns different chips for store info, workshops, blog, categories, popular items
- [x] Render quick-reply chips in AIChatBox above the input area
- [x] Clicking a chip sends it as a user message
- [x] Enhance system prompt for inline Order Now links in bot text
  - Added "Inline Links" section requiring markdown links for all category mentions
  - Bot now includes [Browse Iced Beverages](/menu?category=iced-beverages) etc.
- [x] Bot includes markdown links to menu categories when mentioning products
- [x] Add promo code awareness — bot proactively mentions BOBALOVE10 for first-time orders
  - Added "Promotions & Promo Codes" section to system prompt
  - Bot mentions BOBALOVE10, free delivery >₹2500, loyalty stamps
- [x] Add promo code to system prompt so bot knows about active promotions
- [x] Test all three features without breaking existing functionality (24/24 tests pass)

## Investigation - Missing Products from Admin Page (Feb 11)

- [ ] Investigate why Iced Beverages and Biang Biang Noodle disappeared from Admin page
- [ ] Check if products were soft-deleted or hard-deleted
- [ ] Check if staff toggled an isActive/isVisible flag
- [ ] Restore missing products if needed
- [ ] Fix Admin page to always show all products (including inactive ones)

## CRITICAL: Missing Iced Beverages Products (Feb 11)

- [x] Investigate how Iced Beverages products were deleted from database
  - Root cause: Staff used Availability toggle in Staff Orders to turn off ALL 7 Iced Beverages subcategories
  - All subcategories had availableInstore=0, availableDelivery=0, availablePickup=0
  - Products were NOT deleted - they were hidden by subcategory availability flags
  - Biang Biang Noodles had isAvailable=0 (product-level toggle)
- [x] Check if products have order/transaction records that should have prevented deletion
  - 52 different Iced Beverages products have order history (hundreds of order items)
  - Products were never deleted, just hidden
- [x] Restore missing Iced Beverages products
  - Restored all 7 subcategories: availableInstore=1, availableDelivery=1, availablePickup=1
  - Restored Biang Biang Noodles: isAvailable=1
- [x] Add safeguard: prevent product deletion when orders exist against the product
  - Already implemented: deleteProduct is soft-delete (sets isActive=false)
  - permanentlyDeleteProduct checks order history and refuses if orders exist
  - canDeleteProduct query shows order count before allowing permanent delete
- [x] Implement proper "Out of Stock" toggle for staff to temporarily disable items
  - Already implemented: isInStock toggle exists in Products tab
  - isAvailable toggle exists in Staff Orders page for quick availability control
  - Subcategory availability toggles exist for bulk enable/disable
- [x] Fix Admin page to use admin-specific query (getFullMenuAdmin) instead of customer-facing getFullMenu
  - Created new admin.getFullMenuAdmin procedure that returns ALL products/subcategories/categories
  - Updated ProductsTab, CategoriesTab, and ProductEditDialog to use getFullMenuAdmin
  - Admin page now always shows all products regardless of availability flags
  - Added vitest test: server/adminMenu.test.ts (5 tests, all passing)

## CRITICAL: Lock Down Product Deletion (Feb 11)

- [x] Audit all product deletion/deactivation paths (backend + frontend)
  - Found 4 paths: updateProduct(isActive), deleteProduct, permanentlyDeleteProduct, toggleActive switch
- [x] Remove staff ability to delete/deactivate products entirely
  - Staff/customer roles cannot call any delete/deactivate procedures (admin-only)
- [x] Restrict deleteProduct (soft delete) to admin-only with double confirmation
  - Now requires: type product name + type "DEACTIVATE" confirmation code
- [x] Restrict permanentlyDeleteProduct to admin-only with double confirmation (type product name + confirm code)
  - Now requires: type product name + type "DELETE-FOREVER" confirmation code
  - Still blocks deletion if product has order history
- [x] Update Admin UI: remove easy delete buttons, add strict double confirmation dialog
  - Removed isActive toggle switch from products table (replaced with status badge)
  - Removed isActive from updateProduct input schema
  - Added Deactivate button with orange double-confirmation panel
  - Added Delete Forever button with red double-confirmation panel
  - Both require typing product name + confirmation code
- [x] Ensure subcategory/category deletion also has safeguards (can't delete if products exist)
  - Already implemented: categories/subcategories check for child products before deletion
- [x] Write vitest tests for deletion lockdown
  - 13 tests in server/productDeletion.test.ts (all passing)
  - Tests: wrong code, wrong name, staff/customer rejection, order history protection, isActive stripping

## BUG: Iced Beverages products missing from customer menu (Feb 11 - second report)

- [x] Investigate why only 2 out of 10 products show per subcategory (Organic Oolong, Assam, Green Tea)
  - Root cause: Staff toggled isAvailable=0 on individual products via Staff Orders page
  - Organic Oolong: 8/10 NOT-AVAILABLE, Organic Assam: 8/10, Organic Green Tea: 8/10
- [x] Check product-level isAvailable, isInStock, isActive, availableInstore flags
- [x] Fix affected products so all show on customer menu
  - Restored isAvailable=1 for all Iced Beverages products (24 products restored)

## BUG: No way to reactivate inactive products in Admin (Feb 12)

- [x] Add Reactivate button in ProductEditDialog for inactive products
- [x] Add quick Reactivate action in products table row for inactive products
  - Inactive products now show a green "Reactivate" button in the Status column
  - ProductEditDialog shows "Reactivate" button instead of "Deactivate" for inactive products

## BUG: Zilla Wrap not showing on customer menu after reactivation (Feb 12)

- [x] Investigate why Zilla Wrap doesn't appear on customer menu despite isActive=true
  - Root cause: isAvailable=0 (staff toggle) was not reset when product was reactivated
  - getFullMenu filters by BOTH isActive AND isAvailable
- [x] Check isAvailable, availableInstore, isInStock flags on Zilla Wrap
  - isActive=1, isAvailable=0, isInStock=1, availableInstore=1, availableDelivery=1
- [x] Fix the issue so reactivated products appear on customer menu
  - Fixed Zilla Wrap data: set isAvailable=1
  - Fixed reactivateProduct procedure: now also sets isAvailable=true when reactivating

## Tiered Delivery Charges (Feb 12)

- [x] Investigate current delivery charge logic in code
  - Two places in routers.ts (line ~216 and ~3572) with flat ₹100
  - Google Maps Distance Matrix API available via server/_core/map.ts
  - Free delivery for orders ≥₹2500 stays
- [x] Implement tiered delivery charges: 0-10km ₹100, 10-15km ₹200, 15-25km ₹300, 25+km ₹400
  - Created server/deliveryCharge.ts with calculateDeliveryCharge() and getChargeForDistance()
  - Uses Google Maps Distance Matrix API via server/_core/map.ts
  - Updated both logged-in and guest order creation flows
  - Fallback to ₹100 if API fails
- [x] Do NOT modify order #357 (per user instruction)
- [x] Update frontend checkout to show calculated delivery charge
  - Added trpc.orders.getDeliveryCharge query triggered by address input
  - Shows distance, tier label, and calculated charge
  - Shows FREE for orders ≥₹2,500
  - Updated Cart.tsx to show all 4 tiers
- [x] Update chatbot knowledge base with delivery charge tiers
  - Added "Delivery Charges" section to chatbot system prompt with exact tiers
  - Updated Promotions section with distance-based delivery info
- [x] Write tests for tiered delivery charge calculation
  - 9 tests in server/deliveryCharge.test.ts (all passing)
  - Tests: all 4 tiers, boundary values, labels, rounding

## Staff Orders Availability Toggle Confirmation (Feb 12)

- [x] Add confirmation dialog when staff toggles product availability off
  - AlertDialog shows product name with orange warning
  - Requires clicking "Yes, Hide Product" to confirm
- [x] Add confirmation dialog when staff toggles subcategory availability off
  - AlertDialog shows subcategory name, channel (In-Store/Delivery/Pickup), and product count
  - Orange warning: "This will hide X products from customers immediately"
  - Requires clicking "Yes, Hide from Customers" to confirm
- [x] Show warning: "This will hide [name] from all customers. Are you sure?"
- [x] For subcategory toggles, show count of affected products
- [x] Turning ON does not require confirmation (instant)

## Update Running Banner Ticker (Feb 12)

- [x] Replace "₹100 Flat Delivery" text with tiered delivery pricing info
- [x] Updated to "Delivery from ₹100 · Distance-based charges apply"

## Voice-First Multilingual Maami Bot (Feb 12)

- [x] Research TTS API options (OpenAI TTS, browser Web Speech API, etc.)
  - Using OpenAI-compatible TTS via Forge API with "nova" voice (warm & friendly)
- [x] Build backend TTS endpoint to convert bot responses to speech
  - Created server/tts.ts with textToSpeech() and getVoiceForLanguage()
  - Uploads generated audio to S3 and returns public URL
- [x] Integrate Whisper transcription for voice input (already available in template)
  - voiceChat mutation: records audio → uploads to S3 → Whisper transcription → LLM → TTS → returns audio URL + text
- [x] Auto-detect language from speech and respond in same language
  - Whisper auto-detects language, passes it to LLM with instruction to respond in same language
  - LLM system prompt updated with multilingual voice support section
- [x] Build voice-first chat UI with mic button, waveform animation, and audio playback
  - Created VoiceChatWidget.tsx replacing old ChatWidget
  - Large pulsing mic button as primary interaction
  - Visual states: idle, recording (red pulse), processing (spinner), playing (speaker animation)
  - Auto-plays bot voice response
  - Text input as secondary option
  - Greeting bubble: "Nǐ hǎo! வணக்கம்! 👋 Tap to talk — I speak your language!"
- [x] Update chatbot system prompt for multilingual voice responses (warm & friendly)
  - Added "Multilingual Voice Support" section to system prompt
  - Instructs bot to respond in same language, use shorter sentences for voice
- [x] Support key languages: English, Tamil, Hindi, Mandarin Chinese
  - All supported via Whisper (auto-detect) + LLM (multilingual) + TTS (multilingual)
- [x] Write vitest tests for voice endpoints
  - 10 tests in server/voiceChat.test.ts (all passing)
  - Tests: TTS voice selection, input validation, procedure availability

## Revert: Remove voice/TTS, keep text-only chatbot (Feb 12)

- [x] Removed all speechSynthesis / Web Speech API code
- [x] Removed voice recording, mic button, audio playback, mute button
- [x] Kept text input always visible (no toggle needed)
- [x] Kept suggested prompts and chat message display
- [x] Updated greeting bubble to text-friendly message
- [x] Updated header subtitle to "Your ordering assistant"
- [x] Auto-focus text input when chat opens

## Exclude staff from Top Customers analytics (Feb 12)

- [x] Filter out staff member Rinold Thousen from Top Customers list
- [x] Scalable approach: exclude ALL staff/admin users by role (not just Rinold)
- [x] Exclusion works by both userId and phone number matching
- [x] Added vitest tests for staff exclusion logic (4 tests passing)

## Color-Coded Order Cards & Tab Filters (Feb 14)

- [x] Add tab filters to admin orders page: All, In-Store, Delivery, Pickup
- [x] Color-code order cards by order type (delivery=blue, in-store=green, pickup=purple)
- [x] Add visible order type badge with icon on each order card
- [x] Color-coded left border on each row for instant visual scanning
- [x] Active order count badges (pulsing red) on each tab
- [x] Table number shown for in-store orders
- [x] Write vitest tests for the new filtering logic (11 tests passing)

## New Delivery Order Notification Sound (Feb 14)

- [x] Add auto-refresh to orders list (polls every 20 seconds with green pulse indicator)
- [x] Detect new delivery orders arriving between refreshes (compares order IDs)
- [x] Generate unique, attention-grabbing notification sounds (Web Audio API synthesized)
  - Delivery: urgent triple-ascending chime with vibrato + staccato burst
  - Pickup: pleasant double-ding bell tones
  - In-store: warm single chime
- [x] Play sound + visual flash alert (amber pulse + ring + bouncing NEW! badge)
- [x] Also alert for new pickup and instore orders (delivery prioritized)
- [x] Add mute/unmute toggle with Sound ON/OFF button + Test button
- [x] Sound preference persisted in localStorage
- [x] 12 vitest tests passing for detection logic and preference persistence

## Staff Orders Page - Notification Sounds (Feb 14)

- [x] Add useOrderNotification hook to Staff Orders page (replaced old MP3-based system)
- [x] Add sound toggle and test button to Staff Orders header (matching admin style)
- [x] Add auto-refresh indicator to Staff Orders page (green pulse badge)
- [x] Add visual highlight (amber pulse + NEW! badge) for new orders on Staff Orders

## Channel Analytics - Period History & Cumulative Views (Feb 14)

- [x] Investigate current delivery data schema and upload logic — already retains all periods
- [x] Ensure all uploaded periods are retained (not overwritten) — confirmed, each period is a separate row
- [x] Add period selector to Channels tab: Current Range, All Time, YTD, and individual period dropdown
- [x] Add "All Time" cumulative view (from April 2024 to today)
- [x] Add "Year to Date" cumulative view for current year
- [x] Add Upload History table showing all past periods with order counts, Zomato/Swiggy/Dine-in breakdown, and grand total
- [x] Click any period in history table to view its channel analytics
- [x] Added getDeliveryPeriods tRPC procedure to list all uploaded periods
- [x] Upload handler now refreshes both channel data and periods list
- [x] Write vitest tests for period selection logic (10 tests passing)

## Remove Biang Biang Workshop Banner (Feb 14)

- [x] Remove the workshop banner from the homepage — set Biang Biang workshop status to "completed" in DB
- [x] Remove the "Book Your Spot" booking link — banner auto-hides when no published workshops exist
- [x] Keep workshop/events infrastructure intact for future use and photo uploads

## BUG: Grand Total in Upload History shows Unicode escape (Feb 14)

- [x] Fix Grand Total column showing \u20B9 instead of ₹ symbol in Upload History table — was escaped Unicode, replaced with actual ₹ character

## Predictive Analytics - Predictions Tab (Feb 14)

- [x] Investigate order items schema and historical data availability (Jan 2026+) — 42 days of data, 416 food items sold
- [x] Investigate food item categorization to filter out drinks — Food category ID identified, excludes Iced/Hot Beverages and Sweet Bites
- [x] Build backend: Monthly revenue projection with day-of-week weighting
- [x] Build backend: Item-level day-of-week demand forecast (food items only)
- [x] Build backend: Trend detection (items trending up/down, 2-week comparison)
- [x] Build backend: Procurement planner (next 7 days expected demand per item per day)
- [x] Build backend: Accuracy tracking (predicted vs actual comparison)
- [x] Add "Predictions" tab to Analytics dashboard (separate PredictionsTab.tsx component)
- [x] Frontend: Monthly Projection section with confidence range, progress bar, vs previous month
- [x] Frontend: Item Demand Heatmap (Item × Day of Week with color-coded cells)
- [x] Frontend: 7-Day Procurement Forecast table
- [x] Frontend: Rising/Declining Items trend alerts (side by side cards)
- [x] Frontend: Accuracy Report with actual revenue/orders and top items
- [x] Frontend: Methodology explainer card
- [x] Write vitest tests for prediction logic (15 tests passing)

## BUG FIX: Analytics Dashboard Issues (Feb 14)

- [x] Fix Grand Total in Upload History to include website sales (currently only shows Petpooja delivery data)
- [x] Add period selector to Predictions tab (1 week, 2 weeks, this month, past month, etc.)
- [x] Fix tab layout — GST Report pushed to second row and barely visible, clean up tab presentation
- [x] Fix daily average calculation for food items — Biang Biang shows 2/day avg but sells 4.7 on Sundays, likely dividing by all calendar days instead of operating days
- [x] Include delivery channel data (Petpooja) in prediction calculations for complete demand forecasting
- [x] Pass period selector dates to procurement forecast and trend alerts

## Predictions Improvements (Feb 14 - Part 2)

- [x] Fix ChickGozilla zero-day predictions — use minimum baseline instead of dashes for items with sparse data
- [x] Add total sales/revenue prediction (all categories including drinks, sweet bites) based on selected period
- [x] Add overall daily revenue/order projection section to PredictionsTab

## Analytics Improvements (Feb 15)

- [x] Fix GST tab layout — tabs overflow to second row on smaller screens, add horizontal scrolling
- [x] Add delivery item name mapping for consolidated predictions (case-insensitive matching)
- [x] Add Excel export for Predictions tab data (Total Sales Forecast, Item Demand Heatmap)
- [x] Fix getTotalSalesForecast SQL bug — websiteDowData query joins orders+order_items inflating SUM(totalAmount) by ~3.7x

## Delivery Area Update (Feb 15)

- [x] Add Thiruverkadu to delivery areas dropdown list (pincode 600077, ₹50 delivery charge)

## Payment Tracking Improvements (Feb 15)

- [x] Fix order #432 — added Verify Razorpay button to recover missed webhook payments
- [x] Identify and fix all 3 missing Razorpay payments — added Verify Razorpay button for all pending orders with razorpayOrderId
- [x] Add Razorpay payment verification endpoint (verifyRazorpayPayment procedure)
- [x] Add staff payment status controls — Collect Payment records who/when, Verify Razorpay checks API
- [x] Track who collected payment and when (paymentCollectedBy, paymentCollectedAt columns added)
- [x] Add walkout/unpaid flag for accountability tracking (markWalkout procedure with WALKOUT badge)
- [x] Show payment status prominently in Admin Orders (dialog + list view buttons)

## Staff Orders - Collect Payment Fix (Feb 16)

- [x] Add Collect Payment button to Staff Orders completed tab for orders with pending payment
- [x] Show payment method selector (cash/UPI/card/Swiggy Dineout/Zomato Dineout/EazyDiner/Other) when collecting payment
- [x] Update payment badge from "Pay at Counter" to "Paid (Cash)" / "Paid (UPI)" etc. after collection
- [x] Ensure payment status reflects consistently between Staff Orders and Admin pages
- [x] Fix backend confirmPaymentManually to store staff name (not user ID) in paymentCollectedBy
- [x] Fix verifyRazorpayPayment to store staff name (not user ID)
- [x] Fix Drizzle schema paymentCollectedBy from int to varchar(255)

## Fix Item Availability Toggle (Feb 17)

- [x] Investigate why "Out" items can't be toggled back to "Available" on Staff Orders page
  - Root cause: toggle updated `isAvailable` but menu page checks `isInStock` — two separate fields were out of sync
- [x] Fix the toggle mutation to reliably switch items between available and out-of-stock
  - Server now updates BOTH `isAvailable` AND `isInStock` simultaneously
- [x] Fix invalidation: was calling `utils.menu.getProducts.invalidate()` but data fetched via `admin.getAllProducts` — now invalidates both
- [x] Synced existing DB data where isAvailable and isInStock were out of sync (Strawberry Mochi had isAvailable=1 but isInStock=0)
- [x] Ensure toggle state persists and reflects correctly across pages (Staff Orders, Menu, Admin)
- [x] Test the toggle thoroughly before delivering

## BOBALOVE10 Discount Bug - Order #445 (Feb 17)

- [x] Investigate order #445: BOBALOVE10 discount shows ₹123 instead of expected ₹305 (10% of ₹3,050)
  - Root cause: Discount was calculated at checkout on original 3 items (₹1,225 → 10% = ₹122.50)
  - 5 custom items added later by staff (₹1,825) brought subtotal to ₹3,050 but discount was NOT recalculated
- [x] Fix addItemsToOrder: now looks up discount code, recalculates if percentage-based
- [x] Fix addCustomItemToOrder: same recalculation logic added
- [x] Respects maxDiscountAmount cap for percentage discounts
- [x] Fixed order #445 in database: discount ₹305, total ₹2,882.26 (was ₹3,073.88)
- [x] 6 vitest tests passing for discount recalculation logic

## Birthday Free Drink Bug - Order #447 (Feb 17)

- [x] Fix order #447 in database: Tiramisu Oolong Latte (₹465) free, GST on net ₹245 only
  - Subtotal ₹710, Discount ₹465, Net ₹245, GST ₹6.13+₹6.13, Total ₹257.26
  - Set birthdayCodeUsedYear=2026 for customer
- [x] Root cause: NO birthday detection logic exists in order creation flow
- [x] Add birthday detection to orders.create procedure — auto-apply free drink for birthday week
  - Checks birthMonth/birthDay within 3-day window (birthday week)
  - Picks the most expensive item in the order to make free
  - Recalculates GST on net amount after discount
  - Stores 'BIRTHDAY_FREE_DRINK' as discountCode on the order
- [x] Track birthdayCodeUsedYear so each customer gets only one free drink per year
- [x] Birthday discount badge visible in Admin order detail dialog (shows BIRTHDAY_FREE_DRINK code)
- [x] 15 vitest tests passing for birthday detection logic
- [ ] (Future) Add birthday banner on Checkout page for customer visibility
- [ ] (Future) Add birthday indicator badge on Staff Orders for walk-in customers

## Blog Content Upload (Feb 17)

- [x] Review and upgrade Blog 1: Biang Biang Noodles
- [x] Review and upgrade Blog 2: Discover Authentic Taiwanese Food
- [x] Review and upgrade Blog 3: Meet ChickGozilla
- [x] Upload all three blogs to the website (SEO-optimized HTML content)
- [x] Verify blogs display correctly on the Blog page (HTML rendering confirmed)
- [x] Convert blog content from Markdown to HTML (BlogArticle.tsx uses dangerouslySetInnerHTML)

## The Leela Hyderabad Popup Event (Feb 20)

- [x] Create popup_registrations database table for interest registration
- [x] Create backend procedures: registerInterest, getRegistrations (admin)
- [x] Build dedicated event page (/leela-hyderabad) with poster, Theresa's story narrative, and registration form
- [x] Include Theresa Hu's personal story/vision narrative on the event page (editorial style)
- [x] Event dates: 5-8 March (dinner), 6-8 March (masterclass) per poster
- [x] Registration form: name, phone, email, event type (dinner/masterclass), date selection
- [x] Dinner dates: 5-8 March 2026 (7PM-12AM)
- [x] Masterclass dates: 6-8 March 2026 (1PM-3PM)
- [x] Add landing page announcement banner linking to event page
- [x] Add route in App.tsx for /leela-hyderabad
- [x] Write vitest tests for registration procedures (9/9 passed)
- [x] Verify complete flow works end-to-end

- [x] Published: The Leela Hyderabad event page live

## Admin Panel: Leela Registrations & Cleanup (Feb 20)
- [x] Add Leela Registrations tab to Admin panel (Events dropdown)
- [x] Show registration list with name, email, phone, event type, dates, guests, status
- [x] Add filtering by event type (dinner/masterclass) and search
- [x] Add ability to update registration status (registered/confirmed/cancelled)
- [x] Add CSV export for registrations
- [x] Add summary cards (total, dinner count, masterclass count, total guests)
- [x] Delete all test workshops from database
- [x] Delete all test Leela event registrations from database

## Bug Fix: Leela Registrations not showing in Admin (Feb 21)
- [x] Investigate why registrations not appearing in Admin Leela Registrations tab (slug mismatch: form uses 'leela-hyderabad-march-2026', admin queried 'leela-hyderabad')
- [x] Fix the query/display issue (aligned Admin query slug + updated Raqeb's record slug)

## Itemwise Sales Report & Export Excel Fix (Feb 21)
- [x] Build itemwise sales report backend procedure (aggregate order_items by product for date range)
- [x] Build itemwise sales report UI in Admin (Itemwise tab with category grouping, search, sort, CSV export)
- [x] Add Export Channels Report button on Channels tab (CSV export with channel breakdown)
- [x] Test both features (7/7 vitest tests passed, UI verified in browser)

## Export to Excel Formatting Fix (Feb 21)
- [x] Review all export functions across Analytics tabs
- [x] Ensure header row Export Excel button works (Sales Report export)
- [x] Ensure Itemwise tab export is neatly formatted Excel (.xlsx)
- [x] Ensure Channels tab export is neatly formatted Excel (.xlsx)
- [x] Upgrade ALL exports from CSV to proper Excel (.xlsx) with exceljs formatting
- [x] Add formatted headers, column widths, ₹ currency formatting, alternating rows, branded dark red headers
- [x] Test all exports in browser — all 3 exports download correctly (Itemwise 17KB, Channels 10KB, Sales 29KB)

## Channels Export SQL Fix (Feb 21)
- [x] Fix SQL GROUP BY error in Channels export (daily website orders query)
- [x] Changed from GROUP BY DATE(createdAt) to GROUP BY 1 pattern (compatible with only_full_group_by mode)
- [x] Write vitest tests for all export data queries (7/7 passed)
- [x] Verify all 3 exports download correctly: Sales Report (29KB), Itemwise (17KB), Channels (10KB)

## Leela Registrations Cleanup (Feb 21)
- [x] Inspect popup_registrations table for test/fake entries
- [x] Delete test registrations (IDs 30007-30010: Test User, Test User 2 and duplicates)
- [x] Verify only 3 real bookings remain (Raqeb, Ashreta, Kiran)

## Leela Registrations Export Excel (Feb 22)
- [x] Create backend endpoint /api/export/leela-registrations as formatted .xlsx
- [x] Include: Customer Name, Email, Phone, Event Type, Date, Number of Guests, Status
- [x] Add branded formatting (dark red headers, column widths, borders)
- [x] Add Summary by Date sheet (registrations, guests, confirmed per date/event type)
- [x] Add Export Excel button to Leela Registrations admin tab
- [x] Test export in browser — 8.2KB, 2 sheets, all 3 real registrations present

## Stamp Bug Investigation - Pramoth (Feb 23)
- [x] Investigate why Pramoth Selvanathan (pramoth.dsg@gmail.com) has 0 stamps with ₹4,284 spent
- [x] Check loyalty_stamps table for Pramoth's records
- [x] Check orders table for Pramoth's completed orders
- [x] Root cause: Stamps working correctly — earned 10 stamps, auto-redeemed for free drink voucher (REWARDMLWNHUC7XJGE), stampCount reset to 0
- [x] No bug — 0/10 is correct (new cycle after redemption)

## Database Backup Download Fix (Feb 23)
- [x] Investigate current backup/download implementation
- [x] Identify why downloaded backup produces gibberish (raw JSON opens in browser tab)
- [x] Backup JSON is valid and data is retrievable
- [x] Build backend endpoint /api/export/database-excel as multi-sheet Excel (.xlsx)
- [x] 13 sheets: Summary, Sales Orders, Order Items, Customers, Guest Orders, Payments, Loyalty & Stamps, Rewards, Products & Menu, Event Orders, Discounts, Store Locations, Leela Registrations
- [x] Add formatted headers, column widths, ₹ currency formatting, date formatting
- [x] Add Download as Excel button (green) to backup admin UI header
- [x] Fix JSON download to trigger file save instead of opening in browser tab
- [x] Test Excel download — 185KB, 13 sheets, all data readable and verified

## Rewards Column & Staff Reminder (Feb 23)
- [x] Add backend query to fetch unredeemed rewards count per customer (getAllCustomers + getRecent)
- [x] Add Rewards column to admin customer list showing unredeemed reward count with green pulsing 🎁 badge
- [x] Show reward details (voucher code, type, expiry) on hover tooltip
- [x] Add reward reminder banner on Staff Orders page — green banner with Gift icon, voucher code, expiry
- [x] Test both features in browser — verified on admin (3 customers with rewards) and staff (2 orders with banners)

## Customer Stamp Audit (Feb 23)
- [x] Query all customers with stamps > 0 and their order history
- [x] Calculate expected stamps based on actual spending (1 per ₹450 + 1 welcome bonus per first order)
- [x] Identify 26 customers with discrepancies — ALL are from legitimate physical card transfers by staff
- [x] No database fixes needed — stamps are correct (physical card transfers are intentional)
- [x] Enable sorting on the Rewards column in admin customer list
- [x] Test and verify — Rewards column sorts correctly (desc/asc), groups reward holders at top

## Per-Outlet Product Availability (Feb 23)
- [x] Schema already has availableAtPalladium/availableAtTnagar on products & subcategories
- [x] Backend procedures already exist (toggleProductOutlet, toggleSubcategoryOutlet)
- [x] Added bulk toggle procedure for subcategory-level outlet control
- [x] Built dedicated Outlet Availability admin page with toggle grid (Menu > Outlet Availability)
- [x] Subcategory-level bulk toggles (e.g., all ChickGozilla items at Palladium)
- [x] Customer-facing menu already filters by outlet — verified working
- [x] Stats: 124 products, 84/124 at Palladium, 124/124 at T.Nagar, all toggles functional

## Outlet Availability Toggle Fix (Feb 23)
- [x] Show ALL products on customer menu regardless of outlet availability (don't hide them)
- [x] Mark unavailable-at-outlet products with orange 'Not at This Outlet' overlay instead of hiding
- [x] Fix T.Nagar/Palladium missing items (Blueberry, Mango hidden due to isAvailable:0 filter)
- [x] Root cause: frontend filtered by isAvailable instead of isActive — fixed
- [x] Test both outlets: Palladium shows 5 mochis (1 available, 4 not-at-outlet), T.Nagar shows 5 (2 available, 3 out-of-stock)

## Staff Rewards Bug Investigation (Feb 24)
- [x] Investigate why free drink rewards appear under staff names (e.g., Rinold Thousen)
  - Root cause: Rinold (staff role) placed in-store orders under his own account, earning 26 stamps and 2 free drink rewards before the staff exclusion was added
- [x] Determine if staff should be excluded from loyalty stamp accumulation
  - Yes: awardStamps procedure already had staff check (added earlier), but getRecent rewards lookup did not
- [x] Fix reward banner on Staff Orders page to not show for staff accounts
  - Added staff/admin user filtering in getRecent procedure's rewards lookup
  - Cleaned up Rinold's 2 unredeemed rewards and reset stamps for all 10 staff/admin users
- [x] Verify fix works correctly
  - 5 new vitest tests passing, browser verification confirmed banner removed

## Leela Registrations Excel Export - Add Notes Column (Feb 25)
- [x] Add Special Requirements/Notes column to Leela Registrations Excel export (both main export and backup export)

## Leela Registrations Excel Export - Add Notes Column (Feb 25)
- [x] Add Special Requirements/Notes column to Leela Registrations Excel export (both main export and backup export)

## Channels Analytics Dashboard Bugs (Feb 26)
- [x] Fix revenue mismatch: Feb 2026 row shows ₹5,07,319 but dashboard cards show ₹6,06,412
  - Root cause: getCombinedChannelAnalytics was summing both overlapping uploads (mid Feb + full Feb)
  - Fix: Added deduplication logic - newer uploads that fully cover older ones take priority
- [x] Fix Website/Direct revenue: shows ₹3,34,207 but actual is ₹2,98,052
  - Root cause: Website query used Petpooja period dates (Jan 27-Feb 26) instead of calendar month (Feb 1-28)
  - Fix: Parse periodLabel to extract calendar month dates for website order enrichment
- [x] Fix date range: Current Range shows Jan 27 - Feb 26 instead of Feb 1 - Feb 26
  - Root cause: Frontend used raw periodStart/periodEnd from Petpooja upload
  - Fix: Frontend now derives calendar month dates from periodLabel for full-month periods
- [x] Investigate double-counting from two Feb delivery uploads (mid Feb 2026 + February 2026)
  - Confirmed: mid Feb (Feb 1-14, 114 orders) fully contained within Feb 2026 (Jan 27-Feb 26, 222 orders)
  - Both Insights and Channel Analytics procedures now deduplicate overlapping uploads
- [x] Date range selector already exists (Current Range / All Time / YTD / uploaded period dropdown)

## Remove Predictions Tab (Feb 26)
- [x] Remove Predictions tab from Analytics dashboard - inaccurate extrapolation-based predictions

## Reward Redemption Tracking & Proof (Feb 26)
- [x] Investigate Gurushi Jain's reward status — NOT redeemed (voucher REWARDMLMHNGMRIMN4, expires May 15)
- [x] Add backend procedure for staff/admin to redeem rewards (staffRedeemReward)
- [x] Add redeem button on Staff Orders page so staff can mark rewards as used
- [x] Improve admin visibility of reward redemption status (redeemed vs unredeemed vs expired)
- [x] Add customer-facing redemption history/proof on Profile page loyalty section

## Payment Status Bug Fix (Feb 26)
- [x] Fix payment status not updating to 'completed' when staff collects payment via Zomato Dineout, UPI, etc.
  - Root cause: updateStatus procedure recorded paymentMethod but never set paymentStatus to 'completed'
  - Fixed: Now sets paymentStatus='completed' and paymentCollectedAt when paymentMethod is provided
- [x] Ensure Collect Payment flow marks paymentStatus as 'completed' for all payment methods
- [x] Fix existing orders — 317 completed orders with pending payment status all corrected in database

## Palladium Location in Monthly Report Bug (Feb 26)
- [x] Investigate why 'Palladium' appears in the monthly order report when all sales were at TNagar
  - Root cause: 36 orders had outletId=1 (Palladium) instead of outletId=2 (T Nagar)
  - Excel export had hardcoded outlet name mapping
  - 10 fallbacks across routers.ts and _core/index.ts defaulted to outletId 1 (Palladium)
- [x] Fix outlet mapping in Excel export to read from database instead of hardcoding
- [x] Fix all 36 orders reassigned to T Nagar (outletId=2), plus 18 with null outletId
- [x] Fix all 10 outletId || 1 fallbacks to outletId || 2 (T Nagar) across routers.ts and _core/index.ts
- [x] Fix backup export outlet mapping to also read from database

## Customer Database Excel Export (Feb 26)
- [x] Add backend endpoint /api/export/customer-database as formatted Excel (.xlsx)
- [x] Include: Name, Phone, Email, Type, Orders, Total Spent, Avg Order Value, Store Credit, Stamps, Lifetime Stamps, Active Rewards, Redeemed Rewards, Last Order
- [x] Add branded formatting (dark red headers, column widths, ₹ currency formatting, alternating rows, borders)
- [x] Add 3 sheets: Customer Database (all customers), Top Customers (top 30 by spending), Birthday Calendar
- [x] Add Export Excel button to Admin Customer Database page
- [x] 5 vitest tests passing

## Monthly Sales Excel Export Fix (Feb 28)
- [x] Investigate why Excel export shows confusing totals compared to dashboard for Feb 2026
  - Root cause: TOTAL summary row was in the same columns (F-J) as data rows, causing double-counting when users select a column to sum
  - Grand Total row was in column F (Taxable Amount) instead of column J (Total Amount)
  - The actual data (308 orders, ₹3,28,027.76) was correct - it was a formatting/layout issue
- [x] Fix: Moved summary to a separate 'Summary' sheet to prevent any column overlap
  - Summary sheet has: Category breakdown (F&B Orders, Workshops, Events), Grand Total, GST Breakdown, Payment Method Breakdown
  - Sales Report sheet now has only raw data rows with no totals that could be double-counted
  - Added note on Sales Report sheet pointing users to Summary sheet
  - Added legend for row color coding (Regular Order, Workshop, Event)

## Leela Event Test Bookings Cleanup (Feb 28)
- [x] Investigate unexpected test bookings on Leela Event
  - Root cause: popup.test.ts inserted real records into live popup_registrations table every time pnpm test ran
  - 14 test entries created (7 runs x 2 inserts each) with test@example.com and test2@example.com
- [x] Identify test vs real bookings (14 test, 15 real)
- [x] Delete only test bookings, preserve real ones (15 real registrations intact)
- [x] Fix popup.test.ts to clean up after itself (immediate DELETE after each insert, plus afterAll cleanup)

## Leela Event Banner - Replace Registration (Mar 5)
- [x] Replace "Register Interest" button on Leela event banner (landing page) with "Please call +918712688658 for reservations"

## Remove Leela Event Banner & Archive (Mar 10)
- [x] Remove the Leela event banner from the landing page (Home.tsx)
- [x] Archive the Leela event page (/leela-hyderabad route removed from App.tsx)
- [x] Remove Leela-related nav links if any (none found in Header/nav)
- [x] Keep admin Leela registrations tab for historical data access (DO NOT delete registration data from DB)
- [x] Keep popup_registrations table data intact — only remove public-facing UI (15 real registrations preserved)

## Homepage Redesign + CMS (Mar 11)
- [x] DB: Add homepage_sections table for CMS content (announcement bar, hero, freshness story)
- [x] DB: Add featured + featuredOrder columns to products table
- [x] Backend: tRPC procedures for homepage sections CRUD (admin)
- [x] Backend: tRPC procedure to get/set featured products
- [x] Backend: Public procedure to fetch homepage data for rendering
- [x] Frontend: Replace marquee with static announcement bar (CMS-driven)
- [x] Frontend: Change hero video overlay to warm amber
- [x] Frontend: Add Freshness Story section after hero (CMS-driven)
- [x] Frontend: Add Customer Favourites carousel (from featured products)
- [x] Frontend: Implement 2-level tabbed menu on homepage (category tabs + subcategory chips + product grid)
- [x] Frontend: Use painting green (#5e6c48) for CTA buttons
- [x] Frontend: Consistent warm tan background across all sections
- [x] Admin: Homepage Settings page with section editors (Announcement, Hero, Freshness Story, Featured Items)
- [x] Admin: Featured product selector with toggle and reorder
- [x] Tests: Vitest for homepage CMS procedures (11 tests passing)

## Maami Bot - Prominence + Analytics (Mar 11)
- [x] Investigate current bot implementation and placement
  - ChatWidget.tsx: floating button bottom-right with greeting lady image, bounce animation, speech bubble
  - chatbot.ts: full LLM-powered bot with intent detection, menu search, store info, workshops, blog
  - No conversation logging or analytics currently exists
- [x] Add conversation logging to database (store questions, responses, timestamps, user info)
- [x] Add topic/intent categorization for bot queries (intents detected per message)
- [x] Build admin dashboard tab showing bot analytics (popular questions, usage trends, topics)
- [x] Make bot more prominent on the website (bigger trigger, "Ask Maami" label, stronger glow/pulse, earlier greeting)
- [x] Tests for bot analytics procedures (5 tests passing)

## Homepage Redesign - Incomplete Items (Mar 11)
- [x] Add Quick Add (+) buttons to Customer Favourites carousel cards
- [x] Replace 4 video category tiles with 2-level tabbed menu (Category tabs → subcategory chips → item cards)
- [x] Ensure tabbed menu links to actual product pages for variant/size selection

## Quick Add Modal Fix (Mar 11)
- [x] Fix Quick Add buttons on homepage to open ProductCustomizationModal inline instead of navigating to /menu page
  - Customer Favourites carousel: Quick Add (+) button opens modal with full variant selection
  - Explore Our Menu grid: Clicking product card opens modal with full variant selection
  - Food items show: image, description, special instructions, quantity, Add to Cart
  - Bubble tea items show: size, boba type, sugar level, ice level, add-ons, Add to Cart
  - No navigation away from homepage — modal opens as overlay
- [x] Tests: Vitest for Quick Add data requirements (8 tests passing)

## Outlet-First Ordering Flow (Mar 11)
- [x] Outlet/order-type selection gateway in "How Would You Like to Order?" section
  - Clicking Dine-In/Delivery/Pickup shows outlet selector (T Nagar / Palladium)
  - Delivery auto-selects T. Nagar (no outlet choice needed)
  - Saves order type + outlet to cart context
  - Section updates to show confirmation after selection with Change button
- [x] Sticky selection pill showing current outlet + order type with "Change" option
- [x] Filter Explore Our Menu section by outlet availability
  - Auto-switches to first category with available products when outlet changes
  - Shows "No items available" message when a category has 0 products at selected outlet
  - Food tab stays selected when clicked (no auto-switch loop)
- [x] Redirect "Order Online & Save" CTA to scroll to "How Would You Like to Order?" section
- [x] Quick Add pre-check: if no outlet selected, show brief order-type + outlet selector first
  - Pending Quick Add opens automatically after outlet selection
- [x] Tests for outlet-first ordering flow (8 vitest tests passing)

## UI Fixes - Outlet Display & Product Availability (Mar 11)
- [x] Fix duplicate order-type display: sticky pill only shows when scrolled past the How To Order section (IntersectionObserver)
- [x] Show all products in Explore Menu regardless of outlet, with "Not available at [outlet]" stamp overlay on unavailable items
  - Products shown with grayscale/opacity treatment and dark rotated badge
  - Product name and price shown in muted text
- [x] Disable Quick Add for unavailable items (no Quick Add button, toast on click)

## Bug Fix - Logo Navigation (Mar 11)
- [x] Fix Taiwan Maami logo in navbar: scrolls to top when on homepage, navigates to / from other pages

## Bug Fix - Cart Back to Menu (Mar 11)
- [x] Fix "Back to Menu" / "Browse Menu" buttons in Cart, CategorySubcategories, OrderConfirmation, and Profile to navigate to homepage /#explore-menu
- [x] Add hash-based scroll handler in Home.tsx with retry mechanism for dynamic content loading

## Performance Fix - Image Loading (Mar 11)
- [x] Fix slow image rendering in Explore Our Menu section on homepage
  - Added server-side image proxy (/api/img) using Sharp for CloudFront/S3 images
  - CloudFront images reduced from 10.6 MB to ~11 KB each (99.9% reduction)
  - Serves WebP/AVIF based on Accept header with 1-year cache
- [x] Add lazy loading for off-screen product images (loading="lazy" on all grid images)
- [x] Use Cloudinary transforms for proper image sizing (q_auto,f_auto,w_300 for Cloudinary URLs)
- [x] Optimize Customer Favourites carousel images with responsive srcset
- [x] Updated imageOptimizer.ts to route CloudFront URLs through server proxy

## Bug Fixes (Mar 12)
- [x] Remove "Made with Manus" branding from the website
- [x] Fix Customer Favourites carousel: enforce outlet/order-type selection before Quick Add
- [x] Fix Customer Favourites carousel: show "Not available at [outlet]" stamp on unavailable items
- [x] Fix Customer Favourites carousel: disable Quick Add for items not available at selected outlet

## Bug Fixes (Mar 12 - Favourites Flow)
- [x] Force outlet+mode selection before Customer Favourites Quick Add can add items to cart
- [x] Prevent silent defaulting to previously stored outlet/mode when using carousel Quick Add
- [x] Track explicit mode choice via sessionStorage (resets each browser session)
- [x] Updated How Would You Like to Order section to show cards until explicit choice is made
- [x] Updated sticky selection pill to only show after explicit choice
- [x] Updated Explore Menu subtitle to reflect explicit choice state

## Bug Fixes (Mar 12 - Popup Event Notifications)
- [ ] Investigate and stop popup event registration emails still firing after event removed
- [ ] Identify source of "New Popup Registration: Master Class" and "Dinner" notifications
- [ ] Disable or remove the popup event notification trigger

## Bug Fixes (Mar 12 - Image Loading & Popup)
- [x] Fix image loading delays/blank images on homepage and menu page
- [x] Investigate /api/img proxy bottleneck causing slow image loads (removed server proxy, serve CloudFront images directly from CDN)
- [x] Disable popup event registration endpoint (Leela Hyderabad event is over)

## Bug Fixes (Mar 12 - Modal Availability)
- [x] Fix: Product customization modal opens for unavailable items and allows adding to cart
- [x] After outlet selection in Quick Add flow, check availability before opening modal
- [x] If item not available at selected outlet, show toast and don't open modal

## UI Fixes (Mar 12 - Hero CTA & Mobile Layout)
- [x] Remove CTA overlay from hero video section (doesn't flow with the rest)
- [x] Reduce height of Loyalty Programme section on mobile
- [x] Reduce height of Terms & Conditions / footer section on mobile
- [x] Ensure both sections display properly on mobile viewports


## Bug Fixes (Mar 12 - Text Readability)
- [x] Fix About Us page body text too light / low contrast against beige background
- [x] Ensure text is dark enough to be easily readable across all pages (changed --muted-foreground from #7a6a5f to #4a3a30)

## Feature: External Invoice Entry (Mar 12)
- [x] Enter The Leela Hyderabad popup invoice (Rs. 193,726.50) as event order EVT-LEELA-HYD-001 in Event Orders system (completed, fully paid)

## Bug Fixes (Mar 13)
- [x] Delete all test event orders (Test Customer, Draft, Rs.0) from database — 72 deleted, only EVT-LEELA-HYD-001 remains
- [x] Fix analytics dashboard monthly summary to include event order revenue in totals (Events column added to table, event revenue included in Grand Total per period)
- [x] Bug: Location selection lost when navigating from menu preview to full menu page via "View Full Menu" button
- [ ] Bug: Dine In location selection lost when navigating to full menu page via "View Full Menu" button (fix was incomplete - only covered delivery/pickup)

## Cookie & Cart Expiry (Mar 14)
- [x] Implement 4-hour cart expiry (clear cart after 4 hours of inactivity)
- [x] Reduce session cookie expiry from 1 year to 30 days

## Bug Fixes (Mar 15)
- [x] Fix analytics dashboard website sales total showing ₹3,13,213 instead of correct ₹1,32,126 for Mid March 2026

## Google Customer Reviews Integration (Mar 17)
- [x] Add Store Widget script to index.html head (all pages)
- [x] Add Survey Opt-in useEffect to Order Confirmation component

## Maami Bot Prominence (Mar 17)
- [x] Make Maami Bot more prominent and encourage customer usage

## Birthday Free Drink Abuse Fix (Mar 18)
- [x] Remove Deepi selvan's unearned stamp (1/10 stamps from ₹0 order)
- [x] Fix birthday drink to require at least one paid food item to qualify
- [x] Prevent loyalty stamps from being awarded on zero-value orders

## Analytics Dashboard Bug (Mar 19)
- [x] Fix discrepancy: Sales tab Total Revenue (₹5,43,594.48) vs Itemwise tab Total Revenue (₹5,04,965.00) for Jan-Feb 2026 — ₹38,629 difference
  - Root cause 1: INNER JOIN to products table excluded 45 custom items (productId=0) worth ₹16,239
  - Root cause 2: Sales tab showed totalAmount (incl. GST/delivery/discounts), Itemwise showed only lineTotal sum
  - Fix: Changed INNER JOIN to LEFT JOIN in 4 procedures (getItemwiseSalesReport, getSalesByCategory, getSalesBySubcategory, getProductPerformance)
  - Fix: Itemwise summary card now shows orderTotalRevenue (matching Sales tab)
  - Custom items now appear under "Custom Items" category in all reports

## Excel Export Formatting Overhaul (Mar 19)
- [x] Redesign all Excel exports with professional formatting
  - [x] Itemwise Sales Report export (3 sheets: Itemwise Sales, Category Summary, Subcategory Summary)
  - [x] Sales Report export (4 sheets: Sales Report, Summary, GST Summary, Payment Summary)
  - [x] Channels Report export (2 sheets: Channel Summary, Daily Breakdown)
  - [x] Leela Registrations export (2 sheets: Registrations, Summary by Date)
  - [x] Customer Database export (3 sheets: Customer Database, Top Customers, Birthday Calendar)
  - [x] Shared excelStyles.ts module with brand colors, fonts, borders, number formats
  - [x] Proper ₹ currency formatting, percentage formatting, DD/MM/YYYY dates
  - [x] Freeze panes, print setup (landscape A4), alternating row backgrounds
  - [x] 17 vitest tests for the formatting module

## Maami Partner Programme (Mar 19)
- [x] Database schema: partner_subscriptions, partner_referrals, partner_benefits_log, partner_config tables
- [x] Partner tiers: Founding (₹2,500/yr) and Regular (₹5,000/yr) with 15% tea discount
- [x] Free Biang Biang per visit at T. Nagar outlet (auto-applied in checkout)
- [x] Free Large Bubble Tea per visit at Palladium outlet (auto-applied in checkout)
- [x] Tea discount logic in checkout (15% off all teas, both outlets)
- [x] Referral code generation (unique per partner, e.g. PRIYA26ABC)
- [x] WhatsApp share integration (wa.me link with pre-written message)
- [x] Referral tracking: link new sign-ups to referring partner, auto-credit Maami Rupees
- [x] Maami Rupee (store credit) earned on referral (₹250 referrer, ₹100 referred)
- [x] Partner subscription page (/partner) with Razorpay payment
- [x] Partner badge (Founding = gold, Regular = standard) in dashboard
- [x] Partner dashboard (/partner/dashboard): benefits, referral stats, savings, WhatsApp sharing
- [x] Admin dashboard (/admin/partners): all partners, stats, config management, cancel subscriptions
- [x] Outlet-specific benefit logic (T. Nagar = Biang Biang, Palladium = Large Tea)
- [x] Checkout integration: Partner benefits preview in order summary
- [x] Partner link in navigation header
- [x] 17 vitest tests for Partner Programme backend logic (all passing)

## Partner Programme Fixes (Mar 19)
- [x] Fix Regular Partner price from ₹5,000 to ₹3,500/year (DB config + code fallback + frontend)
- [x] Fix tea discount: limit to 1 tea per visit (Partner's own drink only), not all teas in the order
- [x] Verified: referral credit already only triggers after referred person's Razorpay payment is confirmed (in verifyPayment, not subscribe)

## Partner Programme Secret Gate (Mar 19)
- [x] Add secret key gate to /partner and /partner/dashboard pages (key: tmpartner2026)
- [x] Hide "Partner" link from navigation header unless gate key is in session
- [x] Show "Coming Soon" page for visitors without the key
- [x] Verified: checkout integration is safe for non-partners (benefit check returns null and is skipped)

## Invoice Numbering Reset for FY 2026-27 (Mar 23)
- [x] Reset invoice number to 1 from April 1st 2026 (new financial year)
- [x] Implement financial year-aware invoice numbering logic (shared orderNumberHelper.ts)
- [x] Ensure previous FY invoices retain their numbers (query filters by FY start date)
- [x] Write tests to verify the reset logic (12 tests passing)

## Landing Page Food Banner (Mar 24)
- [x] Add clean banner announcing no food service today with apology
- [x] Display regular food timings (Mon-Fri 4pm-12am, Sat-Sun 12-3pm & 6pm-12am)
- [x] Keep it non-cluttering and dismissible (X button to close)

## Menu Toggle Bug - Onu Noodles (Mar 24)
- [x] Investigate why toggling different levels of food menu doesn't make Onu Noodles available
- [x] Fix the menu toggle logic (root cause: Omelette subcategory id=14 had availableInstore=0, blocking product-level settings)
- [x] Updated Omelette subcategory availableInstore/Delivery/Pickup to 1 — Omunoodles and Omurice now visible

## Automated Food Availability Scheduler (Mar 24)
- [x] Build time-based food availability logic (Mon-Fri 4PM-12AM, Sat-Sun 12-3PM & 6PM-12AM)
- [x] Beverages and Mochis remain available all day (12 Noon - 12 Midnight)
- [x] Filter food items from menu API response based on current time/day in IST
- [x] Admin UI to manage food time windows without code changes (Food Schedule tab in Admin Settings)
- [x] Write tests for the scheduler logic (51 tests passing)
- [x] Customer-facing food unavailability banner on Menu page (amber notice with schedule times)
- [x] Backend: foodSchedule.ts with IST time checking, DB persistence, 5-min caching
- [x] API: getFoodStatus (public), getFoodSchedule (staff), updateFoodSchedule (admin) procedures
- [x] Menu API filters out Food category (id=4) outside scheduled hours

## Event Inquiries Schema Fix (Mar 24)
- [x] Fix event_inquiries Drizzle schema to match actual DB columns (phone, email, company, serviceType, referenceNumber, etc.)
- [x] Update submitInquiry procedure with new column names and reference number generation
- [x] Update updateInquiryStatus procedure (adminNotes → internalNotes, added "completed" status)
- [x] Update AdminEvents.tsx to use new column names (email, phone, serviceType, preferredBeverages/Food)
- [x] Update Admin.tsx inquiry status dialog (adminNotes → internalNotes)
- [x] Update Events.tsx public inquiry form with new field names
- [x] Update events-workshops.test.ts and events.test.ts with new schema
- [x] All 872 tests passing, zero TypeScript errors

## Bug: Food category not showing on menu page (Mar 25)
- [x] Food tab missing from menu page category tabs - scheduler hides it outside food hours
- [x] Need admin override / manual toggle to force food on/off regardless of schedule
- [x] Add manual ON/OFF toggle switch for Food category in admin Food Schedule page
- [x] Manual override takes priority over time-based schedule

## Ice Cream Mochi - Single Select Flavor Add-on (Mar 26)
- [x] Change Ice Cream Mochi add-ons from quantity-based (None/1/2/3) to single-select flavor picker
- [x] Customer picks ONE flavor only, no quantity selector
- [x] Add selectionMode field to product_addons junction table to support 'single_select' vs 'quantity' modes
- [x] Update product modal UI to render radio-button style flavor picker for single_select add-ons

## Ice Cream Mochi - Disable Delivery (Mar 26)
- [x] Ice Cream Mochi should not be available for delivery orders (already disabled: availableDelivery=0, availablePickup=0)

## Remove Food Timing Banner & Revert to Full Hours (Mar 27)
- [x] Remove the food timing/availability banner from the customer-facing menu page
- [x] Revert food schedule default to regular full timings (12 PM - 12 AM daily)
- [x] Keep the Force ON/OFF toggle in admin Food Schedule settings

## Deployment OOM Fix (Mar 27)
- [x] Fix Vite build OOM (exit code 137) during deployment
- [x] Split Admin.tsx (10,914 lines) into 26 separate tab files under admin/tabs/
- [x] Added React.lazy() loading for all admin tabs
- [x] Added NODE_OPTIONS='--max-old-space-size=1536' to build script
- [x] Added manualChunks to Vite config for better code splitting

## Website Slow Loading After Deploy (Mar 28)
- [x] Optimize bundle size - replaced streamdown (10MB shiki + 2MB mermaid) with marked (lightweight)
- [x] Bundle reduced from 18MB to 4.2MB (77% reduction)
- [x] Build now succeeds even with 512MB memory limit
- [x] Site should load within 2-3 seconds

## Bug: Last Month Date Range Wrong (Mar 29)
- [x] "Last Month" date range shows Start: 1 Mar instead of 1 Feb, End: 28 Feb — start date is wrong
- [x] Fix: use new Date(year, month-1, 1) instead of mutating date with setMonth (avoids month overflow on day 29/30/31)

## Level 2 Offline Resilience for Staff POS (Mar 29)
- [x] Offline detection service (navigator.onLine + heartbeat ping every 5s)
- [x] IndexedDB order queue (idb-keyval with dedicated stores for orders, KOTs, sync-meta)
- [x] Offline order placement — save to IndexedDB when server unreachable (cash + instore/pickup only)
- [x] Temporary offline order numbering (OFF-001, OFF-002, etc.) with mutex lock for concurrency
- [x] Auto-sync engine — push queued orders to server when connectivity returns (sequential, throttled)
- [x] Conflict resolution — timestamp-based ordering, max 3 retries, failed orders preserved for manual retry
- [x] Offline KOT generation — store KOT data locally for local printing (auto-generated on queue)
- [x] Staff POS UI integration — amber "Offline Mode" banner with pending count, OfflineProvider context
- [x] Graceful degradation — only cash+instore/pickup allowed offline; delivery/online payment blocked
- [x] Vitest unit tests for offline queue, sync engine, conflict resolution (27 tests)
- [x] Vitest load simulation — 8 simultaneous table orders hitting queue (concurrent + sequential sync)
- [x] NO production test data — all tests use mocks only (idb-keyval fully mocked)
- [x] Server-side offlineCreatedAt support — orders.create and guest.createOrder accept original timestamp
- [x] Offline order confirmation page — /offline-order/:offlineId with sync status tracking
- [x] Cleanup service — auto-removes synced orders older than 24 hours from IndexedDB

## Offline Resilience Enhancements (Mar 29)
- [x] Offline KOT local print trigger — 80mm thermal format, Print All button, KOT preview dialog
- [x] Staff-facing sync dashboard — "Offline Queue" tab in Staff Orders with status badges, expandable order details, manual Sync/Retry, progress bar
- [x] Admin offline mode toggle — per-outlet (Palladium + T. Nagar) enable/disable in Admin > Settings > Offline Mode, stored in site_settings
- [x] Vitest tests for all three features (13 tests: KOT generation, batch print, sync dashboard data ops, admin API)

## Payment Method Fixes (Mar 29)
- [x] Order #0883: Change payment method from UPI to Cash
- [x] Order #0884: Change payment method from UPI to Swiggy Dine-out

## Bug Fixes (Mar 29)
- [x] Maami chatbot button overlaps Actions column edit buttons on admin page — hidden on /admin and /staff pages

## Product Catalog Excel Export/Import (Mar 29)
- [x] Server endpoint: Export all products to formatted Excel (ID, name, Chinese name, category, subcategory, prices, description, new description column)
- [x] Server endpoint: Import updated Excel to bulk-update product descriptions (with validation, error reporting)
- [x] Admin UI: Export button in Admin > Settings > Catalog Export/Import
- [x] Admin UI: Import with preview/confirm flow showing changed descriptions before applying
- [x] Vitest tests for export/import logic (6 tests: procedure existence, schema validation, unicode, large batch)

## OG Image / Social Preview Fix (Mar 30)
- [x] Fix missing Open Graph thumbnail image for Twitter/X and social media link previews
- [x] Fix broken structured data image URLs (double URL concatenation)
- [x] Add og:image:width, og:image:height, og:image:type meta tags for proper rendering
- [x] Replace AI-generated OG image with real storefront photo (1200x630, 121KB JPEG, Palladium interior)
- [x] Add twitter:site meta tag (@TaiwanMaami)
- [x] Remove person from storefront photo and use as OG image (AI inpainted, 1200x630, 127KB)
- [x] Fix SEO.tsx component overriding index.html OG tags with broken local URL — now uses CDN URL
- [x] Add twitter:site @TaiwanMaami to SEO.tsx component
- [x] Add og:image:width/height/type to SEO.tsx for proper rendering
- [x] Fix CDN image Content-Type: was serving application/octet-stream instead of image/jpeg — re-uploaded with correct MIME type
## Razorpay Failed Payment Reconciliation & Alerts (Mar 31)
- [x] Cross-reference 10 failed Razorpay payments (March 2026) against orders DB to find which were re-attempted
- [x] Build real-time payment failure alert system for staff POS (notify staff when Razorpay payment fails before customer leaves)
- [x] Backend: getFailedPayments query (detects stuck Razorpay orders within 24h)
- [x] Backend: verifyFailedPayment mutation (checks Razorpay API for captured payment, recovers if found)
- [x] Backend: cancelFailedPaymentOrder mutation (staff can cancel unrecoverable orders)
- [x] Frontend: PaymentFailureAlert component with red alert banner, call/verify/cancel actions
- [x] Integrated alert into Staff Orders page and Admin Orders tab
- [x] Audio alert for new failed payments, urgency badges for orders < 15 min old
- [x] Vitest tests for payment alert system (18 tests: auth, data shape, detection logic, time display)
## Wholesale Portal Update (Mar 31)
- [x] Replace wholesale portal page with "Coming Soon" message
## URGENT: Order Placement Failure (Apr 1)
- [x] Fix: "Unable to place your order right now" error on checkout page — customers at outlet unable to order
- [x] Root cause: FY reset on April 1st caused order number collision (UNIQUE constraint on orderNumber)
- [x] Fix: Order numbers now use FY-prefixed format (26-00001 for FY 2026-27) to prevent collisions
- [x] Updated ORDER BY to use createdAt DESC instead of CAST(orderNumber AS UNSIGNED) for mixed format compatibility
- [x] All 957 existing tests pass
## Razorpay Payment Flow Audit (Apr 1)
- [ ] Verify Razorpay payment flow works with new FY-prefixed order numbers (26-NNNNN format)
## Disable Palladium Ordering (Apr 1)
- [x] Disable pickup, delivery, and dine-in ordering for Palladium outlet (KOT printer not set up)
- [x] Added orderingEnabled flag to OUTLET_HOURS config
- [x] isOutletOpen returns unavailable when orderingEnabled=false
- [x] Disabled Palladium buttons in Menu.tsx (inline, full-page, modal selectors)
- [x] Disabled Palladium button in Home.tsx outlet selector
- [x] Checkout.tsx already blocks via isOutletOpen check
- [x] Updated businessHours tests - all 955 tests pass
## B2B/External Sales Entry System (Apr 1)
- [x] Analyze Leela payment TDS deduction and present findings (TDS @ 10% u/s 194J on ₹1,78,175 = ₹17,817.50)
- [x] Design B2B sales database schema (b2b_invoices + b2b_invoice_items tables)
- [x] Build backend tRPC procedures for B2B sales CRUD (list, create, getById, updatePayment, delete, summary)
- [x] Build admin UI page for entering and managing B2B sales (Admin → Reports → B2B Sales)
- [x] Integrate B2B sales into the monthly GST report (b2bSummary in getGstReport)
- [x] Write vitest tests for B2B sales feature (17 tests: access control, CRUD, validation, GST integration)
## Bug Fix: Last Month Date Filter (Apr 1)
- [x] Fix "Last Month" filter showing end date as 30th instead of 31st March (timezone bug: toISOString converts to UTC, IST dates shift back 1 day)
- [x] Fixed in Analytics.tsx and PredictionsTab.tsx — all date formatting now uses local timezone
- [x] Also fixed channel period date calculations in Analytics.tsx
## Bug Fix: GST Report B2B Integration (Apr 1)
- [x] Fix B2B invoice GST showing incorrectly in daily GST breakdown (Leela showing ₹78.88 CGST/SGST instead of ₹32,071.50 IGST)
- [x] B2B inter-state invoices now show IGST in separate B2B table, not mixed with retail CGST/SGST
- [x] Audit entire GST report for correctness with B2B data
- [x] Added IGST summary card (appears only when inter-state B2B invoices exist)
- [x] Separated Retail Orders GST table from B2B Invoices GST table
- [x] Summary cards labeled "Retail + B2B" for clarity
- [x] Database amounts verified correct (all in paise)
## URGENT Bug Fix: GST Report Export Inconsistency (Apr 1)
- [x] Fix GST numbers mismatch between on-screen display and exported Excel file
- [x] Ensure Export Excel GST Summary sheet matches the on-screen GST Summary Report exactly
- [x] Audit all export functions for data consistency with display
  - [x] Rewrote excelExport.ts to query b2b_invoices table
  - [x] GST Summary sheet now has 3 sections: Retail Orders GST (Daily), Event Orders GST, B2B/External Invoices GST
  - [x] B2B section shows IGST column (not split into CGST/SGST for inter-state)
  - [x] Combined GST Summary section matches on-screen getGstReport totals exactly
  - [x] Event orders removed from daily retail breakdown (own section)
  - [x] 18 vitest consistency tests validating export matches on-screen (990 total tests passing)

## Fix: Remove Event Orders from GST Export (Apr 2)
- [x] Remove Event Orders GST section from Excel export (events are already B2B invoices — double-counting)
- [x] Remove event order rows from Sales Report sheet
- [x] Remove event totals from Combined GST Summary calculations
- [x] Update tests to reflect removal

## Razorpay Test Mode (Temporary - Apr 2)
- [x] Swapped RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to test keys for partner program testing
- [x] Swap back to live keys after testing is complete

## Fix: KOT Report Peak Hours Recommendations (Apr 2)
- [x] Fix peak hours recommendations showing "High volume" for every time slot regardless of order count
- [x] Use meaningful thresholds (low/moderate/high) based on actual order distribution

## Add Order Type to Sales Report Export (Apr 2)
- [x] Add Order Type column (Delivery/Pickup/Dine-in) to Sales Report sheet in Excel export
- [x] Ensure the column is populated from the orders table orderType field

## Enhanced Summary Sheet with Monthly Breakdown & Insights (Apr 2)
- [x] Add month-wise sales breakdown table (orders, revenue per month)
- [x] Add order type breakdown per month (Delivery/Pickup/Dine-in counts and revenue)
- [x] Add payment method breakdown per month (with % of revenue)
- [x] Add average order value insights (overall, by order type, by month)
- [x] Add growth/trend indicators (MoM change)

## Feature: Order Type Breakdown on Analytics Dashboard (Apr 2)
- [x] Add order-type (Delivery/Pickup/Dine-in) breakdown section to Analytics dashboard
- [x] Show monthly order counts and revenue split by order type
- [x] Include visual indicators (cards or chart)

## Fix: Partner Referral Link (Apr 2)
- [x] Referral links should bypass the access key requirement
- [x] Referred users should land on the partner page directly without needing ?key= param

## Feature: Delivery Charge Summary in Export (Apr 2)
- [x] Add delivery charge summary section to Excel export Summary sheet
- [x] Show total delivery fees collected per month

## Fix: Order Dashboard Default to Today's Orders (Apr 3)
- [x] Default the admin order dashboard to show today's orders only
- [x] Order counts (All Orders, In-Store, Delivery, Pickup) should reflect today's numbers
- [x] Allow user to expand to other date ranges if needed

## Feature: Merge Orders
- [x] Add backend mergeOrders endpoint that combines items from multiple orders into one
- [x] Keep audit trail - merged orders marked as "merged into #XX" with original order reference
- [x] Add Merge Orders button on admin order dashboard when multiple active orders exist for same table/customer
- [x] Staff can select orders to merge, confirm, and collect single payment
- [x] Combined order total reflects all items from merged orders
- [x] Write vitest tests for merge logic
- [x] No test data created in production database (pure code change, no DB seeding)

## Feature: Merge Orders for Staff (Apr 4)
- [x] Change mergeOrders backend from adminProcedure to staffProcedure so staff can use it
- [x] Add Merge Orders UI to Staff Orders page (same flow as admin: select, pick primary, confirm)
- [x] Update vitest tests for staff-level access

## Fix: Ingredient Section Icons (Apr 5)
- [x] Replace wrong emoji icons with proper ones: tea leaves (🍃), mochi (🍡), tapioca pearls (🧋), imported ingredients (✈️)
- [x] Fix freshness_story icons in database - DB values override code defaults, updated DB directly

## Bug Fix: In-store orders showing "Guest" instead of customer name (Apr 5)
- [x] Fix admin orders page to show customer name/phone from order data instead of "Guest" for in-store orders
- [x] Fix staff orders page to show customer name/phone from order data instead of "Guest" for in-store orders
- [x] Root cause: guest order flow saved name to guest_orders table but not orders.customerName
- [x] Fix: save customerName/Phone to orders table during creation + fallback lookup from guest_orders
- [x] Backfilled 396 existing orders with customer names from guest_orders table

## Fix: Expand Locality Dropdown & Add Palladium Delivery (Apr 7)
- [x] Expand area/locality dropdown to include ALL Chennai areas (145 areas, up from 31)
- [x] Converted dropdown to searchable combobox for easy filtering with 145 areas
- [ ] DEFERRED: Add Palladium delivery (waiting for KOT printer fix at Palladium)
- [x] Delivery charges unchanged - still uses Google Maps Distance Matrix API for accurate distance-based pricing

## CONVERSION PLAYBOOK - Prioritized Fix List (Apr 7)

### P0 - CRITICAL (Week 1)
- [x] Delivery zone eligibility check BEFORE menu browsing - modal asks area/pincode when customer selects Delivery, shows charge upfront, offers Pickup/Dine-in if too far
- [x] Add prominent "Order Now" gold CTA button to navigation bar - links to /menu with Delivery pre-selected
- [ ] Add enquiry forms to /wholesale and /franchise pages - capture 160+ monthly warm leads (name, phone, city, message)

### P1 - HIGH (Week 2)
- [ ] Lower loyalty stamp threshold from ₹450 to ₹350 per stamp
- [ ] Retrospectively recalculate stamps for existing customers (only those who haven't already redeemed free drink)
- [ ] Update all frontend references to ₹450 → ₹350 (StampCard, Checkout, Home, Profile)
- [ ] Update all backend stamp calculation logic (3 places in routers.ts: line 907, 4008, 4052)

### P2 - MEDIUM (Month 1-3)
- [ ] DEFERRED: Palladium delivery (waiting for KOT printer fix)
- [ ] Loyalty programme rules - surface stamp progress on ordering page, not buried in FAQ
- [ ] Unify physical and virtual stamp systems into one phone-number linked account

### EXTERNAL (Not code changes)
- [ ] Print 500 QR code bag inserts for Swiggy/Zomato deliveries
- [ ] Update Instagram bio CTA to link directly to /menu
- [ ] Create 'ORDER NOW' Instagram Story Highlight with ordering flow
- [ ] Set up WhatsApp order confirmation with stamp count reminder
- [ ] Set up 45-day lapsed customer WhatsApp reactivation

## Conversion Fixes - Implementation (Apr 7)
- [x] Persist delivery area in localStorage (not just sessionStorage) so returning customers don't re-enter
- [x] Add free delivery nudge on floating cart bar when subtotal is close to ₹2,500
- [x] Show "FREE delivery unlocked" when subtotal exceeds ₹2,500
- [x] Fix subtotal not available in Menu.tsx floating cart bar (need to destructure from useCart)
- [x] Add tax invoice download for customers once they have paid (on My Orders / Order Confirmation page)
- [x] Extracted invoice generator to shared utility @/lib/generateInvoice.ts
- [x] Auto-populate Checkout area + pincode from confirmed delivery area in localStorage

## Feature: Enhanced Customer Details View (Apr 7)
- [x] Add backend endpoint for full customer details (orders, addresses, stamps, rewards)
- [x] Add clickable customer detail panel in admin Customer Database (Sheet slide-out)
- [x] Show past orders with items, totals, status, payment method
- [x] Show delivery addresses used
- [x] Show loyalty stamp progress and history
- [x] Show rewards earned and redeemed
- [x] Stats cards: total orders, total spent, stamps, store credit
- [x] Additional info: birthday, join date, last active, notes
- [x] Vitest tests for getDetails endpoint (3 passing)

## Bug Fixes (Apr 7)

- [x] Bug fix: Repeat customers showing 0% in analytics dashboard (Meenakshi is a regular but shows 0 of 6)
- [x] Bug fix: Meenakshi (order #90, ₹1,397) didn't receive 3 stamps — stamps only awarded on order completion (working as designed)
- [x] Ensure free drink reward auto-triggers when customer reaches 10 stamps on next order (verified: 9 + 3 = 12 → reward created → 2 remaining)

## Instagram Digital Flywheel (Apr 7)

- [x] Auto-redirect Instagram bio visitors directly to Order Now page (support ?order=now or /order query param)
- [ ] Bug fix: /order route returns 404 in production - needs server-side catch-all for SPA routing
- [ ] Bug fix: Stamps not showing for guest customers in Customer Database (showing "-" instead of stamp count)

## Trademark Update (Apr 11)

- [x] Add ™ symbol to Taiwan Maami in website footer
- [x] Add ™ symbol to key brand mentions across the site (header, about, franchise, receipts, SEO, admin, event docs)

## OAuth Login Bug (Apr 11)

- [ ] Bug: Customer getting "Permission denied - Redirect URI is not set" when trying to register via email on taiwanmaami.com
- [ ] Remove email login option - force Google/Apple sign-in only to avoid "Redirect URI not set" error

## Payment Method Fix (Apr 11)

- [x] Fix orders 128 and 131: change payment method from UPI to Zomato District (zomato_dineout)
- [x] Add admin capability to change payment method on any order (✏️ Change Payment Method button in order details)

## Staff Orders Date Filter (Apr 12 - URGENT)

- [x] Add date filter to Staff Orders page so staff can view previous day's unpaid orders

## Manual Order Creation for Staff (Apr 12)

- [x] Add manual order creation on Staff Orders page for placing in-store orders after POS shutdown (post 11:45 PM)

## Birthday Popup & KOT Fixes (Apr 12)

- [x] Fix birthday popup: change "birthday week" to "actual birthday" only (already fixed in previous session - popup says "on your actual birthday")
- [x] Highlight "when you order at least one other item" in birthday popup so customers don't expect a free drink alone (already underlined in popup)
- [x] Fix popping boba not printing on KOT
  - [x] Added bobaType and poppingBobaFlavor columns to order_items DB table
  - [x] Updated all 5 order item INSERT locations to save bobaType/poppingBobaFlavor
  - [x] Updated KOT reprint endpoint with addon-based fallback for older orders
  - [x] Updated KOT report to show boba type/flavor instead of Yes/No
  - [x] Updated all KOT printer clients (kitchen, palladium, v4, offline, staff)
  - [x] Added KotData TypeScript interface with bobaType/poppingBobaFlavor fields
  - [x] All 19 vitest tests passing

## Boba Size on KOT (Apr 12)

- [x] Show boba size (small/large) on KOT when tapioca boba is selected
  - [x] Added bobaSize column to order_items DB table
  - [x] Updated all 4 order item INSERT locations to save bobaSize
  - [x] Updated all KOT data builder objects (8 locations) to include bobaSize
  - [x] Updated KOT report to show "Tapioca (small)" or "Tapioca (big)"
  - [x] Updated all KOT printer clients (kitchen, palladium, v4, original, offline, staff)
  - [x] Updated KOT reprint endpoint with bobaSize
  - [x] Updated KotData TypeScript interface with bobaSize field
  - [x] Updated offline queue KOT builder to pass bobaSize
  - [x] All 25 vitest tests passing

## URGENT Bug Fix (Apr 12)

- [x] Fix order placement failure - "Unable to place your order right now" error after bobaSize changes
  - Root cause: bobaSize column was added to code but not migrated to production DB
  - Fix: Ran ALTER TABLE to add bobaSize column to production order_items table
- [x] Delete cancelled orders from Apr 12 caused by bobaSize bug (user-approved)
  - Deleted 8 cancelled orders: 26-00138 to 26-00144, 26-00146
  - Also deleted 1 order_item, 0 addons, 1 KOT queue entry
  - Order 26-00145 (completed) was preserved

## Loyalty Reward Improvements (Apr 16)

- [x] Add StampCard with reward display to Profile page (already exists - Loyalty Rewards card + Reward History)
- [x] Auto-apply loyalty reward at checkout (detect available reward, auto-set discountCode, show discount in order summary)
  - [x] Backend: Fixed reward logic to discount cheapest drink (large or regular) instead of most expensive large
  - [x] Frontend: Added useEffect to auto-query rewards and apply discount code on checkout page
  - [x] UI: Added green reward banner in order summary with "Remove reward" option
  - [x] 14 vitest tests passing
  - Free item is the lowest-priced bubble tea (large or regular) in the order
  - Clearly shown in order summary with green "Loyalty Reward Applied!" banner

## Partner Program Audit & Fixes (Apr 16)

- [x] Audit partner program: join flow, payment, welcome message, free Biang Biang, discounted drink, referrals
  - Join flow + Razorpay payment: working
  - Referral code generation + validation: working
  - Referral rewards (₹250 referrer, ₹100 referred): working
  - Free Biang Biang at T. Nagar: working (1 unit free per order)
  - Free Large Bubble Tea at Palladium: working (most expensive large tea free)
  - 15% tea discount: working (1 tea per order, cheapest eligible)
  - Benefit logging: working
  - Owner notification on new partner: working
- [x] Fix missing welcome message after partner signup payment
  - Added full-screen welcome page with benefits summary, referral code, WhatsApp share button
  - Replaces the old toast + immediate redirect
- [x] 16 vitest tests passing for partner benefits calculation

## Partner Program Rule Updates (Apr 16)

- [x] Update backend: free Biang Biang requires purchase of another food or drink
- [x] Update backend: free Palladium drink requires purchase of another drink
- [x] Update backend: remove 15% tea discount (teaDiscountPercent set to 0, all references removed)
- [x] Update backend: no loyalty stamps on free items (stamps on amount paid only — totalAmount already excludes partner benefit)
- [x] Update welcome message after partner signup to reflect new rules (removed tea discount, updated descriptions)
- [x] Email notification to partners when referral joins — already implemented in partnerRouter.ts (sendReferralNotificationEmail)
- [x] Updated Partner page: hero, benefits cards, pricing cards, FAQ, savings calculator all reflect new rules
- [x] Updated Checkout.tsx: removed tea discount benefit display
- [x] 24 vitest tests passing for updated partner benefits (1092 total tests pass)

## Partner Program Backend Enforcement & Visual Guide (Apr 16)

- [x] Enforce minimum purchase in calculatePartnerBenefits backend (already implemented correctly in partnerRouter.ts)
- [x] Add "How it works" visual step-by-step guide to Partner page (T. Nagar + Palladium flows, 3 steps each)
- [x] Write/update vitest tests for backend enforcement (30 tests, 6 new edge cases added)

## Bug Fix: Partner Dashboard still showing 15% tea discount (Apr 16)

- [x] Remove "15% Off All Teas" from Partner Dashboard benefits list (replaced with Loyalty Stamps card)
- [x] Updated WhatsApp share text to mention free items instead of 15% discount

## Partner Programme Overhaul (Apr 19)

### Database Schema
- [x] Add partner tier field (founder/regular) to partners table
- [x] Add complimentary items claimed count/tracking (via partnerBenefitsLog)
- [x] Add subscription year start date for per-year limit tracking
- [x] Track which items were claimed (complimentary item log)

### Backend
- [x] Update calculatePartnerBenefits: complimentary food item at T.Nagar (no min purchase required)
- [x] Eligible items: Biang Biang, Dan Dan Noodles, Cong You Bing, Egg Cong You Bing, any Brioche
- [x] 25 complimentary items per subscription year limit
- [x] 1 complimentary item per visit/order
- [x] 5% discount on all drinks in partner orders
- [x] 10% discount on workshops
- [x] Remove referral programme entirely (referral code, referral tracking, referral rewards)
- [x] Founder tier: ₹2,500/year, first 50 only
- [x] Regular tier: ₹3,500/year, same benefits

### Customer-Facing Partner Page
- [x] Update Partner page: new pricing (Founder ₹2,500 / Regular ₹3,500)
- [x] Update benefits display (complimentary item, 5% drinks, 10% workshops)
- [x] Remove all referral sections from Partner page
- [x] Show founder slots remaining (X of 50)

### Partner Dashboard (customer-facing)
- [x] Remove referral section and share buttons
- [x] Update benefits cards to new rules
- [x] Show complimentary items claimed vs 25 limit
- [x] Show subscription year and renewal date

### Admin Partner Dashboard (new standalone page)
- [x] Total partners count (founder vs regular breakdown)
- [x] Founder slots remaining (out of 50) with progress bar
- [x] Subscription revenue
- [x] Benefits given total
- [x] Individual partner activity list with tier badges
- [x] Programme configuration management

### Checkout
- [x] Apply complimentary item (1 per order, from eligible list)
- [x] Apply 5% drink discount on all drinks in order
- [x] Check 25/year limit before applying complimentary item
- [x] Updated labels: "Complimentary" instead of "Free"

### Tests
- [x] 36 vitest tests for new benefit calculation (all passing)
- [x] Test 25-item yearly limit
- [x] Test 1-item-per-visit limit
- [x] Test 5% drink discount
- [x] Test founder vs regular tier pricing
- [x] Test eligible items validation
- [x] Test combined benefits scenarios
- [x] Updated partner.test.ts integration test (removed teaDiscountPercent, referral fields)
- [x] All 1,104 tests passing across 99 test files

## Bug Fix: KOT showing "Boba: true" instead of actual boba selection (Apr 20)

- [ ] Fix KOT to show boba type (Tapioca Pearls / Popping Boba flavor), size if applicable

## Open Partner Page to Customers (Apr 20)

- [x] Set PARTNER_GATE_ACTIVE to false in partnerGate.ts — Partner page now visible to all customers

## Election Day: Palladium Mall Closure Banner (Apr 23)

- [x] Add prominent dismissible banner about Palladium Mall closure (elections), redirect to T. Nagar
- [x] Remove election day banner from Header.tsx (bannerDismissed state, showElectionBanner variable, JSX block, AlertTriangle import)

- [x] Build PIN-protected Petpooja quick upload page at /petpooja-upload
- [x] Backend: PIN verification endpoint (POST /api/petpooja/verify-pin)
- [x] Backend: File upload endpoint with outlet + date tagging (POST /api/petpooja/upload)
- [x] Frontend: Mobile-first upload page with PIN entry, outlet selection, date picker, file upload
- [x] Tests: Vitest coverage for PIN verification and upload validation
- [x] Add upload history view below the upload form (shows last 14 uploads grouped by date)

## MaamiTech Phase 1 — Task 1: Service Auth Token

- [x] Create MAAMITECH_API_ENABLED feature flag (env var, default false)
- [x] Create MAAMITECH_SERVICE_TOKEN env var
- [x] Build server/serviceAuth.ts middleware (validates Bearer token, checks feature flag)
- [x] Create /api/service/health endpoint (basic connectivity test)
- [x] Create /api/service/employee-master proxy endpoint
- [x] Register service routes in server/_core/index.ts
- [x] Write vitest tests for service auth middleware
- [x] Validate with curl command showing successful authenticated call

## MaamiTech Phase 1 — Task 2: orders.listForService Endpoint

- [x] Build GET /api/service/orders endpoint with date range, outlet, orderType, status filters
- [x] Include order items and addons in response (nested)
- [x] Support pagination (limit/offset) with metadata
- [x] Support date range filtering (from/to as ISO timestamps)
- [x] Support outlet filtering (outletId)
- [x] Support orderType filtering (instore/delivery/pickup)
- [x] Support orderStatus filtering
- [x] Support paymentMethod filtering
- [x] Exclude test data (isTestData = false)
- [x] Return amounts in rupees (not paise) for agent readability
- [x] Register route in _core/index.ts under service auth
- [x] Write vitest tests for the endpoint
- [x] Validate with curl returning real production data

## MaamiTech Phase 1 — Task 7: employees.list Endpoint

- [x] Build GET /api/service/employees wrapper around Employee Master proxy
- [x] Standardize response format (success, data, meta) matching orders pattern
- [x] Support filtering by status (active/inactive), outlet (partial match)
- [x] Support limit/offset pagination
- [x] Strip sensitive fields from response
- [x] Write vitest tests (13 tests in serviceEndpoints.test.ts)
- [x] Validate with curl returning real employee data

## MaamiTech Phase 1 — Menu Toggle Service Auth

- [x] Build POST /api/service/menu/toggle-availability endpoint
- [x] Accept productId and available (boolean) in request body
- [x] Return previous + current availability state in response
- [x] 404 for non-existent products, 400 for invalid input
- [x] Build GET /api/service/menu/products endpoint (list products with availability)
- [x] Support available filter and categoryId filter
- [x] Prices in rupees
- [x] Write vitest tests
- [x] Validate with curl

## MaamiTech Phase 1 — Task 5: Petpooja Webhook (Real-time Order Push)

- [x] Create petpooja_webhook_orders table in database
- [x] Create petpooja_webhook_log table for audit trail
- [x] Build POST /api/petpooja/webhook endpoint (open, no auth per Petpooja spec)
- [x] Handle standard dine-in orders
- [x] Handle aggregator orders (Zomato/Swiggy) with CGST/SGST tax parsing
- [x] Handle part payment orders
- [x] Parse items with addons
- [x] Convert amounts to paise for storage
- [x] Parse IST timestamps from Petpooja
- [x] Outlet mapping via restID (placeholder — needs Petpooja restIDs)
- [x] Acknowledge unhandled event types gracefully
- [x] Build GET /api/petpooja/webhook/status endpoint (health + stats)
- [x] Store raw payload for debugging
- [x] Audit log every webhook call (success and failure)
- [x] Write vitest tests (10 tests covering all payload types + error cases)
- [x] Clean up test data after tests
- [ ] Configure outlet mapping once Petpooja provides restIDs for Palladium and T. Nagar

## MaamiTech Phase 1 — Task 6: Data Lake ETL (Supabase)

- [x] Create Supabase project (ouktqqgmipygehhakoie.supabase.co)
- [x] Create four tables: sales_facts, stock_snapshots, wastage_facts, data_completeness
- [x] Store Supabase credentials as env secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [x] Build ETL handler (server/etl.ts) — pulls POS orders, Petpooja webhook, Petpooja CSV
- [x] Add Supabase REST API helpers (insert, upsert)
- [x] Register routes: POST /api/service/etl/run, GET /api/service/etl/status
- [x] Register scheduled task route: POST /api/scheduled/etl
- [x] Fix TypeScript errors (getDb() pattern, schema field names)
- [x] Test with real data — 70 sales_facts rows inserted for Apr 30 (28 POS + 42 CSV)
- [x] Verify data_completeness rows in Supabase (palladium + tnagar)
- [x] Write vitest tests (11 tests, all passing)
- [x] Set up Manus scheduled task for 1am IST daily trigger
- [ ] Inventory stock/wastage pull (blocked until Inventory system has service auth — Tasks 3/4)

## MaamiTech Phase 1 — Task 8: Daily Digest Agent

- [ ] Build POST /api/scheduled/digest endpoint
- [ ] Query Supabase data_completeness + sales_facts for yesterday
- [ ] Use LLM to generate natural-language daily summary
- [ ] Send digest via notifyOwner() to Kannan
- [ ] Include: revenue, order count, outlet comparison, top items, data gaps
- [ ] Write vitest tests
- [ ] Set up Manus scheduled task for 7am IST daily

## Task 8 — ETL Fixes & Digest Rework
- [x] Remove Petpooja CSV from ETL (webhook only)
- [x] Make ETL idempotent with scoped delete: WHERE outlet=X AND order_date=Y AND source=Z
- [x] Fix digest to show 4 revenue lines: T.Nagar In-store, T.Nagar Delivery, Palladium In-store, Palladium Delivery
- [x] Show "No data (webhook pending)" for missing channels
- [x] Clean up duplicate Supabase rows from earlier test runs
- [x] Set up 7am IST scheduled task for daily digest via Twilio WhatsApp

## Bug Fix — POS Analytics Dashboard
- [x] Fix: biang biang showing ₹6,230 / 23 sold on analytics dashboard — user says this is wrong
- [x] Investigate orderItems table for April 30 to find actual biang biang data
- [x] Fix analytics dashboard product aggregation logic (added isTestData=false + orderItems.status='active' to all 10 analytics procedures)
- [x] After dashboard fix, verify ETL digest numbers match corrected dashboard (ETL=₹2,075 for biang biang, matches DB)

## Bug Fix — ETL Missing orderStatus Filter
- [x] ETL pullPOSOrders includes cancelled orders — add orderStatus != 'cancelled' filter
- [x] Also add orderItems.status = 'active' filter to ETL item query
- [x] Re-run ETL for May 1 and verify 10 orders / matches dashboard (10 orders, ₹12,125 pre-tax = matches dashboard ₹12,731 inc GST)
- [x] Re-send corrected May 1 digest (SID: SM244f5250b88f92ae9ac5565f84c12724)

## Petpooja Webhook v2 — Supabase-backed with Raw Archive
- [x] Run supabase-schema.sql in Supabase to create new tables (petpooja_orders, petpooja_order_items, petpooja_ingestion_log, petpooja_raw_archive, etl_run_log)
- [x] Install @supabase/supabase-js dependency (already installed)
- [x] Create server/petpoojaWebhookV2.ts — adapted for Express stack with archive→process→status flow
- [x] Wire POST /api/petpooja/webhook to v2 handler (v1 kept at /api/petpooja/webhook/v1)
- [x] Keep GET /api/petpooja/webhook/status endpoint working (v2 with Supabase stats)
- [x] Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are available (already in env.ts)
- [x] Write vitest tests for the new webhook handler (16 tests passing)
- [x] Test end-to-end with simulated Petpooja payload (ingestion + idempotency + status all verified)
- [ ] Save checkpoint and deploy (pending)

## Daily Digest — Multi-recipient
- [x] Update daily-digest.py to send to 3 WhatsApp numbers: +917845053909, +447736539098, +447780886480
- [x] Update scheduled task prompt with all 3 recipients
- [x] Send May 1 digest to all 3 recipients (SIDs: SMd57fa646, SM696985e3, SMe6612c11)

## Historical Sales Backfill — 6 Excel Files into Supabase sales_facts
- [x] Inspect all 6 files: columns, date ranges, row counts
- [x] Map each file to outlet/source/order_type
- [x] Add is_backfill, period_start, period_end columns to sales_facts
- [x] Build backfill ETL script with is_backfill=true, period_start/end, order_date=period_end
- [x] T.Nagar mixed file loaded as order_type='mixed'
- [x] Run backfill for all 6 files (1486 rows inserted, 64,781 units, ₹23,600,275)
- [x] Run verification GROUP BY query and share output (1648 rows, 64,971 units, ₹23,672,478)
- [x] Ensure backfill rows excluded from data_completeness checks (backfill uses separate source/etl_batch_id, daily ETL only processes pos/petpooja_webhook sources)

## Security Hardening Sprint
- [x] 1. Split single service token into scoped tokens per agent/system + document access matrix (scopedAuth.ts)
- [x] 2. Add rate limiting to /api/service/ endpoints (100 req/min/token) (rateLimiter.ts)
- [x] 3. Add explicit input validation to all service endpoint query parameters (inputValidation.ts)
- [x] 4. Implement audit logging for write operations (token, timestamp, IP, before/after) to audit_log table (auditLog.ts)
- [x] 5. npm audit: 0 critical, 0 high remaining (patched drizzle-orm, @aws-sdk, trpc, multer, vite, axios, removed xlsx)
- [x] 6. Confirmed: all /api/service/* behind MAAMITECH_API_ENABLED flag, no debug endpoints exposed
- [x] 7. Confirmed: TLS 1.2+ enforced via Cloudflare (TLS 1.1 rejected, HSTS max-age=31536000)
- [x] 8. Multi-tenant architecture designed (docs/MULTI_TENANT_ARCHITECTURE.md) — separate Supabase per client

## Scoped Token Generation
- [x] Generate mmt_aiagent token (orders:read, etl:read, health:read)
- [x] Generate mmt_inventory token (employees:proxy, health:read)
- [x] Generate mmt_pos token (orders:read, menu:read, menu:write, health:read)
- [x] Generate mmt_etl token (orders:read, employees:read, menu:read, etl:run, etl:read, health:read)
- [x] Generate mmt_kotprinter token (health:read)
- [x] Configure MAAMITECH_TOKEN_REGISTRY env var (9 validation tests passing)
- [x] Document access matrix (docs/TOKEN_ACCESS_MATRIX.md)
- [ ] Legacy token stays active until all agents confirmed on scoped tokens

## POS Security Sprint — Hardcoded Secret Removal (CWE-547)
- [x] Full codebase sweep: 17 instances found across 8 files
- [x] Presented complete list to user — confirmed fix plan
- [x] Applied hard-fail validation to all instances:
  - Items 1-6: VITE_KOT_PRINT_SECRET → client/src/lib/env.ts validated const
  - Item 7: EMP_MASTER_API_URL → ENV with throw
  - Item 8: EMP_MASTER_API_KEY → ENV with throw (rotated token via env)
  - Items 9-12: Razorpay/Petpooja → ENV with throw on missing
  - Items 14-17: Test files → vi.stubEnv mocking pattern
- [x] Build verified: 0 TS errors, dev server running, 46 security tests passing
- [ ] Push to main to trigger Snyk rescan (checkpoint needed)

## ETL Scheduled Task 403 Fix
- [x] Fix /api/scheduled/etl auth middleware — removed role check, accepts any valid session (TS error was comparing 'user' against 'customer'|'staff' enum)
- [x] Fix scopedAuth.ts req.path bug — was using relative path (e.g. /etl/run) instead of full path (/api/service/etl/run), causing all scoped token requests to fall through to admin:* requirement
- [x] Fix legacy token not included when MAAMITECH_TOKEN_REGISTRY is set — now appends legacy token with admin:* scope for backward compatibility
- [x] ETL run tested successfully via scoped token (38 rows for May 3)
- [x] All 33 tests passing (ETL + security)
- [ ] Deploy and confirm tomorrow's scheduled task runs successfully

## Petpooja Webhook 405 Fix
- [x] Identified root cause: bare domain taiwanmaami.com redirect server only allows GET/HEAD, returns 405 for POST
- [x] Fix: Petpooja updated webhook URL to https://www.taiwanmaami.com/api/petpooja/webhook (with www)
- [x] Confirmed endpoint works on www domain (returns 400 validation for incomplete payload, 200 for valid)
- [x] No code change needed — infrastructure/DNS redirect issue

## Petpooja Outlet Mapping (May 2026)
- [x] Map restID s16db4mw → palladium_instore (License 157805)
- [x] Map restID 9itpu6o0 → palladium_delivery (License 334130)
- [x] Map restID que6b2myco → tnagar_delivery (License 395793)
- [x] Updated OUTLET_MAP in petpoojaWebhookV2.ts (v2 Supabase handler)
- [x] Updated OUTLET_MAP in petpoojaWebhook.ts (v1 MySQL handler)
- [x] Local curl tests: all 3 outlets resolve correctly + unknown fallback works
- [x] All 19 v2 webhook tests passing (including 4 new outlet mapping tests)
- [x] Test data cleaned up from Supabase
- [ ] Deploy and confirm live Petpooja orders land with correct outlet names

## Daily Digest — All 4 Revenue Lines
- [x] Digest already had 4 revenue lines (T.Nagar In-store, T.Nagar Delivery, Palladium In-store, Palladium Delivery)
- [x] Updated filters to include petpooja_report and petpooja_csv sources (historical backfill)
- [x] Added fallback: if order_subtotal_rupees is null, sum item_total_rupees instead
- [x] Updated data gaps messaging: "No orders received" instead of "Webhook pending"
- [x] Updated ETL PETPOOJA_OUTLET_MAP with live restIDs (s16db4mw→palladium, 9itpu6o0→palladium, que6b2myco→tnagar)
- [x] All 12 ETL tests passing
- [x] Removed "webhook pending" display — now shows ₹0.00 cleanly

## BRIEF 1 — GitHub Actions CI
- [x] Created .github/workflows/ci.yml (push to main + PR triggers)
- [x] pnpm audit --audit-level=high step
- [x] vitest run step with CI env vars for secrets
- [x] Fixed pnpm version mismatch: CI was using pnpm 8 but project uses pnpm 10.4.1 (lockfile v9.0). Updated to pnpm@10 + node 22
- [ ] Verify GitHub Actions run passes (green) — requires manual push (GitHub App lacks workflows permission)

## BRIEF 2 — SQL Injection + Cleartext Transmission Fixes
- [x] SQL Injection (CWE-89): Replaced raw string interpolation in cms-refunds.test.ts with Drizzle `sql` tagged template (parameterised queries)
- [x] Cleartext Transmission (CWE-319): cookies.ts — enforce sameSite=lax when not secure to prevent cleartext cookie transmission
- [x] Cleartext Transmission (CWE-319): backup.ts — validate backup URL starts with https://, mask URL in logs
- [x] Cleartext Transmission (CWE-319): employeeMaster.ts — enforce HTTPS for EMP_MASTER_API_URL, mask credentials in error logs
- [x] Cleartext Transmission (CWE-319): partnerRouter.ts — enforce HTTPS for FORGE API URL
- [x] Zero TypeScript errors
- [x] All 64 tests passing (5 test suites)
- [ ] Verify Snyk rescan shows reduced High findings

## CI Fix — package.json JSON Syntax Error
- [x] Fixed JSON syntax error at position 4441 (missing closing quote on packageManager field)
- [x] Set packageManager to exactly "pnpm@10.27.0" (clean version, no sha512 hash)
- [x] Validated with node -e "require('./package.json')"
- [x] Pushed fix to GitHub main
- [ ] ci.yml still needs version line removed (GitHub App lacks workflows permission — user must update manually)
- [x] Added .npmrc with audit-level=high
- [x] Added pnpm.auditConfig.ignoreCves for GHSA-2phv-j68v-wwqx (false positive — already on patched 10.27.0)
- [x] Updated ci.yml audit step to use --ignore GHSA-2phv-j68v-wwqx flag (local only — needs manual push)

## CI Test Fixes (May 4)

- [x] Convert serviceAuth tests to supertest (no localhost:3000 needed)
- [x] Convert serviceEndpoints tests to supertest with DB-skip guards
- [x] Convert serviceOrders tests to supertest with DB-skip guards
- [x] Convert etl tests to supertest with DB-skip guards
- [x] Convert petpoojaWebhook tests to supertest with DB-skip guards
- [x] Create vitest.ci.config.ts excluding 28 DB-dependent test files
- [x] Pushed all test files + vitest.ci.config.ts to GitHub main
- [ ] ci.yml needs --config vitest.ci.config.ts added (GitHub App lacks workflows permission — user must update manually)

## ETL Supabase Fix (May 6)

- [x] Fix pullPetpoojaWebhookOrders to read from Supabase petpooja_orders/petpooja_order_items instead of empty MySQL table
- [x] Amounts in Supabase are already in rupees (not paise) — no /100 conversion needed
- [x] Verified: 50 sales rows for May 5 (palladium_instore: 17, palladium_delivery: 12, tnagar_delivery: 6, tnagar_instore: 15)
- [x] Fix inventory stock/wastage API calls (POST→GET for tRPC query procedures)
- [x] Ensure digest reports item_total (without GST) as revenue, not order_total

- [ ] INCIDENT: Daily digest returned zero values for May 6 — ETL scheduled task didn't fire
- [ ] Manually trigger ETL for May 6 and confirm sales_facts populated
- [ ] Run digest and send via WhatsApp for May 6
- [ ] Investigate why scheduled task didn't fire for May 6
- [ ] T.Nagar POS orders missing from Petpooja webhook data (no T.Nagar in-store restID mapped)

- [ ] Set up reliable daily scheduled task for ETL + digest notification

- [ ] Move ETL trigger from Manus scheduled task to GitHub Actions (service token auth)
- [ ] Add MAAMITECH_SERVICE_TOKEN secret to GitHub repo
- [ ] Test workflow via manual dispatch

## WhatsApp Daily Digest (May 8)

- [x] Add Twilio WhatsApp integration for daily digest delivery
- [x] Wire WhatsApp send into /api/service/digest endpoint
- [x] Fix digest revenue calculation: use order_total_rupees per unique order (not item_total sum)
- [x] Fix channel grouping: pickup orders count as instore
- [x] Delete cancelled test order 312 from sales_facts and petpooja_orders
- [x] Add full digest format: revenue by channel, gross margin, top 3 items, stock alerts, wastage
- [x] Validate Twilio credentials (vitest passing)
- [ ] Add proper order cancellation mechanism (filter cancelled orders from ETL)

## WhatsApp Digest & Margin Integration (May 8)

- [x] Add Twilio WhatsApp integration for daily digest delivery
- [x] Fix revenue calculation to use order_total_rupees per unique order (not item_total sum)
- [x] Group pickup orders with instore in digest
- [x] Show pre-GST net sales per channel with GST + Gross Revenue summary
- [x] Update boba portion weights: Regular 40g, Large 60g (confirmed by Theresa)
- [x] Create WITHOUT boba recipe variants for all 16 drinks
- [x] Add delivery packaging costs (cup holder ₹8.50, take-away bag ₹6.22, paper bag ₹6.50)
- [x] Create order_packaging table with delivery packaging logic
- [x] Wire margin calculation into digest - queries sales_facts for ingredient_cost_inr/gross_margin_inr
- [x] Gross margin section shows per-outlet figures with coverage % that auto-updates
- [ ] Load recipes for remaining items: Taro Lattes, Matcha Lattes, Food, Mochi, Slush, Coffee
- [ ] Add order cancellation filtering to ETL (prevent test/cancelled orders entering sales_facts)

## Bug (May 10)
- [ ] Rice dishes not showing on delivery menu (shows for dine-in but not delivery)

## Multi-Outlet Phase 1 — Schema Migration
- [x] Add columns to store_locations: slug, lat, lng, deliveryRadiusKm, hasFood
- [x] Add columns to users: isManager, outletId
- [x] Add outletId column to delivery_areas
- [x] Create outlet_availability junction table (outletId, scopeType, scopeId, channel, available)
- [x] Seed outlets: Palladium (id=1, hasFood=0), T.Nagar (id=2, hasFood=1), Anna Nagar (id=30001, isActive=0)
- [x] Migrate subcategory availability flags → 138 rows in outlet_availability
- [x] Migrate product-level overrides → 222 rows in outlet_availability
- [x] Fix Drizzle snapshot drift (event_inquiries + new tables/columns)
- [x] Create migration 0039 (no-op SQL, snapshot catch-up)
- [x] Verify drizzle-kit generate shows "No schema changes"
- [x] All 967 CI tests pass (vitest.ci.config.ts)
- [ ] Multi-Outlet Phase 2: Backend API changes (getFullMenu outlet-aware, delivery routing)
- [ ] Multi-Outlet Phase 3: Admin UI availability matrix
- [ ] Wire margin calculation into ETL pipeline
- [ ] Fix Twilio sandbox session expiry (keep-alive or Business API upgrade)

## Pre-Phase 2 — Operational Fixes
- [ ] Add TWILIO secrets to ci.yml env section (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO)
- [ ] Add TWILIO secrets to etl-cron.yml as env for digest step
- [ ] Verify WhatsApp daily digest sends successfully after workflow update
- [ ] Investigate gross margin calculation in daily digest

## Urgent — OAuth Login Broken (May 10)
- [x] Fix OAuth callback failure — root cause: isManager/outletId columns missing from DigitalOcean MySQL (only added to TiDB). Added columns to DO DB + wrapped isEmployeeEmail in try-catch with timeout

## Digest Revenue Fix (May 10)
- [x] Update digest to Option C format: Menu Sales + Platform Commission + Net Collected
- [x] Exclude voided orders (order_total_rupees = 0) from all calculations
- [x] Verify corrected figures for May 10

## Digest Label Fix (May 10)
- [x] Rename 'Platform Commission' to 'Aggregator Discounts' in digest
- [x] Use order_discount_rupees from sales_facts for accurate discount tracking

## Digest Full Reconciliation (May 10)
- [x] Compute Packaging & Other as remainder (no new Supabase columns needed)
- [x] Update digest to show Packaging & Other line — reconciles to zero exactly
- [x] Trigger manual digest run and confirm WhatsApp delivery — verified on production with Packaging & Other line

## Phase B — Deploy POS to DigitalOcean App Platform
- [x] Step 1: Audit all Manus OAuth usage in codebase
- [x] Step 2: Map auth flows (what Clerk replaces)
- [x] Step 3: Clerk integration plan (features, roles, login flows, data migration) — plan approved 12 May 2026
- [ ] Step 4: Complete environment variable list for DO deployment
- [ ] Step 5: DigitalOcean App Platform deployment with app spec
- [ ] Step 6: Verification of all functionality on thamaraifoods.com

## Phase B — Implementation (Approved 12 May 2026)
- [x] Step 1: CDN asset inventory — list all manuscdn.com URLs with types and sizes (33/33 accessible)
- [x] Step 1b: CDN migration — 26 images → Cloudinary, 7 videos → DO Spaces, 33 URL replacements across 8 files
- [x] Step 2: Delete chatbot/TTS/voice files + remove ChatWidget from UI (12 files deleted, routers.ts cleaned)
- [x] Step 3: Replace notification.ts internals with Twilio WhatsApp (sendWhatsApp, same signature)
- [x] Step 4: Replace storage.ts with Cloudinary-only (storagePut/storageGet same API, hybridStorage simplified)
- [x] Step 5: Replace map.ts with direct Google Maps API (GOOGLE_MAPS_API_KEY env var)
- [ ] Step 6: Install Clerk packages, create clerk.ts + clerkWebhook.ts
- [ ] Step 7: Update context.ts, env.ts, db.ts for Clerk auth
- [ ] Step 8: Update frontend — ClerkProvider, Header, remove getLoginUrl, vite.config.ts
- [ ] Step 9: Delete sdk.ts, oauth.ts, llm.ts, imageGeneration.ts, voiceTranscription.ts
- [ ] Step 10: Test full flow locally
- [ ] Step 11: Deploy to DigitalOcean App Platform at thamaraifoods.com

## Revert — 13 May 2026
- [x] Reverted Clerk auth back to Manus OAuth (rolled back to pre-Clerk commit 68d6bf7)
- [x] Applied DATABASE_URL fix: db.ts and env.ts now use only built-in DATABASE_URL, ignoring CUSTOM_DATABASE_URL
- [x] Clerk will be implemented separately on thamaraifoods.com (DO App Platform)
- [x] Set CUSTOM_DATABASE_URL to DO MySQL as primary database
- [x] Remove temporary /api/server-ip endpoint
- [x] Investigate: KOT did not auto-print for order #26-00522 (instore, UPI payment recovered via failed payment alert) — KOT was queued correctly, printer client getting HTTP 500
- [x] Fix: /api/kot/poll and receipt poll returning HTTP 500 Internal Server Error to printer client — caused by Clerk migration deployment (now reverted), endpoints working again
- [x] Fix: Individual order WhatsApp notifications removed (Option A) — all 3 notifyOwner calls removed from createOrder and verifyPayment
- [ ] Fix: Daily digest not firing reliably (missed May 14) — migrating from GitHub Actions to Manus Heartbeat cron
- [ ] Create Manus Heartbeat cron job for daily-digest at 1:00 AM IST (requires deploy first)

- [ ] Fix: Customer login shows "Permission denied - Redirect URI is not set" on manus.im OAuth

## Category Toggle Feature (May 17)

- [ ] Feature: One-button category toggle at outlet level (e.g. turn off 'Food' at T.Nagar across all channels)
- [ ] Feature: Optional per-channel category toggle (dine-in, delivery, pickup separately)
- [x] Feature: Show Food category tile with 'Temporarily Unavailable' overlay when food is turned off (instead of hiding it completely)
- [x] Fix: Food force ON not cascading — now cascades availableAtTnagar/Palladium to all food subcategories and products when toggled.

## Availability Algorithm Cleanup (May 18)

- [x] Fix: Food Force ON/OFF should only control food schedule (time-based visibility), NOT overwrite channel/outlet flags
- [x] Fix: Remove cascade that overwrites availableDelivery/availableInstore/availablePickup on Force toggle
- [x] Fix: Reset DB state — set correct availability flags for all food categories/subcategories/products
- [x] Fix: "In-store Only" badge should only show when the item's own availableDelivery=false (not from food schedule)
- [x] Prepare: Availability system ready for third store addition

## Sales Report Timestamp (May 18)

- [x] Add Time column to Sales Report sheet (next to Date column)

## ETL / Supabase Constraint Fix (May 20)

- [x] Add item_sequence column to sales_facts
- [x] Update constraint to UNIQUE (source, source_order_id, item_name, item_sequence, order_date)
- [x] Update ETL to populate item_sequence (0-indexed position within each order)
- [x] Re-run May 19 ETL — 108 rows inserted cleanly
- [x] Re-run May 20 ETL — 119 rows inserted cleanly
- [x] Confirm digest fires correctly with data
- [ ] (Future) Migrate source_order_id to outlet-prefixed format (e.g. tnagar_426) for cleaner uniqueness — not urgent, do during quiet period

## Petpooja Itemised Backfill (May 21)

- [x] Parse 5 Petpooja itemised Excel exports and preview 10-row mapping
- [x] Ingest all ~64,000 rows into sales_facts with source='petpooja_itemised'
- [x] Verify row counts match expected totals

## Bug (logged for later): Petpooja Webhook ETL captures only 1 line item per order

- [x] Investigated — webhook IS capturing all items correctly (V2 handler stores in Supabase petpooja_order_items). The MySQL petpooja_webhook_orders table is the deprecated V1 table (empty).

## Revenue Overstatement Fix (May 23)

- [x] Fix ETL: order_total_rupees/tax/discount/subtotal only on item_sequence=0 (NULL for subsequent items)
- [x] Applied to both POS and petpooja_webhook code paths
- [x] Backfill: UPDATE 383 existing rows to NULL where item_sequence > 0
- [x] Verified: 0 rows remaining with item_sequence > 0 AND order_total_rupees NOT NULL
- [x] Fix digest code: voided-order detection was treating NULL order_total (item_sequence>0) as voided, excluding 74 of 128 orders. Rewrote to 3-pass approach: extract financials from non-NULL rows only, then aggregate, then count items.
- [x] Strip size/variant suffixes from Top 3 item names (e.g., 'Classic Taiwan Milk Tea' instead of 'Classic Taiwan Milk Tea (Regular (16oz) YES boba)')
- [x] Re-triggered corrected May 24 digest to WhatsApp after publish

## Anna Nagar Third Outlet (May 26 — target launch mid-June 2026)

- [x] 1. DB: Add availableAtAnnanagar boolean column to products + subcategories tables, default false
- [x] 2. DB: INSERT Anna Nagar row into store_locations (outletId=3, 12pm-midnight, Anna Nagar address)
- [x] 3. shared/types.ts: Add 'annanagar' to outlet type union and OUTLET_HOURS config
- [x] 4. shared/types.ts: Add 'annanagar' to isOutletOpen() parameter type
- [x] 5. CartContext.tsx: Add 'annanagar' to pickupOutlet and instoreOutlet types
- [x] 6. Home.tsx, Menu.tsx, Checkout.tsx: Add Anna Nagar as third outlet option in picker UI
- [x] 7. server/routers.ts: Add 'annanagar' to all z.enum outlet filters and toggle enums
- [x] 8. drizzle/schema.ts: Add availableAtAnnanagar column, run migration
- [x] 9. OutletAvailabilityTab.tsx: Add Anna Nagar toggle in admin UI
- [x] 10. server/etl.ts: Add Anna Nagar to POS_OUTLET_MAP (outletId 3) and PETPOOJA_OUTLET_MAP (placeholder)
- [x] 11. Petpooja webhook V2: Add Anna Nagar placeholder to OUTLET_MAP
- [x] 12. Petpooja quick upload: Add Anna Nagar to OUTLETS config
- [x] 13. Digest completeness check: Add 'annanagar' to outlet list
- [x] 14. Delivery charge: Add Anna Nagar origin address
- [x] 15. Offline settings admin: Add Anna Nagar toggle
- [x] 16. Staff Orders + Payment Report: Add Anna Nagar to outlet filter dropdowns
- [x] 17. Product availability: Deferred — all products default false, will enable closer to launch

## Digest: Live Gross Margin + Zero-Order Suppression (May 27)

- [x] Merged GitHub commit 26aa53b (feat: live GM in daily digest) into Manus project
- [x] Resolved merge conflict: kept recipe-based COGS calculation, added annanagar to gmOutletOrder
- [x] Applied same recipe-based GM to SCHEDULED daily digest section (was still using old marginRawData approach)
- [x] Suppress zero-order outlets from revenue section (Anna Nagar won't show until it has orders)
- [x] Pushed merged code back to GitHub (kanswam/taiwanmaami-POS)
- [x] Verified: digest now shows live GM (Palladium: 90.0%, T.Nagar: 85.8%, Combined: 89.7%)
- [x] All 42 tests pass
