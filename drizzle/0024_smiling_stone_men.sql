CREATE TABLE `admin_pins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pinHash` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_pins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_authorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`orderNumber` varchar(50),
	`discountAmount` int NOT NULL,
	`discountReason` text,
	`authorizedBy` int NOT NULL,
	`authorizedByName` varchar(200),
	`requestedBy` int,
	`requestedByName` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_authorizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`refundAmount` int NOT NULL,
	`refundReason` text NOT NULL,
	`refundType` enum('full','partial','store_credit') NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedByName` varchar(200),
	`reviewedBy` int,
	`reviewedByName` varchar(200),
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refund_requests_id` PRIMARY KEY(`id`)
);
