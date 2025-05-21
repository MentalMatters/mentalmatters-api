PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`revoked` integer DEFAULT 0 NOT NULL,
	`last_used` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
INSERT INTO `__new_api_keys`("id", "key", "label", "role", "created_at", "revoked", "last_used") SELECT "id", "key", "label", "role", "created_at", "revoked", "last_used" FROM `api_keys`;--> statement-breakpoint
DROP TABLE `api_keys`;--> statement-breakpoint
ALTER TABLE `__new_api_keys` RENAME TO `api_keys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);