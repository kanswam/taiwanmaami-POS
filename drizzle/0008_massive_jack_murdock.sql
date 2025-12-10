CREATE TABLE `kot_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`kotData` text NOT NULL,
	`isPrinted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`printedAt` timestamp,
	CONSTRAINT `kot_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`rating` int NOT NULL,
	`comment` text,
	`customerName` varchar(200),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
