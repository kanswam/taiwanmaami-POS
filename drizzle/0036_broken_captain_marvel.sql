CREATE TABLE `discount_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discountId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workshop_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workshopId` int NOT NULL,
	`sessionDate` date NOT NULL,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`maxCapacity` int NOT NULL DEFAULT 8,
	`bookedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workshop_dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workshop_waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workshopId` int NOT NULL,
	`workshopDateId` int NOT NULL,
	`customerName` varchar(200) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(20) NOT NULL,
	`ticketCount` int NOT NULL DEFAULT 1,
	`status` enum('waiting','notified','booked','expired') NOT NULL DEFAULT 'waiting',
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workshop_waitlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `event_orders` DROP INDEX `event_orders_eventNumber_unique`;--> statement-breakpoint
ALTER TABLE `event_inquiries` MODIFY COLUMN `eventDate` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `event_inquiries` MODIFY COLUMN `eventTime` varchar(20);--> statement-breakpoint
ALTER TABLE `event_inquiries` MODIFY COLUMN `budgetRange` varchar(50);--> statement-breakpoint
ALTER TABLE `event_inquiries` MODIFY COLUMN `status` enum('new','contacted','quoted','confirmed','cancelled') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `event_order_items` MODIFY COLUMN `unitPrice` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `event_order_items` MODIFY COLUMN `totalPrice` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `event_orders` MODIFY COLUMN `eventDate` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `event_orders` MODIFY COLUMN `eventTime` varchar(20);--> statement-breakpoint
ALTER TABLE `event_orders` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('cash','upi','card','razorpay','swiggy_dineout','zomato_dineout','eazydiner','other');--> statement-breakpoint
ALTER TABLE `stamp_transactions` MODIFY COLUMN `action` enum('earn','bonus','welcome','redeem','expire','deduct') NOT NULL;--> statement-breakpoint
ALTER TABLE `workshop_bookings` MODIFY COLUMN `paymentStatus` enum('pending','paid','refunded','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `workshop_bookings` MODIFY COLUMN `paymentMethod` varchar(50);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `title` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `slug` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `description` text;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `shortDescription` varchar(255);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `startTime` varchar(10);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `endTime` varchar(10);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `duration` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `venue` varchar(500);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `totalCapacity` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `totalCapacity` int;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `bookedCount` int;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `price` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `price` int;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `earlyBirdDeadline` date;--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `instructorName` varchar(255);--> statement-breakpoint
ALTER TABLE `workshops` MODIFY COLUMN `instructorImage` varchar(500);--> statement-breakpoint
ALTER TABLE `discounts` ADD `firstTimeOnly` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `discounts` ADD `orderTypeRestriction` enum('all','delivery','pickup','dine_in') DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_orders` ADD `orderNumber` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `event_orders` ADD `gstAmount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_orders` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `workshop_bookings` ADD `workshopDateId` int;--> statement-breakpoint
ALTER TABLE `workshop_bookings` ADD `paymentId` varchar(100);--> statement-breakpoint
ALTER TABLE `workshop_bookings` ADD `invoiceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `workshop_bookings` ADD `attendedStatus` enum('not_attended','attended','no_show') DEFAULT 'not_attended' NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `instructor` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `instructorTitle` varchar(100);--> statement-breakpoint
ALTER TABLE `workshops` ADD `location` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `maxCapacity` int NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `ticketsSold` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `ticketPrice` int NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `highlights` text;--> statement-breakpoint
ALTER TABLE `workshops` ADD `whatYouLearn` text;--> statement-breakpoint
ALTER TABLE `workshops` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `event_orders` ADD CONSTRAINT `event_orders_orderNumber_unique` UNIQUE(`orderNumber`);--> statement-breakpoint
ALTER TABLE `event_inquiries` DROP COLUMN `assignedTo`;--> statement-breakpoint
ALTER TABLE `event_order_items` DROP COLUMN `staffCount`;--> statement-breakpoint
ALTER TABLE `event_order_items` DROP COLUMN `hoursWorked`;--> statement-breakpoint
ALTER TABLE `event_order_items` DROP COLUMN `hourlyRate`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `eventNumber`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `discountReason`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `sgst`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `cgst`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `internalNotes`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `customerNotes`;--> statement-breakpoint
ALTER TABLE `event_orders` DROP COLUMN `createdByName`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `attendeeNames`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `unitPrice`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `razorpayOrderId`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `razorpayPaymentId`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `paidAt`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `workshop_bookings` DROP COLUMN `adminNotes`;--> statement-breakpoint
ALTER TABLE `workshops` DROP COLUMN `galleryImages`;--> statement-breakpoint
ALTER TABLE `workshops` DROP COLUMN `venueAddress`;--> statement-breakpoint
ALTER TABLE `workshops` DROP COLUMN `instructorBio`;--> statement-breakpoint
ALTER TABLE `workshops` DROP COLUMN `isFeatured`;--> statement-breakpoint
ALTER TABLE `workshops` DROP COLUMN `metaTitle`;--> statement-breakpoint
ALTER TABLE `workshops` DROP COLUMN `metaDescription`;