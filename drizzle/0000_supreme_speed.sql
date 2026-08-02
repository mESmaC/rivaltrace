CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`watcher_id` text NOT NULL,
	`checked_at` text NOT NULL,
	`source_url` text NOT NULL,
	`final_url` text NOT NULL,
	`page_title` text NOT NULL,
	`status_code` integer NOT NULL,
	`byte_length` integer NOT NULL,
	`content_hash` text NOT NULL,
	`normalized_text` text NOT NULL,
	`change_kind` text NOT NULL,
	`change_summary` text NOT NULL,
	`added_json` text DEFAULT '[]' NOT NULL,
	`removed_json` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `snapshots_watcher_checked_idx` ON `snapshots` (`watcher_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `watchers` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`created_at` text NOT NULL,
	`last_checked_at` text NOT NULL,
	`last_changed_at` text,
	`latest_hash` text NOT NULL,
	`latest_snapshot_id` text NOT NULL,
	`status` text DEFAULT 'stable' NOT NULL,
	`change_kind` text DEFAULT 'baseline' NOT NULL,
	`change_summary` text DEFAULT 'Baseline saved.' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchers_url_unique` ON `watchers` (`url`);--> statement-breakpoint
CREATE INDEX `watchers_checked_idx` ON `watchers` (`last_checked_at`);