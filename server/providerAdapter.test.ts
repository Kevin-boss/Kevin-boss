import { describe, expect, it, vi } from "vitest";
import { executeRegistryAsr, executeRegistryImage, executeRegistryText } from "./providerAdapter";

const provider = { id: 1, provider: "local", endpoint: "https://local.test/v1", modelId: "free-model", costTier: "free" as const, selfHosted: "yes" as const, commercialUse: "allowed" as const, enabled: "yes" as const, capabilities: ["text", "image", "asr"] };

describe("registry provider adapter", () => {
  it("normalizes OpenAI-compatible text responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "generated" } }] }), { status: 200 })));
    await expect(executeRegistryText(provider, { messages: [] })).resolves.toBe("generated");
  });

  it("normalizes image URLs and base64 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ url: "https://local.test/image.png" }] }), { status: 200 })));
    await expect(executeRegistryImage(provider, { prompt: "test" })).resolves.toBe("https://local.test/image.png");
  });

  it("normalizes ASR text, language, and segments", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "hello", language: "en", segments: [{ start: 0, end: 1, text: "hello" }] }), { status: 200 })));
    await expect(executeRegistryAsr(provider, { audioUrl: "https://local.test/audio.wav" })).resolves.toEqual({ text: "hello", language: "en", segments: [{ start: 0, end: 1, text: "hello" }] });
  });
});
