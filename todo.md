# Taiwan Maami - Project TODO

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
