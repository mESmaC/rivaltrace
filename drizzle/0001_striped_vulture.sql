DROP INDEX `watchers_url_unique`;--> statement-breakpoint
DROP INDEX `watchers_checked_idx`;--> statement-breakpoint
ALTER TABLE `watchers` ADD `user_id` text DEFAULT '__legacy_owner__' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `watchers_user_url_unique` ON `watchers` (`user_id`,`url`);--> statement-breakpoint
CREATE INDEX `watchers_user_checked_idx` ON `watchers` (`user_id`,`last_checked_at`);