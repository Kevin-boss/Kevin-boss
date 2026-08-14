CREATE TABLE `voiceConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voiceId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`status` enum('pending','verified','revoked') NOT NULL DEFAULT 'pending',
	`approvedUseScope` enum('commercial_tts','internal_only') NOT NULL DEFAULT 'internal_only',
	`evidenceReference` varchar(500),
	`verifiedByUserId` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voiceConsents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `voiceConsents` ADD CONSTRAINT `voiceConsents_voiceId_voices_id_fk` FOREIGN KEY (`voiceId`) REFERENCES `voices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voiceConsents` ADD CONSTRAINT `voiceConsents_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voiceConsents` ADD CONSTRAINT `voiceConsents_verifiedByUserId_users_id_fk` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `voice_consents_voice_idx` ON `voiceConsents` (`voiceId`);--> statement-breakpoint
CREATE INDEX `voice_consents_workspace_idx` ON `voiceConsents` (`workspaceId`);