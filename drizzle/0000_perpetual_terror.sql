CREATE TABLE `affirmation_tags` (
	`affirmation_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`affirmation_id`) REFERENCES `affirmations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `affirmations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`category` text NOT NULL,
	`language` text NOT NULL,
	`approved` integer DEFAULT 0 NOT NULL,
	`approved_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`language`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `languages` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resource_tags` (
	`resource_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`language` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`language`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);