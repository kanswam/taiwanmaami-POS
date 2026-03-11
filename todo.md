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
