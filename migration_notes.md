# Multi-Outlet Migration Notes

## Existing State

### store_locations (2 rows)
- id=1: Taiwan Maami - Palladium Mall (Velachery, active)
- id=2: Taiwan Maami - T Nagar (T Nagar, active)
- Columns: id, name, address, area, city, pincode, phone, email, openingHours, googleMapsUrl, isActive, createdAt
- Missing: lat, lng, deliveryRadiusKm, slug, hasFood

### delivery_areas (74 rows)
- Columns: id, areaName, pincode, deliveryCharge, isActive
- No outletId — currently all areas are global (not outlet-specific)

### users table
- Missing: isManager, outletId columns

### Subcategories with restrictions (15 subcategories):
- Rice (id=10): Palladium=0, TNagar=0 (but just reactivated by Kannan for TNagar)
- Flat Bread (id=11): Palladium=0, TNagar=0
- Noodles Soup (id=12): Palladium=0, TNagar=0
- Savoury Pillow Brioche (id=13): Palladium=0, TNagar=0
- Omelette (id=14): Palladium=0, TNagar=0
- Tea in Pot (id=6): Palladium=0, TNagar=1, delivery=0, pickup=0
- Hot Coffee & Cocoa (id=7): Palladium=0, TNagar=1, delivery=0, pickup=0
- Iced Lavazza Coffee (id=30004): Palladium=0, TNagar=1
- Boba Crème Caramel (id=60002): Palladium=1, TNagar=0
- Sweet Pillow Brioche (id=60003): Palladium=0, TNagar=0
- Saucy Noodles (id=60004): Palladium=0, TNagar=0
- Grilled Mochi (id=180001): all channels=0 (disabled)
- ChickGozilla (id=540001): Palladium=0, TNagar=1
- The Crispy (id=990001): Palladium=0, TNagar=1
- Ice Cream Mochi (id=1110001): delivery=0, pickup=0

### Products with restrictions: 65 products

### outlet_availability table: Does NOT exist yet

## Migration Plan
1. Add columns to store_locations: slug, lat, lng, deliveryRadiusKm, hasFood
2. Add Anna Nagar row with isActive=false
3. Create outlet_availability junction table
4. Add isManager, outletId to users table
5. Add outletId to delivery_areas
6. Migrate existing boolean flags to outlet_availability rows
