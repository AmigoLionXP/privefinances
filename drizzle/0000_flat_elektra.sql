CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checkouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product` text NOT NULL,
	`stripe_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkouts_stripe_id_unique` ON `checkouts` (`stripe_id`);--> statement-breakpoint
CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`vertical` text NOT NULL,
	`version` text NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entitlements` (
	`checkout_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product` text NOT NULL,
	`status` text NOT NULL,
	`subscription_id` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`checkout_id`) REFERENCES `checkouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`consent_id` text NOT NULL,
	`vertical` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consent_id`) REFERENCES `consents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`payload` text NOT NULL,
	`confirmed` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_object_key_unique` ON `receipts` (`object_key`);--> statement-breakpoint
CREATE INDEX `receipts_owner` ON `receipts` (`user_id`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`due_at` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rulesets` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_year` integer NOT NULL,
	`canton` text NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`sha256` text NOT NULL,
	CONSTRAINT "rules_json" CHECK(json_valid("rulesets"."payload"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rules_year_version` ON `rulesets` (`tax_year`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_approved_year` ON `rulesets` (`tax_year`,`canton`) WHERE "rulesets"."status"='approved';--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ruleset_id` text,
	`ruleset_hash` text,
	`payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ruleset_id`) REFERENCES `rulesets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `simulations_owner` ON `simulations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`identity_cipher` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleting` integer DEFAULT 0 NOT NULL
);
