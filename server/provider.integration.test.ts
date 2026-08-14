import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { createJob, requireProjectAccess, updateJob } from "./platform";
import { storagePut } from "./storage";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./platform", async importOriginal => {
  const actual = await importOriginal<typeof import("./platform")>();
  return { ...actual, createJob: vi.fn(), recordAudit: vi.fn(), requireProjectAccess: vi.fn(), updateJob: vi.fn() };
});
vi.mock("./storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));

const provider = { id: 2, name: "Local image", provider: "comfyui", endpoint: "https://local.test/image", modelId: "free-image", costTier: "free" as const, selfHosted: "yes" as const, commercialUse: "allowed" as const, enabled: "yes" as const, capabilities: ["image"] };
const textProvider = { ...provider, id: 3, endpoint: "https://local.test/text", modelId: "free-text", capabilities: ["text"] };
const asrProvider = { ...provider, id: 4, endpoint: "https://local.test/asr", modelId: "free-asr", capabilities: ["asr"] };
const ttsProvider = { ...provider, id: 5, endpoint: "https://local.test/tts", modelId: "free-tts", capabilities: ["tts"] };
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
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([ttsProvider]) }) }), insert: () => ({ values: async () => [{ insertId: 58 }] }) } as any);
    const result = await appRouter.createCaller(ctx).production.voice.synthesize({ projectId: 9, providerId: 5, voiceId: "voice-1", text: "Hello", language: "en" });
    expect(result).toMatchObject({ jobId: 104, assetId: 58, url: "https://local.test/voice.wav" });
    expect(fetch).toHaveBeenCalledWith("https://local.test/tts", expect.objectContaining({ method: "POST" }));
  });

  it("rejects an explicitly selected paid-only TTS provider before synthesis", async () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    const paidTtsProvider = paidOnly(ttsProvider);
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => queryRows([paidTtsProvider]) }) }) } as any);
    await expect(appRouter.createCaller(ctx).production.voice.synthesize({ projectId: 9, providerId: 5, voiceId: "voice-1", text: "Hello", language: "en" })).rejects.toThrow(/free or self-hosted/i);
  });
});
