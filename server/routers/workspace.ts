import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { memberships, organizations, workspaces } from "../../drizzle/schema";
import { getDb } from "../db";
import { ensureWorkspaceForUser, recordAudit, requireWorkspaceAccess, workspaceRoles } from "../platform";
import { protectedProcedure, router } from "../_core/trpc";

export const workspaceRouter = router({
  bootstrap: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const current = await ensureWorkspaceForUser(ctx.user);
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const available = await db
      .select({ workspace: workspaces, organization: organizations, membership: memberships })
      .from(memberships)
      .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
      .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
      .where(and(eq(memberships.userId, ctx.user.id), eq(memberships.status, "active")));
    return { current, workspaces: available };
  }),

  create: protectedProcedure
    .input(z.object({ organizationName: z.string().min(2).max(120), workspaceName: z.string().min(2).max(120), kind: z.enum(["studio", "agency", "client"]).default("studio") }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const suffix = `${ctx.user.id}-${Date.now().toString(36)}`;
      const orgResult = await db.insert(organizations).values({ name: input.organizationName, slug: `${input.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${suffix}`, kind: input.kind, ownerUserId: ctx.user.id });
      const organizationId = Number(orgResult[0].insertId);
      const workspaceResult = await db.insert(workspaces).values({ organizationId, name: input.workspaceName, slug: `${input.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${suffix}`, kind: input.kind === "client" ? "client" : "primary" });
      const workspaceId = Number(workspaceResult[0].insertId);
      await db.insert(memberships).values({ userId: ctx.user.id, organizationId, workspaceId, role: "owner", status: "active" });
      await recordAudit({ workspaceId, userId: ctx.user.id, action: "workspace.created", entityType: "workspace", entityId: String(workspaceId), metadata: { kind: input.kind } });
      return { organizationId, workspaceId };
    }),

  members: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    return db.select().from(memberships).where(eq(memberships.workspaceId, input.workspaceId));
  }),

  assignRole: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive(), membershipId: z.number().int().positive(), role: z.enum(workspaceRoles) }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "admin");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      await db.update(memberships).set({ role: input.role }).where(and(eq(memberships.id, input.membershipId), eq(memberships.workspaceId, input.workspaceId)));
      await recordAudit({ workspaceId: input.workspaceId, userId: ctx.user.id, action: "membership.role_updated", entityType: "membership", entityId: String(input.membershipId), metadata: { role: input.role } });
      return { success: true };
    }),
});
