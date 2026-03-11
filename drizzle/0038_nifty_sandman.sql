CREATE TABLE `homepage_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionKey` varchar(100) NOT NULL,
	`title` text,
	`subtitle` text,
	`content` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homepage_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `homepage_sections_sectionKey_unique` UNIQUE(`sectionKey`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `isFeatured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `featuredOrder` int DEFAULT 0 NOT NULL;