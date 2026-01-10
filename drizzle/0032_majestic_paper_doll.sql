ALTER TABLE `orders` ADD `stampsEarned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `stampRedeemed` boolean DEFAULT false NOT NULL;