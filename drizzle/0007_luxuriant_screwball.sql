CREATE TABLE `kot_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(255) NOT NULL,
	`outletId` int NOT NULL,
	`kotData` json NOT NULL,
	`isPrinted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`printedAt` timestamp,
	CONSTRAINT `kot_queue_id` PRIMARY KEY(`id`)
);
