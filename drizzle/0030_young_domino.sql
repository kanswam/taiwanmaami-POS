ALTER TABLE `orders` ADD `refundAmount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `refundMethod` enum('store_credit','original_payment','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `orders` ADD `refundReason` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `refundProcessedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `refundProcessedBy` int;