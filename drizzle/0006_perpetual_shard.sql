DROP TABLE `addons`;--> statement-breakpoint
DROP TABLE `addresses`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
DROP TABLE `customization_options`;--> statement-breakpoint
DROP TABLE `delivery_areas`;--> statement-breakpoint
DROP TABLE `discounts`;--> statement-breakpoint
DROP TABLE `guest_orders`;--> statement-breakpoint
DROP TABLE `loyalty_rewards`;--> statement-breakpoint
DROP TABLE `loyalty_transactions`;--> statement-breakpoint
DROP TABLE `order_item_addons`;--> statement-breakpoint
DROP TABLE `order_items`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
DROP TABLE `outlet_products`;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
DROP TABLE `pos_audit_log`;--> statement-breakpoint
DROP TABLE `pos_sessions`;--> statement-breakpoint
DROP TABLE `product_addons`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
DROP TABLE `stamp_transactions`;--> statement-breakpoint
DROP TABLE `store_locations`;--> statement-breakpoint
DROP TABLE `subcategories`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `loyaltyPoints`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stampCount`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `lifetimeStamps`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `lastStampDate`;