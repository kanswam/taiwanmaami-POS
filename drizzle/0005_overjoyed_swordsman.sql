CREATE TABLE `guest_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`guestName` varchar(200) NOT NULL,
	`guestPhone` varchar(20) NOT NULL,
	`guestEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guest_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_rewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rewardType` varchar(50) NOT NULL,
	`voucherCode` varchar(20) NOT NULL,
	`isRedeemed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`redeemedAt` timestamp,
	`redeemedOrderId` int,
	CONSTRAINT `loyalty_rewards_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_rewards_voucherCode_unique` UNIQUE(`voucherCode`)
);
--> statement-breakpoint
CREATE TABLE `stamp_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`action` enum('earn','bonus','welcome','redeem','expire') NOT NULL,
	`stamps` int NOT NULL,
	`orderTotal` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stamp_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stampCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lifetimeStamps` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastStampDate` timestamp;