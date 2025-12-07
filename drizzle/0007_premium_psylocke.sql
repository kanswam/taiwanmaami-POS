CREATE TABLE `addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`chineseName` varchar(100),
	`type` enum('boba_flavor','boba_size','extra_boba','vegan_milk','food_addon') NOT NULL,
	`pricePetite` int,
	`priceRegular` int,
	`priceLarge` int,
	`fixedPrice` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`addressLine1` text NOT NULL,
	`addressLine2` text,
	`area` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL DEFAULT 'Chennai',
	`pincode` varchar(10) NOT NULL,
	`landmark` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`imageUrl` text,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `customization_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('sugar_level','ice_level') NOT NULL,
	`value` varchar(50) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `customization_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`areaName` varchar(100) NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`deliveryCharge` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `delivery_areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_areas_areaName_unique` UNIQUE(`areaName`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`type` enum('percentage','fixed_amount') NOT NULL,
	`value` int NOT NULL,
	`minOrderAmount` int NOT NULL DEFAULT 0,
	`maxDiscountAmount` int,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`usageLimit` int,
	`usageCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `discounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
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
CREATE TABLE `loyalty_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`pointsRedeemed` int NOT NULL DEFAULT 0,
	`balanceAfter` int NOT NULL,
	`transactionType` enum('earned','redeemed','adjustment') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_item_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderItemId` int NOT NULL,
	`addonId` int NOT NULL,
	`addonName` varchar(100) NOT NULL,
	`addonPrice` int NOT NULL,
	CONSTRAINT `order_item_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(200) NOT NULL,
	`size` enum('petite','regular','large'),
	`withBoba` boolean,
	`sugarLevel` varchar(50),
	`iceLevel` varchar(50),
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` int NOT NULL,
	`addonsTotal` int NOT NULL DEFAULT 0,
	`lineTotal` int NOT NULL,
	`specialInstructions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`userId` int,
	`customerName` varchar(200),
	`customerPhone` varchar(20),
	`orderType` enum('instore','delivery','pickup') NOT NULL,
	`orderStatus` enum('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('pending','partial','completed','refunded') NOT NULL DEFAULT 'pending',
	`subtotal` int NOT NULL,
	`stateGst` int NOT NULL,
	`centralGst` int NOT NULL,
	`deliveryCharge` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`loyaltyPointsUsed` int NOT NULL DEFAULT 0,
	`totalAmount` int NOT NULL,
	`deliveryAddressId` int,
	`deliveryAddress` text,
	`scheduledTime` timestamp,
	`razorpayOrderId` varchar(100),
	`razorpayPaymentId` varchar(100),
	`porterOrderId` varchar(100),
	`staffId` int,
	`outletId` int,
	`posSessionId` int,
	`specialInstructions` text,
	`discountCode` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `outlet_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outletId` int NOT NULL,
	`productId` int NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`instorePriceOverride` int,
	`deliveryPriceOverride` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outlet_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`paymentMethod` enum('cash','card','upi','razorpay') NOT NULL,
	`amount` int NOT NULL,
	`paymentStatus` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`razorpayPaymentId` varchar(100),
	`razorpaySignature` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`employeeCode` varchar(50) NOT NULL,
	`outletId` int NOT NULL,
	`action` enum('login','logout','create_order','void_order','apply_discount','refund','cash_drawer_open','price_override','item_void') NOT NULL,
	`orderId` int,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` varchar(50) NOT NULL,
	`employeeCode` varchar(50) NOT NULL,
	`employeeName` varchar(200) NOT NULL,
	`employeeMobile` varchar(20) NOT NULL,
	`outletId` int NOT NULL,
	`outletName` varchar(200) NOT NULL,
	`loginTime` timestamp NOT NULL DEFAULT (now()),
	`logoutTime` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`deviceInfo` text,
	`ipAddress` varchar(50),
	CONSTRAINT `pos_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`addonId` int NOT NULL,
	CONSTRAINT `product_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subcategoryId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`chineseName` varchar(200),
	`slug` varchar(200) NOT NULL,
	`description` text,
	`imageUrl` text,
	`instorePrice` int,
	`deliveryPrice` int,
	`deliveryUnitMultiplier` int NOT NULL DEFAULT 1,
	`mochiPrice1pc` int,
	`mochiPrice2pc` int,
	`mochiPrice3pc` int,
	`isVegetarian` boolean NOT NULL DEFAULT true,
	`isVegan` boolean NOT NULL DEFAULT false,
	`containsEgg` boolean NOT NULL DEFAULT false,
	`isInStock` boolean NOT NULL DEFAULT true,
	`availableInstore` boolean NOT NULL DEFAULT true,
	`availableDelivery` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
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
CREATE TABLE `store_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`address` text NOT NULL,
	`area` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL DEFAULT 'Chennai',
	`pincode` varchar(10) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`openingHours` text,
	`googleMapsUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`chineseName` varchar(100),
	`slug` varchar(100) NOT NULL,
	`description` text,
	`imageUrl` text,
	`basePricePetiteWithBoba` int,
	`basePricePetiteNoBoba` int,
	`basePriceRegularWithBoba` int,
	`basePriceRegularNoBoba` int,
	`basePriceLargeWithBoba` int,
	`basePriceLargeNoBoba` int,
	`deliveryPriceRegularWithBoba` int,
	`deliveryPriceRegularNoBoba` int,
	`deliveryPriceLargeWithBoba` int,
	`deliveryPriceLargeNoBoba` int,
	`hasSizeVariants` boolean NOT NULL DEFAULT true,
	`hasBobaOption` boolean NOT NULL DEFAULT true,
	`availableInstore` boolean NOT NULL DEFAULT true,
	`availableDelivery` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subcategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `subcategories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','staff','admin') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `loyaltyPoints` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stampCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lifetimeStamps` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastStampDate` timestamp;