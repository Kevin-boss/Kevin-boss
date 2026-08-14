import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { assets, captions, jobs, researchClaims, researchSources, scheduledPosts, scripts, socialAccounts, transcripts, videos, voices } from "../../drizzle/schema";
import { getDb } from "../db";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";
import { transcribeAudio } from "../_core/voiceTranscription";
import { createJob, recordAudit, requireProjectAccess, requireWorkspaceAccess, updateJob } from "../platform";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

const sceneSchema = z.object({ id: z.string(), duration: z.number(), voiceover: z.string(), visualPrompt: z.string(), broll: z.string(), onscreenText: z.string(), transition: z.string(), music: z.string(), soundEffect: z.string() });
const structuredScriptSchema = z.object({ title: z.string(), language: z.string(), hook: z.string(), summary: z.string(), cta: z.string(), scenes: z.array(sceneSchema) });

function srtTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds * 1000));
  const hrs = String(Math.floor(total / 3600000)).padStart(2, "0");
  const mins = String(Math.floor((total % 3600000) / 60000)).padStart(2, "0");
  const secs = String(Math.floor((total % 60000) / 1000)).padStart(2, "0");
  const ms = String(total % 1000).padStart(3, "0");
  return `${hrs}:${mins}:${secs},${ms}`;
}

export const productionRouter = router({
  script: router({
    get: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx.user.id, input.projectId, "read");
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      return db.select().from(scripts).where(eq(scripts.projectId, input.projectId)).orderBy(desc(scripts.updatedAt)).limit(1);
    }),
    generate: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), topic: z.string().min(8).max(500), audience: z.string().min(2).max(180), language: z.enum(["en", "fr"]), tone: z.string().min(2).max(80), durationMinutes: z.number().min(0.25).max(60), cta: z.string().max(300).optional(), keywords: z.array(z.string().max(80)).max(20).default([]) })).mutation(async ({ ctx, input }) => {
      const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit");
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const jobId = await createJob({ workspaceId: project.workspaceId, projectId: project.id, type: "script_generation", actorUserId: ctx.user.id, payload: input });
      await updateJob(jobId, { status: "processing", progress: 15, startedAt: new Date() }, { message: "Generating structured script", progress: 15 });
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are the Script Studio for a professional AI video production platform. Return only valid JSON that satisfies the requested schema. Never invent citations or claim that unverified research is factual." },
            { role: "user", content: `Create a ${input.durationMinutes}-minute ${input.language === "fr" ? "French" : "English"} video script. Topic: ${input.topic}. Audience: ${input.audience}. Tone: ${input.tone}. CTA: ${input.cta ?? "Invite the viewer to follow for more"}. Keywords: ${input.keywords.join(", ") || "none"}. Create an engaging hook, production-ready voiceover, visual prompts, B-roll suggestions, transitions, music moods, and SFX cues. Use scene IDs scene_001 etc.` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "video_script", strict: true, schema: { type: "object", properties: { title: { type: "string" }, language: { type: "string" }, hook: { type: "string" }, summary: { type: "string" }, cta: { type: "string" }, scenes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, duration: { type: "number" }, voiceover: { type: "string" }, visualPrompt: { type: "string" }, broll: { type: "string" }, onscreenText: { type: "string" }, transition: { type: "string" }, music: { type: "string" }, soundEffect: { type: "string" } }, required: ["id", "duration", "voiceover", "visualPrompt", "broll", "onscreenText", "transition", "music", "soundEffect"], additionalProperties: false } } }, required: ["title", "language", "hook", "summary", "cta", "scenes"], additionalProperties: false } } },
        });
        const raw = response.choices[0]?.message.content;
        if (typeof raw !== "string") throw new Error("The AI provider returned an unsupported script response.");
        const content = structuredScriptSchema.parse(JSON.parse(raw));
        const prior = await db.select().from(scripts).where(eq(scripts.projectId, project.id)).limit(1);
        if (prior[0]) await db.update(scripts).set({ content, language: input.language, updatedByUserId: ctx.user.id }).where(eq(scripts.id, prior[0].id));
        else await db.insert(scripts).values({ projectId: project.id, videoId: null, language: input.language, content, createdByUserId: ctx.user.id, updatedByUserId: ctx.user.id });
        await db.update(videos).set({ status: "scripting" }).where(eq(videos.projectId, project.id));
        await updateJob(jobId, { status: "completed", progress: 100, result: content, completedAt: new Date() }, { message: "Structured script ready for review", progress: 100 });
        await recordAudit({ workspaceId: project.workspaceId, userId: ctx.user.id, action: "script.generated", entityType: "project", entityId: String(project.id), metadata: { jobId } });
        return { jobId, content };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Script generation failed.";
        await updateJob(jobId, { status: "failed", errorCode: "SCRIPT_GENERATION_FAILED", errorMessage: message, completedAt: new Date() }, { message, level: "error" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
  }),

  research: router({
    list: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireProjectAccess(ctx.user.id, input.projectId, "read");
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const sources = await db.select().from(researchSources).where(eq(researchSources.projectId, input.projectId));
      const claims = await db.select().from(researchClaims).where(eq(researchClaims.projectId, input.projectId));
      return { sources, claims };
    }),
    addSource: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), title: z.string().min(2).max(300), url: z.string().url().optional(), excerpt: z.string().min(5).max(12000), sourceType: z.enum(["user_provided", "verified", "ai_generated"]).default("user_provided") })).mutation(async ({ ctx, input }) => {
      const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit");
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const result = await db.insert(researchSources).values({ projectId: input.projectId, title: input.title, url: input.url ?? null, excerpt: input.excerpt, sourceType: input.sourceType, createdByUserId: ctx.user.id });
      const sourceId = Number(result[0].insertId);
      await recordAudit({ workspaceId: project.workspaceId, userId: ctx.user.id, action: "research.source_added", entityType: "research_source", entityId: String(sourceId), metadata: { sourceType: input.sourceType } });
      return { sourceId };
    }),
    extractClaims: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit");
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const sources = await db.select().from(researchSources).where(eq(researchSources.projectId, input.projectId));
      if (!sources.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one source before extracting claims." });
      const jobId = await createJob({ workspaceId: project.workspaceId, projectId: project.id, type: "research", actorUserId: ctx.user.id, payload: { sourceIds: sources.map(source => source.id) } });
      await updateJob(jobId, { status: "processing", progress: 20, startedAt: new Date() }, { message: "Extracting source-grounded claims", progress: 20 });
      try {
        const bundle = sources.map(source => ({ id: source.id, title: source.title, url: source.url, excerpt: source.excerpt, sourceType: source.sourceType }));
        const response = await invokeLLM({ messages: [{ role: "system", content: "You extract claims only from provided sources. Return JSON. Never present an inference as verified. Label each claim as verified if directly supported by a source, or ai_generated if it is an editorial synthesis. Include sourceId only for directly supported claims." }, { role: "user", content: JSON.stringify(bundle) }], response_format: { type: "json_schema", json_schema: { name: "research_claims", strict: true, schema: { type: "object", properties: { claims: { type: "array", items: { type: "object", properties: { text: { type: "string" }, classification: { type: "string", enum: ["verified", "ai_generated"] }, sourceId: { type: ["number", "null"] }, confidence: { type: "number" } }, required: ["text", "classification", "sourceId", "confidence"], additionalProperties: false } } }, required: ["claims"], additionalProperties: false } } } });
        const raw = response.choices[0]?.message.content; if (typeof raw !== "string") throw new Error("The AI provider returned an unsupported research response.");
        const parsed = z.object({ claims: z.array(z.object({ text: z.string(), classification: z.enum(["verified", "ai_generated"]), sourceId: z.number().nullable(), confidence: z.number().min(0).max(1) })) }).parse(JSON.parse(raw));
        for (const claim of parsed.claims) await db.insert(researchClaims).values({ projectId: project.id, sourceId: claim.classification === "verified" ? claim.sourceId : null, text: claim.text, classification: claim.classification, confidence: String(claim.confidence), createdByUserId: ctx.user.id });
        await updateJob(jobId, { status: "completed", progress: 100, result: parsed, completedAt: new Date() }, { message: "Claims extracted with provenance labels", progress: 100 });
        return { jobId, claims: parsed.claims };
      } catch (error) { const message = error instanceof Error ? error.message : "Claim extraction failed."; await updateJob(jobId, { status: "failed", errorCode: "RESEARCH_FAILED", errorMessage: message, completedAt: new Date() }, { message, level: "error" }); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message }); }
    }),
  }),

  assets: router({
    list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), type: z.enum(["video", "image", "audio", "music", "sfx", "font", "thumbnail", "caption", "document"]).optional() })).query(async ({ ctx, input }) => {
      await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      return db.select().from(assets).where(input.type ? and(eq(assets.workspaceId, input.workspaceId), eq(assets.type, input.type)) : eq(assets.workspaceId, input.workspaceId)).orderBy(desc(assets.createdAt));
    }),
    upload: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), projectId: z.number().int().positive().optional(), title: z.string().min(2).max(180), fileName: z.string().min(1).max(240), contentType: z.string().min(3).max(120), dataBase64: z.string().min(4).max(24000000), type: z.enum(["video", "image", "audio", "music", "sfx", "font", "thumbnail", "caption", "document"]), license: z.string().max(240).optional(), author: z.string().max(240).optional(), attribution: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "edit");
      if (input.projectId) { const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit"); if (project.workspaceId !== input.workspaceId) throw new TRPCError({ code: "FORBIDDEN", message: "Project and asset workspace do not match." }); }
      const accepted = /^(image|audio|video)\/[a-z0-9.+-]+$|^application\/(pdf|json|octet-stream)$/i;
      if (!accepted.test(input.contentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "This file type is not permitted for upload." });
      const data = Buffer.from(input.dataBase64, "base64");
      if (!data.length || data.length > 16 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload must be between 1 byte and 16 MB." });
      const safeName = input.fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(-120);
      const { key, url } = await storagePut(`workspaces/${input.workspaceId}/uploads/${Date.now()}-${safeName}`, data, input.contentType);
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const result = await db.insert(assets).values({ workspaceId: input.workspaceId, projectId: input.projectId ?? null, type: input.type, title: input.title, storageKey: key, storageUrl: url, source: "upload", rightsStatus: input.license ? "review_required" : "unknown", license: input.license ?? null, author: input.author ?? null, attribution: input.attribution ?? null, createdByUserId: ctx.user.id });
      const assetId = Number(result[0].insertId); await recordAudit({ workspaceId: input.workspaceId, userId: ctx.user.id, action: "asset.uploaded", entityType: "asset", entityId: String(assetId), metadata: { contentType: input.contentType, size: data.length } });
      return { assetId, key, url };
    }),
    createImage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), prompt: z.string().min(12).max(1500), title: z.string().min(2).max(160), usage: z.enum(["scene_visual", "broll", "thumbnail"]).default("scene_visual"), referenceImageUrl: z.string().url().optional() })).mutation(async ({ ctx, input }) => {
      const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const jobId = await createJob({ workspaceId: project.workspaceId, projectId: project.id, type: "image_generation", actorUserId: ctx.user.id, payload: input }); await updateJob(jobId, { status: "processing", progress: 20, startedAt: new Date() }, { message: "Generating visual asset", progress: 20 });
      try { const image = await generateImage({ prompt: input.prompt, originalImages: input.referenceImageUrl ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" }] : undefined }); const inserted = await db.insert(assets).values({ workspaceId: project.workspaceId, projectId: project.id, type: input.usage === "thumbnail" ? "thumbnail" : "image", title: input.title, storageUrl: image.url, source: "ai_generated", rightsStatus: "review_required", metadata: { prompt: input.prompt, usage: input.usage, referenceImageUrl: input.referenceImageUrl ?? null }, createdByUserId: ctx.user.id }); const assetId = Number(inserted[0].insertId); await updateJob(jobId, { status: "completed", progress: 100, result: { assetId, url: image.url }, completedAt: new Date() }, { message: "Visual asset ready for review", progress: 100 }); return { jobId, assetId, url: image.url }; } catch (error) { const message = error instanceof Error ? error.message : "Image generation failed."; await updateJob(jobId, { status: "failed", errorCode: "IMAGE_GENERATION_FAILED", errorMessage: message, completedAt: new Date() }, { message, level: "error" }); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message }); }
    }),
  }),

  voice: router({
    list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), gender: z.enum(["male", "female", "neutral"]).optional(), language: z.enum(["en", "fr"]).optional() })).query(async ({ ctx, input }) => { await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db.select().from(voices).where(eq(voices.workspaceId, input.workspaceId)); }),
    transcribe: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), audioUrl: z.string().url(), language: z.enum(["en", "fr"]).optional(), title: z.string().min(2).max(160).default("Project transcript") })).mutation(async ({ ctx, input }) => {
      const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); const jobId = await createJob({ workspaceId: project.workspaceId, projectId: project.id, type: "transcription", actorUserId: ctx.user.id, payload: input }); await updateJob(jobId, { status: "processing", progress: 20, startedAt: new Date() }, { message: "Transcribing audio with word timing", progress: 20 });
      try { const result = await transcribeAudio({ audioUrl: input.audioUrl, language: input.language }); if ("error" in result) throw new Error(result.error); const segments = result.segments ?? []; const transcriptResult = await db.insert(transcripts).values({ projectId: project.id, language: result.language ?? input.language ?? "en", text: result.text, segments, sourceUrl: input.audioUrl, createdByUserId: ctx.user.id }); const transcriptId = Number(transcriptResult[0].insertId); const srt = segments.map((segment: { start: number; end: number; text: string }, index: number) => `${index + 1}\n${srtTime(segment.start)} --> ${srtTime(segment.end)}\n${segment.text.trim()}\n`).join("\n"); const vtt = `WEBVTT\n\n${segments.map((segment: { start: number; end: number; text: string }) => `${srtTime(segment.start).replace(",", ".")} --> ${srtTime(segment.end).replace(",", ".")}\n${segment.text.trim()}\n`).join("\n")}`; await db.insert(captions).values({ projectId: project.id, transcriptId, language: result.language ?? input.language ?? "en", style: "minimal", srt, vtt, wordTiming: segments, createdByUserId: ctx.user.id }); await updateJob(jobId, { status: "completed", progress: 100, result: { transcriptId, segmentCount: segments.length }, completedAt: new Date() }, { message: "Transcript and captions ready", progress: 100 }); return { jobId, transcriptId, transcript: result.text, srt, vtt }; } catch (error) { const message = error instanceof Error ? error.message : "Transcription failed."; await updateJob(jobId, { status: "failed", errorCode: "TRANSCRIPTION_FAILED", errorMessage: message, completedAt: new Date() }, { message, level: "error" }); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message }); }
    }),
  }),

  jobs: router({
    list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db.select().from(jobs).where(eq(jobs.workspaceId, input.workspaceId)).orderBy(desc(jobs.createdAt)).limit(40); }),
    cancel: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); const job = (await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1))[0]; if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." }); await requireWorkspaceAccess(ctx.user.id, job.workspaceId, "edit"); if (["completed", "failed", "cancelled"].includes(job.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "This job is already finished." }); await updateJob(job.id, { status: "cancelled", cancelRequestedAt: new Date(), completedAt: new Date() }, { message: "Cancellation requested by user", level: "warning" }); return { success: true }; }),
    retry: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); const job = (await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1))[0]; if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." }); await requireWorkspaceAccess(ctx.user.id, job.workspaceId, "edit"); if (job.status !== "failed") throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed jobs can be retried." }); await updateJob(job.id, { status: "queued", progress: 0, errorCode: null, errorMessage: null, completedAt: null }, { message: "Job requeued for retry", progress: 0 }); return { success: true }; }),
  }),
  social: router({
    listAccounts: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db.select().from(socialAccounts).where(eq(socialAccounts.workspaceId, input.workspaceId)).orderBy(desc(socialAccounts.updatedAt)); }),
    listPosts: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireWorkspaceAccess(ctx.user.id, input.workspaceId, "read"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db.select().from(scheduledPosts).where(eq(scheduledPosts.workspaceId, input.workspaceId)).orderBy(desc(scheduledPosts.updatedAt)); }),
    createPost: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), platform: z.enum(["youtube", "tiktok", "facebook", "instagram", "linkedin", "x"]), title: z.string().max(200).optional(), copy: z.string().max(6000).optional(), scheduledFor: z.date().optional() })).mutation(async ({ ctx, input }) => { const { project } = await requireProjectAccess(ctx.user.id, input.projectId, "edit"); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); const status = input.scheduledFor ? "awaiting_approval" as const : "draft" as const; const result = await db.insert(scheduledPosts).values({ workspaceId: project.workspaceId, projectId: project.id, platform: input.platform, title: input.title ?? null, copy: input.copy ?? null, scheduledFor: input.scheduledFor ?? null, status, createdByUserId: ctx.user.id }); const postId = Number(result[0].insertId); await recordAudit({ workspaceId: project.workspaceId, userId: ctx.user.id, action: "social.post_planned", entityType: "scheduled_post", entityId: String(postId), metadata: { platform: input.platform, status } }); return { postId, status }; }),
  }),
});
