# Taiwan Maami - Project TODO

## Active Tasks

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
