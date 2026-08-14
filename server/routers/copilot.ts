import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { copilotActions } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM, type Tool } from "../_core/llm";
import { createJob, recordAudit, requireProjectAccess } from "../platform";
import { protectedProcedure, router } from "../_core/trpc";

const copilotTools: Tool[] = [
  { type: "function", function: { name: "create_short_repurpose_job", description: "Queue an executable job that plans and creates short-form derivatives.", parameters: { type: "object", properties: { count: { type: "integer", minimum: 1, maximum: 20 }, platform: { type: "string", enum: ["youtube_shorts", "tiktok", "reels", "multi_platform"] } }, required: ["count", "platform"], additionalProperties: false } } },
  { type: "function", function: { name: "create_translation_job", description: "Queue a translation job for the project's structured script.", parameters: { type: "object", properties: { targetLanguage: { type: "string", enum: ["en", "fr"] } }, required: ["targetLanguage"], additionalProperties: false } } },
  { type: "function", function: { name: "create_script_refinement_job", description: "Queue a scripted refinement for a specified section.", parameters: { type: "object", properties: { target: { type: "string", enum: ["hook", "intro", "scene", "cta"] }, instruction: { type: "string" } }, required: ["target", "instruction"], additionalProperties: false } } },
  { type: "function", function: { name: "create_thumbnail_brief", description: "Queue a thumbnail concept brief that can be reviewed before image generation.", parameters: { type: "object", properties: { style: { type: "string" }, variants: { type: "integer", minimum: 3, maximum: 5 } }, required: ["style", "variants"], additionalProperties: false } } },
  { type: "function", function: { name: "create_publication_plan", description: "Create an approval-required publishing plan for official social accounts.", parameters: { type: "object", properties: { platforms: { type: "array", items: { type: "string", enum: ["youtube", "tiktok", "facebook", "instagram", "linkedin", "x"] }, minItems: 1 }, scheduleHint: { type: "string" } }, required: ["platforms", "scheduleHint"], additionalProperties: false } } },
];

export const copilotRouter = router({
  list: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireProjectAccess(ctx.user.id, input.projectId, "read"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db.select().from(copilotActions).where(eq(copilotActions.projectId, input.projectId)).orderBy(desc(copilotActions.createdAt)).limit(30); }),
  execute: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), command: z.string().min(4).max(1000) })).mutation(async ({ ctx, input }) => {
    const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const response = await invokeLLM({ messages: [{ role: "system", content: "You are an action-only AI Copilot in a video production SaaS. You must respond by calling exactly one provided tool. Do not answer conversationally. Choose the least destructive tool that fulfills the user command. Publishing plans always require human approval." }, { role: "user", content: input.command }], tools: copilotTools, tool_choice: "required" });
    const call = response.choices[0]?.message.tool_calls?.[0];
    if (!call) throw new TRPCError({ code: "BAD_REQUEST", message: "The Copilot did not return an executable action." });
    let parameters: Record<string, unknown>;
    try { parameters = JSON.parse(call.function.arguments) as Record<string, unknown>; } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "The Copilot returned invalid action parameters." }); }
    const allowed = new Set(copilotTools.map(tool => tool.function.name)); if (!allowed.has(call.function.name)) throw new TRPCError({ code: "FORBIDDEN", message: "The requested Copilot action is not permitted." });
    const jobType = call.function.name === "create_short_repurpose_job" ? "short_detection" : call.function.name === "create_translation_job" ? "translation" : call.function.name === "create_thumbnail_brief" ? "thumbnail_generation" : call.function.name === "create_publication_plan" ? "social_publish" : "script_generation";
    const jobId = await createJob({ workspaceId: project.workspaceId, projectId: project.id, type: jobType, actorUserId: ctx.user.id, payload: { tool: call.function.name, parameters, command: input.command } });
    const result = await db.insert(copilotActions).values({ projectId: project.id, workspaceId: project.workspaceId, command: input.command, toolName: call.function.name, parameters, executionStatus: call.function.name === "create_publication_plan" ? "awaiting_approval" : "queued", jobId, createdByUserId: ctx.user.id });
    const actionId = Number(result[0].insertId); await recordAudit({ workspaceId: project.workspaceId, userId: ctx.user.id, action: "copilot.tool_queued", entityType: "copilot_action", entityId: String(actionId), metadata: { tool: call.function.name, jobId } });
    return { actionId, jobId, toolName: call.function.name, parameters, executionStatus: call.function.name === "create_publication_plan" ? "awaiting_approval" : "queued" };
  }),
});
