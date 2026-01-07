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
