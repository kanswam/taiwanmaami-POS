CREATE TABLE `outlet_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outletId` int NOT NULL,
	`productId` int NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`instorePriceOverride` int,
	`deliveryPriceOverride` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outlet_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`employeeCode` varchar(50) NOT NULL,
	`outletId` int NOT NULL,
	`action` enum('login','logout','create_order','void_order','apply_discount','refund','cash_drawer_open','price_override','item_void') NOT NULL,
	`orderId` int,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` varchar(50) NOT NULL,
	`employeeCode` varchar(50) NOT NULL,
	`employeeName` varchar(200) NOT NULL,
	`employeeMobile` varchar(20) NOT NULL,
	`outletId` int NOT NULL,
	`outletName` varchar(200) NOT NULL,
	`loginTime` timestamp NOT NULL DEFAULT (now()),
	`logoutTime` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`deviceInfo` text,
	`ipAddress` varchar(50),
	CONSTRAINT `pos_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `outletId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `posSessionId` int;