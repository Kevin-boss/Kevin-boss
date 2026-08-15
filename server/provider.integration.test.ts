import { describe, expect, it, vi } from "vitest";
const hfMocks = vi.hoisted(() => ({ textToSpeech: vi.fn() }));
const heartbeatMocks = vi.hoisted(() => ({ createHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn(), deleteHeartbeatJob: vi.fn() }));
vi.mock("@huggingface/inference", () => ({ InferenceClient: class { textToSpeech = hfMocks.textToSpeech; } }));
vi.mock("./_core/heartbeat", () => heartbeatMocks);

import { appRouter } from "./routers";
import { getDb } from "./db";
import { createJob, recordAudit, requireProjectAccess, requireWorkspaceAccess, updateJob } from "./platform";
import { storagePut } from "./storage";
import { scheduledPosts, socialAccounts, socialPublishAttempts, voiceConsents, voices } from "../drizzle/schema";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./platform", async importOriginal => {
  const actual = await importOriginal<typeof import("./platform")>();
  return { ...actual, createJob: vi.fn(), recordAudit: vi.fn(), requireProjectAccess: vi.fn(), requireWorkspaceAccess: vi.fn(), updateJob: vi.fn() };
});
vi.mock("./storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));

const provider = { id: 2, name: "Local image", provider: "comfyui", endpoint: "https://local.test/image", modelId: "free-image", costTier: "free" as const, selfHosted: "yes" as const, commercialUse: "allowed" as const, enabled: "yes" as const, capabilities: ["image"] };
const textProvider = { ...provider, id: 3, endpoint: "https://local.test/text", modelId: "free-text", capabilities: ["text"] };
const publicTextProvider = { ...textProvider, id: 33, name: "Hugging Face public text", provider: "huggingface", endpoint: "https://router.huggingface.co/v1/chat/completions", modelId: "openai/gpt-oss-20b:cheapest", selfHosted: "no" as const };
const asrProvider = { ...provider, id: 4, endpoint: "https://local.test/asr", modelId: "free-asr", capabilities: ["asr"] };
const ttsProvider = { ...provider, id: 5, endpoint: "https://local.test/tts", modelId: "free-tts", capabilities: ["tts"] };
const publicTtsProvider = { ...ttsProvider, id: 55, name: "Hugging Face public TTS", provider: "huggingface", endpoint: "https://router.huggingface.co/hf-inference/models/hexgrad/Kokoro-82M", modelId: "hexgrad/Kokoro-82M", selfHosted: "no" as const };
const videoProvider = { ...provider, id: 6, endpoint: "https://local.test/render", modelId: "free-render", capabilities: ["video"] };
const paidOnly = <T extends typeof provider>(configuredProvider: T) => ({ ...configuredProvider, costTier: "paid" as const, selfHosted: "no" as const });
const user = { id: 7, openId: "provider-user", email: "provider@example.com", name: "Provider User", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const ctx = { user, req: { protocol: "https", headers: {} } as any, res: {} as any };
const queryRows = (rows: unknown[]) => Object.assign(Promise.resolve(rows), { limit: async () => rows });

describe("provider-backed production procedures", () => {
  it("executes image generation through the preferred free registry provider", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(101);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ url: "https://local.test/generated.png" }] }), { status: 200 })));
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: () => queryRows([provider]) }) }),
      insert: () => ({ values: async () => [{ insertId: 55 }] }),
    } as any);

    const result = await appRouter.createCaller(ctx).production.assets.createImage({ projectId: 9, prompt: "A cinematic studio workspace with soft light", title: "Studio visual", usage: "scene_visual" });
    expect(result).toMatchObject({ jobId: 101, assetId: 55, url: "https://local.test/generated.png" });
    expect(fetch).toHaveBeenCalledWith("https://local.test/image", expect.objectContaining({ method: "POST" }));
  });

  it("executes structured script generation through the preferred free text provider", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(102);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    const script = { title: "Test", language: "en", hook: "Hook", summary: "Summary", cta: "CTA", scenes: [{ id: "scene_001", duration: 5, voiceover: "Voice", visualPrompt: "Visual", broll: "B-roll", onscreenText: "", transition: "cut", music: "ambient", soundEffect: "none" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(script) } }] }), { status: 200 })));
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([textProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 56 }] }), update: () => ({ set: () => ({ where: async () => [] }) }) } as any);
    const result = await appRouter.createCaller(ctx).production.script.generate({ projectId: 9, topic: "A sufficiently detailed topic", audience: "Creators", language: "en", tone: "Clear", durationMinutes: 1, keywords: [] });
    expect(result).toMatchObject({ jobId: 102, content: script });
    expect(fetch).toHaveBeenCalledWith("https://local.test/text", expect.objectContaining({ method: "POST" }));
  });

  it("keeps the public Hugging Face router credential server-side during script generation", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(122);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    const script = { title: "Public", language: "en", hook: "Hook", summary: "Summary", cta: "CTA", scenes: [{ id: "scene_001", duration: 5, voiceover: "Voice", visualPrompt: "Visual", broll: "B-roll", onscreenText: "", transition: "cut", music: "ambient", soundEffect: "none" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(script) } }] }), { status: 200 })));
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([publicTextProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 66 }] }), update: () => ({ set: () => ({ where: async () => [] }) }) } as any);
    await expect(appRouter.createCaller(ctx).production.script.generate({ projectId: 9, topic: "A sufficiently detailed public provider topic", audience: "Creators", language: "en", tone: "Clear", durationMinutes: 1, keywords: [] })).resolves.toMatchObject({ jobId: 122, content: script });
    expect(fetch).toHaveBeenCalledWith("https://router.huggingface.co/v1/chat/completions", expect.objectContaining({ headers: expect.objectContaining({ authorization: `Bearer ${process.env.HF_TOKEN}` }) }));
  });

  it("executes transcription through the preferred free ASR provider", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(103);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "Hello", language: "en", segments: [{ start: 0, end: 1, text: "Hello" }] }), { status: 200 })));
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([asrProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 57 }] }) } as any);
    const result = await appRouter.createCaller(ctx).production.voice.transcribe({ projectId: 9, audioUrl: "https://local.test/audio.wav", title: "Transcript" });
    expect(result).toMatchObject({ jobId: 103, transcriptId: 57, transcript: "Hello", srt: expect.stringContaining("Hello") });
    expect(fetch).toHaveBeenCalledWith("https://local.test/asr", expect.objectContaining({ method: "POST" }));
  });

  it("rejects paid-only text, image, and ASR registry configurations before execution", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    const caller = appRouter.createCaller(ctx);
    for (const [configuredProvider, execute] of [
      [paidOnly(textProvider), () => caller.production.script.generate({ projectId: 9, topic: "A sufficiently detailed topic", audience: "Creators", language: "en", tone: "Clear", durationMinutes: 1, keywords: [] })],
      [paidOnly(provider), () => caller.production.assets.createImage({ projectId: 9, prompt: "A cinematic studio workspace with soft light", title: "Studio visual", usage: "scene_visual" })],
      [paidOnly(asrProvider), () => caller.production.voice.transcribe({ projectId: 9, audioUrl: "https://local.test/audio.wav", title: "Transcript" })],
    ] as const) {
      vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([configuredProvider]) }) }) } as any);
      await expect(execute()).rejects.toThrow(/free or self-hosted/i);
    }
  });

  it("submits render jobs to the preferred free registry worker", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(105);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ storageKey: "exports/free.mp4", mimeType: "video/mp4" }), { status: 200 })));
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([videoProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 59 }] }) } as any);
    const result = await appRouter.createCaller(ctx).production.render.request({ projectId: 9, versionId: 12, preset: "youtube_1080p" });
    expect(result).toMatchObject({ jobId: 105, status: "completed", assetId: 59 });
    expect(fetch).toHaveBeenCalledWith("https://local.test/render", expect.objectContaining({ method: "POST" }));
  });

  it("rejects a paid-only render provider before submission", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    const paidVideoProvider = { ...videoProvider, costTier: "paid" as const, selfHosted: "no" as const };
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([paidVideoProvider]) }) }) } as any);
    await expect(appRouter.createCaller(ctx).production.render.request({ projectId: 9, versionId: 12, preset: "youtube_1080p" })).rejects.toThrow(/free or self-hosted/i);
  });

  it("executes TTS through the explicitly selected approved free provider", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(104);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    vi.mocked(storagePut).mockResolvedValue({ key: "tts/voice.wav", url: "https://local.test/voice.wav" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ audioBase64: Buffer.from("audio").toString("base64"), mimeType: "audio/wav" }), { status: 200 })));
    const approvedVoice = { id: 12, workspaceId: 3, provider: ttsProvider.provider, providerVoiceId: "voice-1", commercialUse: "allowed" as const };
    const verifiedConsent = { voiceId: 12, workspaceId: 3, status: "verified" as const, approvedUseScope: "commercial_tts" as const, evidenceReference: "consent/voice-1.pdf", verifiedByUserId: 7, verifiedAt: new Date() };
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: (table: unknown) => ({ where: () => queryRows(table === voices ? [approvedVoice] : table === voiceConsents ? [verifiedConsent] : [ttsProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 58 }] }) } as any);
    const result = await appRouter.createCaller(ctx).production.voice.synthesize({ projectId: 9, providerId: 5, voiceId: "voice-1", text: "Hello", language: "en" });
    expect(result).toMatchObject({ jobId: 104, assetId: 58, url: "https://local.test/voice.wav" });
    expect(fetch).toHaveBeenCalledWith("https://local.test/tts", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string)).toMatchObject({ input: "Hello", response_format: "wav" });
  });

  it("synthesizes approved public Hugging Face TTS audio through the server-side client and stores the result", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(154);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    vi.mocked(storagePut).mockResolvedValue({ key: "tts/public-voice.mp3", url: "https://local.test/public-voice.mp3" });
    hfMocks.textToSpeech.mockResolvedValue(new Blob(["public-audio"], { type: "audio/mpeg" }));
    const approvedVoice = { id: 13, workspaceId: 3, provider: "huggingface", providerVoiceId: "hf-default", commercialUse: "allowed" as const };
    const verifiedConsent = { voiceId: 13, workspaceId: 3, status: "verified" as const, approvedUseScope: "commercial_tts" as const, evidenceReference: "consent/hf-default.pdf", verifiedByUserId: 7, verifiedAt: new Date() };
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: (table: unknown) => ({ where: () => queryRows(table === voices ? [approvedVoice] : table === voiceConsents ? [verifiedConsent] : [publicTtsProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 68 }] }) } as any);

    await expect(appRouter.createCaller(ctx).production.voice.synthesize({ projectId: 9, providerId: 55, voiceId: "hf-default", text: "A public-provider voice test.", language: "en" })).resolves.toMatchObject({ jobId: 154, assetId: 68, url: "https://local.test/public-voice.mp3" });
    expect(hfMocks.textToSpeech).toHaveBeenCalledWith({ model: "hexgrad/Kokoro-82M", inputs: "A public-provider voice test." });
    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining("workspaces/3/tts/"), Buffer.from("public-audio"), "audio/mpeg");
    expect(updateJob).toHaveBeenLastCalledWith(154, expect.objectContaining({ status: "completed" }), expect.objectContaining({ message: "Public-provider TTS audio ready" }));
  });

  it("persists administrator-verified commercial consent before a voice can be used by the private worker", async () => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ workspace: { id: 3 } } as any);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    const voice = { id: 12, workspaceId: 3, provider: "kokoro", providerVoiceId: "af_heart", commercialUse: "allowed" as const };
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 91 }]);
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: (table: unknown) => ({ where: () => table === voiceConsents ? ({ orderBy: () => queryRows([]) }) : queryRows([voice]) }) }), insert: () => ({ values: insertValues }) } as any);
    const result = await appRouter.createCaller(ctx).production.voice.recordConsent({ workspaceId: 3, voiceId: 12, status: "verified", approvedUseScope: "commercial_tts", evidenceReference: "consent/af-heart.pdf" });
    expect(result).toMatchObject({ voiceId: 12, status: "verified", approvedUseScope: "commercial_tts", verifiedByUserId: 7 });
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ voiceId: 12, workspaceId: 3, evidenceReference: "consent/af-heart.pdf" }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "voice.consent_recorded" }));
  });

  it("blocks synthesis before consent and permits it after the supported consent-recording flow", async () => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ workspace: { id: 3 } } as any);
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(104);
    vi.mocked(updateJob).mockResolvedValue(undefined as any);
    vi.mocked(storagePut).mockResolvedValue({ key: "tts/voice.wav", url: "https://local.test/voice.wav" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ audioBase64: Buffer.from("audio").toString("base64"), mimeType: "audio/wav" }), { status: 200 })));
    const voice = { id: 12, workspaceId: 3, provider: ttsProvider.provider, providerVoiceId: "voice-1", commercialUse: "allowed" as const };
    const verifiedConsent = { voiceId: 12, workspaceId: 3, status: "verified" as const, approvedUseScope: "commercial_tts" as const, evidenceReference: "consent/voice-1.pdf", verifiedByUserId: 7, verifiedAt: new Date() };
    let consentRecorded = false;
    const insertValues = vi.fn().mockImplementation(async (value: Record<string, unknown>) => { if (value.voiceId === 12) consentRecorded = true; return [{ insertId: 58 }]; });
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: (table: unknown) => ({ where: () => table === voices ? queryRows([voice]) : table === voiceConsents ? Object.assign(queryRows(consentRecorded ? [verifiedConsent] : []), { orderBy: () => queryRows(consentRecorded ? [verifiedConsent] : []) }) : queryRows([ttsProvider]) }) }), insert: () => ({ values: insertValues }) } as any);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.voice.synthesize({ projectId: 9, providerId: 5, voiceId: "voice-1", text: "Hello", language: "en" })).rejects.toThrow(/consent evidence/i);
    await caller.production.voice.recordConsent({ workspaceId: 3, voiceId: 12, status: "verified", approvedUseScope: "commercial_tts", evidenceReference: "consent/voice-1.pdf" });
    await expect(caller.production.voice.synthesize({ projectId: 9, providerId: 5, voiceId: "voice-1", text: "Hello", language: "en" })).resolves.toMatchObject({ assetId: 58 });
  });

  it("rejects an explicitly selected paid-only TTS provider before synthesis", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    const paidTtsProvider = paidOnly(ttsProvider);
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([paidTtsProvider]) }) }) } as any);
    await expect(appRouter.createCaller(ctx).production.voice.synthesize({ projectId: 9, providerId: 5, voiceId: "voice-1", text: "Hello", language: "en" })).rejects.toThrow(/free or self-hosted/i);
  });

  it("reports verified official social adapter readiness without returning credential values", async () => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ workspace: { id: 3 } } as any);
    const readiness = await appRouter.createCaller(ctx).production.social.connectionReadiness({ workspaceId: 3 });
    expect(readiness.map(item => item.platform)).toEqual(["youtube", "tiktok", "facebook", "instagram", "linkedin", "x"]);
    expect(readiness.find(item => item.platform === "linkedin")).toMatchObject({ webhookSupported: false, webhookMode: "manual_refresh", publicationSupported: true, oauthConnectionAvailable: false });
    expect(JSON.stringify(readiness)).not.toContain(process.env.HF_TOKEN ?? "a-not-configured-token");
  });

  it("does not create an official OAuth redirect before the server-side exchange adapter is active", async () => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ workspace: { id: 3 } } as any);
    await expect(appRouter.createCaller(ctx).production.social.beginOAuth({ workspaceId: 3, platform: "youtube", redirectUri: "https://app.example.com/api/social/oauth/callback" })).rejects.toThrow(/token-exchange and account-discovery adapter/i);
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("disconnects a workspace social account locally and invalidates linked dispatch plans", async () => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ workspace: { id: 3 } } as any);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    const account = { id: 82, workspaceId: 3, platform: "youtube" as const, connectionStatus: "connected" as const, encryptedTokenRef: "credential-ref" };
    const updateValues = vi.fn();
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: (table: unknown) => ({ where: () => queryRows(table === socialAccounts ? [account] : []) }) }),
      update: () => ({ set: (values: unknown) => ({ where: async () => { updateValues(values); return []; } }) }),
    } as any);

    await expect(appRouter.createCaller(ctx).production.social.disconnectAccount({ workspaceId: 3, accountId: account.id })).resolves.toEqual({ accountId: account.id, connectionStatus: "not_connected", linkedPlansInvalidated: true });
    expect(requireWorkspaceAccess).toHaveBeenCalledWith(user.id, 3, "admin");
    expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({ connectionStatus: "not_connected", encryptedTokenRef: null, tokenExpiresAt: null }));
    expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({ socialAccountId: null, status: "awaiting_approval", approvedAt: null, scheduleCronTaskUid: null }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "social.account_disconnected", entityType: "social_account", entityId: "82" }));
  });

  it("creates, reschedules, and cancels an approved Heartbeat dispatch without provider execution", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    const initialSchedule = new Date(Date.now() + 60 * 60 * 1000);
    const revisedSchedule = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const post = { id: 91, projectId: 9, workspaceId: 3, platform: "youtube" as const, socialAccountId: 18, deliveryAssetId: 40, status: "scheduled" as const, scheduledFor: initialSchedule, approvedAt: new Date(), createdByUserId: 7, scheduleCronTaskUid: null as string | null, lastDispatchAt: null };
    const account = { id: 18, workspaceId: 3, platform: "youtube" as const, connectionStatus: "connected" as const };
    const updateValues = vi.fn();
    const insertedAttemptValues = vi.fn().mockResolvedValue([{ insertId: 501 }]);
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: (table: unknown) => ({ where: () => queryRows(table === scheduledPosts ? [post] : table === socialAccounts ? [account] : []) }) }),
      insert: () => ({ values: insertedAttemptValues }),
      update: () => ({ set: (values: unknown) => ({ where: async () => { updateValues(values); return []; } }) }),
    } as any);
    heartbeatMocks.createHeartbeatJob.mockResolvedValue({ taskUid: "task-social-91", nextExecutionAt: "2026-08-16T09:00:00.000Z" });
    heartbeatMocks.updateHeartbeatJob.mockResolvedValue({ nextExecutionAt: "2026-08-16T10:00:00.000Z" });
    heartbeatMocks.deleteHeartbeatJob.mockResolvedValue(undefined);
    const originalClientId = process.env.YOUTUBE_CLIENT_ID;
    const originalClientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    process.env.YOUTUBE_CLIENT_ID = "test-client-id";
    process.env.YOUTUBE_CLIENT_SECRET = "test-client-secret";

    try {
      const caller = appRouter.createCaller(ctx);
      await expect(caller.production.social.queueDispatch({ postId: post.id })).resolves.toEqual({ attemptId: 501, status: "queued", reused: false });
      expect(insertedAttemptValues).toHaveBeenCalledWith(expect.objectContaining({ scheduledPostId: post.id, socialAccountId: account.id, status: "queued" }));

      await expect(caller.production.social.scheduleDispatch({ postId: post.id })).resolves.toMatchObject({ postId: post.id, taskUid: "task-social-91" });
      expect(heartbeatMocks.createHeartbeatJob).toHaveBeenCalledWith(expect.objectContaining({ name: "social-dispatch-91", cron: `0 ${initialSchedule.getUTCMinutes()} ${initialSchedule.getUTCHours()} ${initialSchedule.getUTCDate()} ${initialSchedule.getUTCMonth() + 1} *`, path: "/api/scheduled/social-dispatch", payload: { postId: post.id } }), "");

      post.scheduleCronTaskUid = "task-social-91";
      await expect(caller.production.social.rescheduleDispatch({ postId: post.id, scheduledFor: revisedSchedule })).resolves.toMatchObject({ postId: post.id, nextExecutionAt: "2026-08-16T10:00:00.000Z" });
      expect(heartbeatMocks.updateHeartbeatJob).toHaveBeenCalledWith("task-social-91", expect.objectContaining({ cron: `0 ${revisedSchedule.getUTCMinutes()} ${revisedSchedule.getUTCHours()} ${revisedSchedule.getUTCDate()} ${revisedSchedule.getUTCMonth() + 1} *`, payload: { postId: post.id } }), "");

      await expect(caller.production.social.cancelDispatch({ postId: post.id })).resolves.toEqual({ postId: post.id, cancelled: true });
      expect(heartbeatMocks.deleteHeartbeatJob).toHaveBeenCalledWith("task-social-91", "");
      expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled", scheduleCronTaskUid: null }));
    } finally {
      if (originalClientId === undefined) delete process.env.YOUTUBE_CLIENT_ID; else process.env.YOUTUBE_CLIENT_ID = originalClientId;
      if (originalClientSecret === undefined) delete process.env.YOUTUBE_CLIENT_SECRET; else process.env.YOUTUBE_CLIENT_SECRET = originalClientSecret;
    }
  });

  it("requeues an approved failed social dispatch with a unique retry key and audit record", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    const post = { id: 81, projectId: 9, workspaceId: 3, platform: "youtube" as const, socialAccountId: 18, deliveryAssetId: 40, status: "scheduled" as const, approvedAt: new Date(), scheduleCronTaskUid: "task-1" };
    const account = { id: 18, workspaceId: 3, platform: "youtube" as const, connectionStatus: "connected" as const };
    const failedAttempt = { id: 44, scheduledPostId: 81, socialAccountId: 18, idempotencyKey: "social-81-18-task-1", status: "failed" as const, createdAt: new Date() };
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 99 }]);
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: (table: unknown) => ({ where: () => table === scheduledPosts ? queryRows([post]) : table === socialAccounts ? queryRows([account]) : table === socialPublishAttempts ? Object.assign(queryRows([failedAttempt]), { orderBy: () => queryRows([failedAttempt]) }) : queryRows([]) }) }),
      insert: () => ({ values: insertValues }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
    } as any);

    const result = await appRouter.createCaller(ctx).production.social.retryDispatch({ postId: 81 });

    expect(result).toEqual({ attemptId: 99, status: "queued", reused: false, priorAttemptId: 44 });
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ scheduledPostId: 81, socialAccountId: 18, status: "queued", idempotencyKey: "social-81-18-task-1-retry-44" }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "social.dispatch_retried", metadata: expect.objectContaining({ priorAttemptId: 44 }) }));
  });
});
