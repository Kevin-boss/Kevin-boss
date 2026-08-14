import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  assets,
  captions,
  copilotActions,
  jobEvents,
  jobs,
  memberships,
  organizations,
  projects,
  researchClaims,
  researchSources,
  scripts,
  transcripts,
  videoVersions,
  videos,
  voices,
  workspaces,
} from "../drizzle/schema";
import { getDb } from "./db";

export const workspaceRoles = ["owner", "admin", "editor", "reviewer", "viewer", "client"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

const editorRoles: WorkspaceRole[] = ["owner", "admin", "editor"];
const reviewRoles: WorkspaceRole[] = ["owner", "admin", "editor", "reviewer", "client"];

function asId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number } | undefined)?.insertId);
  if (!Number.isFinite(id) || id < 1) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create platform record." });
  }
  return id;
}

export async function ensureWorkspaceForUser(user: { id: number; name?: string | null }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

  const existing = await db
    .select({ workspace: workspaces, membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")))
    .orderBy(desc(memberships.createdAt))
    .limit(1);

  if (existing[0]) return existing[0];

  const suffix = nanoid(6).toLowerCase();
  const studioName = `${user.name?.trim() || "My"} Studio`;
  const organizationId = asId(
    await db.insert(organizations).values({
      name: studioName,
      slug: `studio-${user.id}-${suffix}`,
      kind: "studio",
      ownerUserId: user.id,
    })
  );
  const workspaceId = asId(
    await db.insert(workspaces).values({
      organizationId,
      name: "Production workspace",
      slug: `production-${suffix}`,
      kind: "primary",
    })
  );
  const membershipId = asId(
    await db.insert(memberships).values({
      userId: user.id,
      organizationId,
      workspaceId,
      role: "owner",
      status: "active",
    })
  );

  const created = await db
    .select({ workspace: workspaces, membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .where(eq(memberships.id, membershipId))
    .limit(1);
  if (!created[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Workspace initialization failed." });
  return created[0];
}

export async function requireWorkspaceAccess(
  userId: number,
  workspaceId: number,
  minimum: "read" | "review" | "edit" | "admin" = "read"
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const rows = await db
    .select({ membership: memberships, workspace: workspaces, organization: organizations })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId), eq(memberships.status, "active")))
    .limit(1);
  const access = rows[0];
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this workspace." });
  const role = access.membership.role as WorkspaceRole;
  const allowed =
    minimum === "read" ? workspaceRoles :
      minimum === "review" ? reviewRoles :
        minimum === "edit" ? editorRoles : ["owner", "admin"];
  if (!allowed.includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your workspace role does not permit this action." });
  }
  return access;
}

export async function requireProjectAccess(
  userId: number,
  projectId: number,
  minimum: "read" | "review" | "edit" | "admin" = "read"
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const project = (await db.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0];
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  const access = await requireWorkspaceAccess(userId, project.workspaceId, minimum);
  return { project, access };
}

export async function createJob(input: {
  workspaceId: number;
  projectId?: number | null;
  videoId?: number | null;
  type: typeof jobs.$inferInsert.type;
  payload?: Record<string, unknown>;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const jobId = asId(
    await db.insert(jobs).values({
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      videoId: input.videoId ?? null,
      type: input.type,
      payload: input.payload ?? {},
      createdByUserId: input.actorUserId,
      status: "queued",
      progress: 0,
      idempotencyKey: nanoid(18),
    })
  );
  await db.insert(jobEvents).values({ jobId, level: "info", message: "Job queued", progress: 0 });
  return jobId;
}

export async function updateJob(
  jobId: number,
  values: Partial<Pick<typeof jobs.$inferInsert, "status" | "progress" | "result" | "errorCode" | "errorMessage" | "startedAt" | "completedAt" | "cancelRequestedAt">>,
  event?: { message: string; level?: "info" | "warning" | "error"; progress?: number | null }
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  await db.update(jobs).set(values).where(eq(jobs.id, jobId));
  if (event) await db.insert(jobEvents).values({ jobId, level: event.level ?? "info", message: event.message, progress: event.progress ?? null });
}

export async function createProjectWithVideo(input: { workspaceId: number; title: string; description?: string | null; userId: number }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const projectId = asId(await db.insert(projects).values({ workspaceId: input.workspaceId, title: input.title, description: input.description ?? null, createdByUserId: input.userId }));
  const videoId = asId(await db.insert(videos).values({ projectId, title: input.title, status: "idea", createdByUserId: input.userId }));
  await db.insert(videoVersions).values({ videoId, versionNumber: 1, label: "Initial draft", createdByUserId: input.userId, projectDocument: { scenes: [], tracks: [], settings: { aspectRatio: "16:9", exportPreset: "youtube_1080p" } } });
  return { projectId, videoId };
}

export async function recordAudit(input: { workspaceId: number; userId: number; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  const { auditLogs } = await import("../drizzle/schema");
  await db.insert(auditLogs).values({ ...input, metadata: input.metadata ?? {} });
}

export const platformTables = { assets, captions, copilotActions, researchClaims, researchSources, scripts, transcripts, voices };
