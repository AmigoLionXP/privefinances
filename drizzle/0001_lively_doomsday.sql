CREATE TABLE `document_organization` (
	`receipt_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`creditor_key` text NOT NULL,
	`tax_year` integer NOT NULL,
	`tax_status` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_owner` ON `document_organization` (`user_id`);--> statement-breakpoint
CREATE TABLE `financial_plans` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
