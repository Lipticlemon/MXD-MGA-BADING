CREATE INDEX `audit_created` ON `audit_log` (`created`);--> statement-breakpoint
CREATE INDEX `enrollments_created` ON `enrollments` (`created`);--> statement-breakpoint
CREATE INDEX `events_created` ON `events` (`created`);--> statement-breakpoint
CREATE INDEX `events_kind_page` ON `events` (`kind`,`page`);--> statement-breakpoint
CREATE INDEX `media_versions_parent` ON `media_versions` (`media`);--> statement-breakpoint
CREATE INDEX `revisions_created` ON `revisions` (`created`);