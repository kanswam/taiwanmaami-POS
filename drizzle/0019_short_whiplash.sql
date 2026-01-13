ALTER TABLE `orders` ADD `manualDiscountAmount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `orders` ADD `manualDiscountType` enum('fixed','percentage');--> statement-breakpoint
ALTER TABLE `orders` ADD `manualDiscountPercent` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `manualDiscountReason` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `manualDiscountApprovedBy` int;