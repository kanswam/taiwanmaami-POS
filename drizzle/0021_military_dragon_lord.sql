CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`orderId` int,
	`orderNumber` varchar(50),
	`customerName` varchar(200) NOT NULL,
	`customerEmail` varchar(320),
	`customerPhone` varchar(20),
	`complaintType` enum('delivery_issue','quality_issue','missing_item','wrong_order','late_delivery','payment_issue','staff_behavior','other') NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`resolution` text,
	`resolutionType` enum('refund','store_credit','replacement','apology','no_action'),
	`refundAmount` int,
	`storeCreditAmount` int,
	`resolvedBy` int,
	`resolvedByName` varchar(200),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `storeCredit` int DEFAULT 0 NOT NULL;