CREATE TABLE `researchCitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`claimId` int,
	`sourceId` int NOT NULL,
	`quote` text NOT NULL,
	`locator` varchar(240),
	`verifiedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `researchCitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `researchCitations` ADD CONSTRAINT `researchCitations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchCitations` ADD CONSTRAINT `researchCitations_claimId_researchClaims_id_fk` FOREIGN KEY (`claimId`) REFERENCES `researchClaims`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchCitations` ADD CONSTRAINT `researchCitations_sourceId_researchSources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `researchSources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `researchCitations` ADD CONSTRAINT `researchCitations_verifiedByUserId_users_id_fk` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `research_citations_project_idx` ON `researchCitations` (`projectId`);--> statement-breakpoint
CREATE INDEX `research_citations_claim_idx` ON `researchCitations` (`claimId`);