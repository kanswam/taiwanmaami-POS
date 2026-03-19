CREATE TABLE `partner_benefits_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`outletId` int NOT NULL,
	`benefitType` enum('free_biang_biang','free_large_tea','tea_discount','maami_rupee_credit') NOT NULL,
	`benefitAmount` int NOT NULL,
	`itemName` varchar(200),
	`itemOriginalPrice` int,
	`discountPercent` int,
	`teaItemsCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_benefits_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` text NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `partner_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `partner_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerUserId` int NOT NULL,
	`referrerSubscriptionId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`referredSubscriptionId` int,
	`referralCode` varchar(20) NOT NULL,
	`referrerRewardAmount` int NOT NULL DEFAULT 0,
	`referredRewardAmount` int NOT NULL DEFAULT 0,
	`referrerRewardCredited` boolean NOT NULL DEFAULT false,
	`referredRewardCredited` boolean NOT NULL DEFAULT false,
	`status` enum('clicked','registered','subscribed','rewarded') NOT NULL DEFAULT 'clicked',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` enum('founding','regular') NOT NULL,
	`status` enum('active','expired','cancelled','paused') NOT NULL DEFAULT 'active',
	`amountPaid` int NOT NULL,
	`razorpaySubscriptionId` varchar(100),
	`razorpayPaymentId` varchar(100),
	`referralCode` varchar(20) NOT NULL,
	`referredByCode` varchar(20),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isAutoRenew` boolean NOT NULL DEFAULT true,
	`renewalReminderSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`cancelledAt` timestamp,
	`cancellationReason` text,
	CONSTRAINT `partner_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_subscriptions_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `partnerBenefitAmount` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `partnerSubscriptionId` int;
