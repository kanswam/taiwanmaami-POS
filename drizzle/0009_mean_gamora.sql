ALTER TABLE `kot_queue` MODIFY COLUMN `orderId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `kot_queue` MODIFY COLUMN `kotData` json NOT NULL;--> statement-breakpoint
ALTER TABLE `kot_queue` ADD `outletId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `kot_queue` DROP COLUMN `orderNumber`;