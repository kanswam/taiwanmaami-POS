# Delivery → Website Name Mapping Analysis

Key differences:
1. Delivery names include size/boba info: "Vanilla Matcha Latte (Regular (yes Boba))" → "Vanilla Matcha Latte"
2. Case differences: "Vinegar-spiced Noodle Soup" → "Vinegar-Spiced Noodle Soup"
3. Character differences: "Cong You Bing" → "Çong Yoú Bǐng"
4. Naming variations: "Zilla Croissant" → "Taiwan Maami Zilla Croissant"
5. Some delivery items have "(set Of 2)" suffix for mochis

Strategy: Strip size/boba info from delivery names, then fuzzy match to website product names using case-insensitive comparison and normalized characters.
