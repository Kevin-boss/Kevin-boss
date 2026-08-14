import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { modelProviders } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { rankFreeFirst } from "../providerPolicy";

const capabilitySchema = z.enum(["text", "image", "video", "tts", "asr", "embedding", "vision"]);
const providerInput = z.object({ id: z.number().int().positive().optional(), name: z.string().min(2).max(160), provider: z.string().min(2).max(100), endpoint: z.string().url().max(1000), modelId: z.string().min(2).max(191), costTier: z.enum(["free", "paid", "metered"]).default("free"), selfHosted: z.enum(["yes", "no"]).default("yes"), license: z.string().max(500).optional(), commercialUse: z.enum(["allowed", "review", "restricted"]), vramGb: z.number().int().min(0).max(1024).optional(), capabilities: z.array(capabilitySchema).min(1), languages: z.array(z.string().max(16)).max(60).default([]), credentialReference: z.string().max(191).optional(), enabled: z.boolean().default(false) });

function requirePlatformAdmin(role: string) { if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Platform administrator access is required to configure providers." }); }

export const providerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => { requirePlatformAdmin(ctx.user.role); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db.select().from(modelProviders).orderBy(asc(modelProviders.costTier), desc(modelProviders.selfHosted), desc(modelProviders.updatedAt)); }),
  preferred: protectedProcedure.input(z.object({ capability: capabilitySchema })).query(async ({ ctx, input }) => { requirePlatformAdmin(ctx.user.role); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); const rows = await db.select().from(modelProviders).where(eq(modelProviders.enabled, "yes")); return rankFreeFirst(rows, input.capability); }),
  upsert: protectedProcedure.input(providerInput).mutation(async ({ ctx, input }) => {
    requirePlatformAdmin(ctx.user.role); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const values = { name: input.name, provider: input.provider, endpoint: input.endpoint, modelId: input.modelId, costTier: input.costTier, selfHosted: input.selfHosted, license: input.license ?? null, commercialUse: input.commercialUse, vramGb: input.vramGb ?? null, capabilities: input.capabilities, languages: input.languages, credentialReference: input.credentialReference ?? null, enabled: input.enabled ? "yes" as const : "no" as const, configuredByUserId: ctx.user.id };
    if (input.id) { await db.update(modelProviders).set(values).where(eq(modelProviders.id, input.id)); return { id: input.id, updated: true }; }
    const result = await db.insert(modelProviders).values(values); return { id: Number(result[0].insertId), updated: false };
  }),
});
