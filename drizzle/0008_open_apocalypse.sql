CREATE TABLE `socialOAuthStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`platform` enum('youtube','tiktok','facebook','instagram','linkedin','x') NOT NULL,
	`state` varchar(191) NOT NULL,
	`redirectUri` varchar(500) NOT NULL,
	`codeVerifier` varchar(191),
	`expiresAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialOAuthStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `socialOAuthStates_state_unique` UNIQUE(`state`)
);
--> statement-breakpoint
CREATE TABLE `socialPostVariants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduledPostId` int NOT NULL,
	`platform` enum('youtube','tiktok','facebook','instagram','linkedin','x') NOT NULL,
	`title` varchar(200),
	`copy` text,
	`hashtags` json,
	`provenance` enum('ai_generated','user_edited','user_provided') NOT NULL DEFAULT 'user_provided',
	`selected` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialPostVariants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialPublishAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduledPostId` int NOT NULL,
	`socialAccountId` int,
	`idempotencyKey` varchar(96) NOT NULL,
	`status` enum('queued','dispatching','submitted','published','failed','cancelled') NOT NULL DEFAULT 'queued',
	`providerRequestId` varchar(191),
	`providerPostId` varchar(191),
	`errorCode` varchar(100),
	`errorMessage` text,
	`dispatchedAt` timestamp,
	`completedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialPublishAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `socialPublishAttempts_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `socialWebhookEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('youtube','tiktok','facebook','instagram','linkedin','x') NOT NULL,
	`providerEventId` varchar(191) NOT NULL,
	`socialAccountId` int,
	`payload` json NOT NULL,
	`receivedAt` timestamp NOT NULL,
	`processedAt` timestamp,
	`status` enum('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialWebhookEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `socialWebhookEvents_providerEventId_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `deliveryAssetId` int;--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `selectedVariantId` int;--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `approvedByUserId` int;--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `lastDispatchAt` timestamp;--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `providerPostId` varchar(191);--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD `lastError` text;--> statement-breakpoint
ALTER TABLE `socialAccounts` ADD `accountType` varchar(80);--> statement-breakpoint
ALTER TABLE `socialAccounts` ADD `scopes` json;--> statement-breakpoint
ALTER TABLE `socialAccounts` ADD `tokenExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `socialOAuthStates` ADD CONSTRAINT `socialOAuthStates_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialOAuthStates` ADD CONSTRAINT `socialOAuthStates_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialPostVariants` ADD CONSTRAINT `socialPostVariants_scheduledPostId_scheduledPosts_id_fk` FOREIGN KEY (`scheduledPostId`) REFERENCES `scheduledPosts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialPostVariants` ADD CONSTRAINT `socialPostVariants_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialPublishAttempts` ADD CONSTRAINT `socialPublishAttempts_scheduledPostId_scheduledPosts_id_fk` FOREIGN KEY (`scheduledPostId`) REFERENCES `scheduledPosts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialPublishAttempts` ADD CONSTRAINT `socialPublishAttempts_socialAccountId_socialAccounts_id_fk` FOREIGN KEY (`socialAccountId`) REFERENCES `socialAccounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialPublishAttempts` ADD CONSTRAINT `socialPublishAttempts_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialWebhookEvents` ADD CONSTRAINT `socialWebhookEvents_socialAccountId_socialAccounts_id_fk` FOREIGN KEY (`socialAccountId`) REFERENCES `socialAccounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `social_oauth_workspace_idx` ON `socialOAuthStates` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `social_oauth_platform_expiry_idx` ON `socialOAuthStates` (`platform`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `social_variants_post_idx` ON `socialPostVariants` (`scheduledPostId`);--> statement-breakpoint
CREATE INDEX `social_variants_post_selected_idx` ON `socialPostVariants` (`scheduledPostId`,`selected`);--> statement-breakpoint
CREATE INDEX `social_attempts_post_idx` ON `socialPublishAttempts` (`scheduledPostId`);--> statement-breakpoint
CREATE INDEX `social_attempts_status_idx` ON `socialPublishAttempts` (`status`);--> statement-breakpoint
CREATE INDEX `social_webhooks_platform_received_idx` ON `socialWebhookEvents` (`platform`,`receivedAt`);--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD CONSTRAINT `scheduledPosts_deliveryAssetId_assets_id_fk` FOREIGN KEY (`deliveryAssetId`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduledPosts` ADD CONSTRAINT `scheduledPosts_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `scheduled_posts_dispatch_idx` ON `scheduledPosts` (`status`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `social_accounts_platform_status_idx` ON `socialAccounts` (`workspaceId`,`platform`,`connectionStatus`);