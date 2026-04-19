# Partner Eligible Complimentary Items

## Eligible Products (from database)

| ID | Name | Slug | Price (paise) | Subcategory | Category |
|---|---|---|---|---|---|
| 69 | Biang Biang Noodles | biang-biang-noodles | 41500 | Saucy Noodles | Food |
| 1500003 | Dan Dan Noodles | dan-dan-noodles | 41500 | Saucy Noodles | Food |
| 62 | Original Çong Yoú Bǐng | original-cong-you-bing | 28500 | Flat Bread | Food |
| 63 | Egg Çong Yoú Bǐng | egg-cong-you-bing | 31500 | Flat Bread | Food |
| 64 | Cheesy Corn Çong Yoú Bǐng | cheesy-corn-cong-you-bing | 34000 | Flat Bread | Food |
| 65 | Egg Cheesy Corn Çong Yoú Bǐng | egg-cheesy-corn-cong-you-bing | 36000 | Flat Bread | Food |
| 66 | Stir-fried Veg Çong Yoú Bǐng | stirfried-veg-cong-you-bing | 43500 | Flat Bread | Food |
| 73 | Spicy Margherita with Basil Pillow Brioche | savoury-pillow-brioche | 43500 | Savoury Pillow Brioche | Food |
| 74 | Cheesy Garlic Butter with Basil Pillow Brioche | sweet-pillow-brioche | 43500 | Savoury Pillow Brioche | Food |
| 30001 | Cheesy Mayonnaise Sweet Corn Pillow Brioche | test-product | 43500 | Savoury Pillow Brioche | Food |
| 30002 | Cheesy Eggs with Spring Onion Pillow Brioche | product-with-desc | 43500 | Savoury Pillow Brioche | Food |

## Sweet Brioche (under Sweet Bites category - also eligible as "any kind of Brioche")
| 300001 | Strawberry Conserve & Condensed Milk Brioche | ... | 43500 | Sweet Pillow Brioche | Sweet Bites |
| 300002 | Honey Coconut Brioche | ... | 43500 | Sweet Pillow Brioche | Sweet Bites |
| 300003 | Jaggery Banana Brioche | ... | 43500 | Sweet Pillow Brioche | Sweet Bites |
| 300005 | Blueberry Matcha Brioche | ... | 43500 | Sweet Pillow Brioche | Sweet Bites |
| 300006 | Cherry Chocolate Brioche | ... | 43500 | Sweet Pillow Brioche | Sweet Bites |

## Approach
- Use subcategory slugs: "saucy-noodles" (BB + Dan Dan), "flat-bread" (all Cong You Bing), "pillow-brioche" (savoury brioche)
- Plus sweet brioche subcategory under Sweet Bites
- Store eligible subcategory slugs in partner_config as configurable list
- OR hardcode the eligible product slugs/subcategory slugs in the backend

## New Rules
- 1 complimentary item per visit/order at T. Nagar
- 25 complimentary items per subscription year
- No minimum purchase required
- 5% off all drinks in partner orders
- 10% off workshops
- No referral programme
- Founder: ₹2,500/year (first 50 only), Regular: ₹3,500/year
