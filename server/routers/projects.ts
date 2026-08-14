import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { projects, videos } from "../../drizzle/schema";
import { getDb } from "../db";
import { createProjectWithVideo, recordAudit, requireProjectAccess, requireWorkspaceAccess } from "../platform";
import { protectedProcedure, router } from "../_core/trpc";

export const projectRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    return db.select().from(projects).where(eq(projects.workspaceId, input.workspaceId)).orderBy(desc(projects.updatedAt));
  }),
  create: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), title: z.string().min(2).max(180), description: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
    await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "edit");
    const created = await createProjectWithVideo({ workspaceId: input.workspaceId, title: input.title, description: input.description, userId: ctx.user.id });
    await recordAudit({ workspaceId: input.workspaceId, userId: ctx.user.id, action: "project.created", entityType: "project", entityId: String(created.projectId) });
    return created;
  }),
  get: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "read");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const projectVideos = await db.select().from(videos).where(eq(videos.projectId, input.projectId));
    return { project, videos: projectVideos };
  }),
  updateStatus: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), status: z.enum(["idea", "scripting", "generating", "editing", "ready", "scheduled", "published", "failed", "archived"]) })).mutation(async ({ ctx, input }) => {
    const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    await db.update(projects).set({ status: input.status }).where(eq(projects.id, input.projectId));
    await recordAudit({ workspaceId: project.workspaceId, userId: ctx.user.id, action: "project.status_updated", entityType: "project", entityId: String(input.projectId), metadata: { status: input.status } });
    return { success: true };
  }),
});
