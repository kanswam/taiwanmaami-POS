CREATE TABLE `order_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`userId` int,
	`userName` varchar(200),
	`userRole` enum('customer','staff','admin') NOT NULL,
	`actionType` enum('payment_collected','item_added','item_cancelled','discount_applied','order_cancelled','status_changed','manual_discount_applied','refund_issued','order_locked','order_unlocked') NOT NULL,
	`description` text,
	`oldValue` text,
	`newValue` text,
	`itemId` int,
	`itemName` varchar(200),
	`itemQuantity` int,
	`amount` int,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_audit_log_id` PRIMARY KEY(`id`)
);
