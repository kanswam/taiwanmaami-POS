CREATE TABLE `category_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`addonId` int NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	CONSTRAINT `category_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subcategory_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subcategoryId` int NOT NULL,
	`addonId` int NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	CONSTRAINT `subcategory_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `imageUrl2` text;--> statement-breakpoint
ALTER TABLE `products` ADD `imageUrl3` text;--> statement-breakpoint
ALTER TABLE `products` ADD `imageCropData` json;--> statement-breakpoint
ALTER TABLE `products` ADD `useBasePrice` boolean DEFAULT true NOT NULL;