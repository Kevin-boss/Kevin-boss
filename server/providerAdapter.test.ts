import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ textToSpeech: vi.fn() }));
vi.mock("@huggingface/inference", () => ({ InferenceClient: class { textToSpeech = mocks.textToSpeech; } }));

import { callRegistryProvider, createProviderExecutor, executeRegistryAsr, executeRegistryImage, executeRegistryText, executeRegistryTts, getProviderAdapter, registerProviderAdapter } from "./providerAdapter";

const provider = { id: 1, provider: "local", endpoint: "https://local.test/v1", modelId: "free-model", costTier: "free" as const, selfHosted: "yes" as const, commercialUse: "allowed" as const, enabled: "yes" as const, capabilities: ["text", "image", "asr", "future"] };

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

  it("adds server-side authorization only for the official Hugging Face public router", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await callRegistryProvider({ ...provider, endpoint: "https://router.huggingface.co/v1/chat/completions" }, { messages: [] });
    expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({ headers: expect.objectContaining({ authorization: `Bearer ${process.env.HF_TOKEN}` }) });
  });

  it("normalizes public Hugging Face text-to-speech audio without exposing its token to callers", async () => {
    mocks.textToSpeech.mockResolvedValue(new Blob(["audio"], { type: "audio/mpeg" }));
    await expect(executeRegistryTts({ ...provider, provider: "huggingface", endpoint: "https://router.huggingface.co/hf-inference/models/hexgrad/Kokoro-82M", modelId: "hexgrad/Kokoro-82M", capabilities: ["tts"] }, "Hello world")).resolves.toEqual({ audioBase64: Buffer.from("audio").toString("base64"), mimeType: "audio/mpeg" });
    expect(mocks.textToSpeech).toHaveBeenCalledWith({ model: "hexgrad/Kokoro-82M", inputs: "Hello world" });
  });

  it("forces future adapters through free-first selection before execution", async () => {
    const executeRegistry = vi.fn().mockResolvedValue("registry");
    const executeBuiltIn = vi.fn().mockResolvedValue("built-in");
    const execute = createProviderExecutor({ capability: "future", executeRegistry, executeBuiltIn });
    await expect(execute([provider], { value: 1 })).resolves.toBe("registry");
    await expect(execute([], { value: 2 })).resolves.toBe("built-in");
    expect(executeRegistry).toHaveBeenCalledOnce();
    expect(executeBuiltIn).toHaveBeenCalledOnce();
  });

  it("only registers branded factory executors and rejects duplicate adapter names", () => {
    const executor = createProviderExecutor({ capability: "registered_future", executeRegistry: async () => "registry", executeBuiltIn: async () => "built-in" });
    registerProviderAdapter("registered_future", executor);
    expect(getProviderAdapter("registered_future")).toBe(executor);
    expect(() => registerProviderAdapter("registered_future", executor)).toThrow(/already registered/i);
  });
});
