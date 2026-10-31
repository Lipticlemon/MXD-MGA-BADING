CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`course` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`note` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`provider` text NOT NULL,
	`checkout` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`page` text NOT NULL,
	`target` text NOT NULL,
	`visitor` text NOT NULL,
	`source` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`media` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `media` ADD `folder` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `object_key` text DEFAULT '' NOT NULL;