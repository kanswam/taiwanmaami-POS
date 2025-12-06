ALTER TABLE `products` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `products` ADD `videoThumbnail` text;--> statement-breakpoint
ALTER TABLE `products` ADD `isFeaturedVideo` boolean DEFAULT false NOT NULL;