CREATE TABLE `modelProviders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`provider` varchar(100) NOT NULL,
	`endpoint` text NOT NULL,
	`modelId` varchar(191) NOT NULL,
	`license` varchar(500),
	`commercialUse` enum('allowed','review','restricted') NOT NULL DEFAULT 'review',
	`vramGb` int,
	`capabilities` json NOT NULL,
	`languages` json NOT NULL,
	`credentialReference` varchar(191),
	`healthStatus` enum('unknown','healthy','unhealthy') NOT NULL DEFAULT 'unknown',
	`enabled` enum('yes','no') NOT NULL DEFAULT 'no',
	`configuredByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modelProviders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `modelProviders` ADD CONSTRAINT `modelProviders_configuredByUserId_users_id_fk` FOREIGN KEY (`configuredByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `model_providers_enabled_idx` ON `modelProviders` (`enabled`);