CREATE TABLE `receipt_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`outletId` int,
	`orderNumber` varchar(50) NOT NULL,
	`receiptData` json NOT NULL,
	`isPrinted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`printedAt` timestamp,
	CONSTRAINT `receipt_queue_id` PRIMARY KEY(`id`)
);
