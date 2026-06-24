CREATE TABLE `maami_rupees_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`orderId` int,
	`orderNumber` varchar(20),
	`type` enum('earn_order','earn_referral','redeem','expire') NOT NULL,
	`amount` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`expiresAt` timestamp,
	`remainingAmount` int,
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maami_rupees_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `maamiRupeesBalance` int NOT NULL DEFAULT 0;
