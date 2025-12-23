CREATE TABLE `category_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('category','subcategory') NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(200) NOT NULL,
	`userId` int,
	`userName` varchar(200),
	`action` enum('create','update','delete','deactivate','reactivate') NOT NULL,
	`fieldChanged` varchar(100),
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `category_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(200) NOT NULL,
	`userId` int,
	`userName` varchar(200),
	`action` enum('create','update','delete','deactivate','reactivate','stock_in','stock_out','price_change','image_change') NOT NULL,
	`fieldChanged` varchar(100),
	`oldValue` text,
	`newValue` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_audit_log_id` PRIMARY KEY(`id`)
);
