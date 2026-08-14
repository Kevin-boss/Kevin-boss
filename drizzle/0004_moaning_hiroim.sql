CREATE TABLE `researchSummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`summary` text NOT NULL,
	`sourceCount` int NOT NULL,
	`verifiedClaimCount` int NOT NULL,
	`synthesisClaimCount` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `researchSummaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `researchSummaries` ADD CONSTRAINT `researchSummaries_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchSummaries` ADD CONSTRAINT `researchSummaries_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `research_summaries_project_idx` ON `researchSummaries` (`projectId`);