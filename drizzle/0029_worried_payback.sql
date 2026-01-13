ALTER TABLE `order_items` ADD `status` enum('active','cancelled','replaced') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `order_items` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `order_items` ADD `cancelledBy` int;--> statement-breakpoint
ALTER TABLE `order_items` ADD `cancellationReason` text;