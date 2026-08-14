import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDraftExportPlan, downloadDraftVideo, draftPresetDimensions, getDraftDimensions, renderDraftVideo } from "./draftVideoExport";

const scene = (id: string, duration: number) => ({ id, duration, voiceover: "Voiceover", visualPrompt: "Visual", onscreenText: "Title" });

describe("browser draft-video export", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("provides correct canvas dimensions for each export preset", () => {
    expect(draftPresetDimensions.youtube_1080p).toEqual({ width: 1280, height: 720 });
    expect(draftPresetDimensions.vertical_1080x1920).toEqual({ width: 720, height: 1280 });
    expect(draftPresetDimensions.square_1080).toEqual({ width: 900, height: 900 });
  });

  it("scales draft dimensions for preview, standard, and high quality profiles", () => {
    expect(getDraftDimensions("youtube_1080p", "preview")).toEqual({ width: 640, height: 360 });
    expect(getDraftDimensions("youtube_1080p", "standard")).toEqual({ width: 960, height: 540 });
    expect(getDraftDimensions("youtube_1080p", "high")).toEqual({ width: 1280, height: 720 });
  });

  it("caps browser draft exports to short scene clips and a bounded total duration", () => {
    const plan = buildDraftExportPlan(Array.from({ length: 20 }, (_, index) => scene(`scene_${index}`, 99)));
    expect(plan).toHaveLength(8);
    expect(plan.every((item) => item.duration === 3)).toBe(true);
    expect(plan.reduce((total, item) => total + item.duration, 0)).toBe(24);
  });

  it("records a browser draft and triggers a WebM anchor download without any provider configuration", async () => {
    let clock = 0;
    const click = vi.fn();
    const anchor = { href: "", download: "", click, remove: vi.fn() };
    const context = {
      createLinearGradient: () => ({ addColorStop: vi.fn() }), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(), measureText: () => ({ width: 24 }),
    };
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const canvas = { width: 0, height: 0, getContext: () => context, captureStream: () => stream };
    class FakeRecorder {
      static isTypeSupported = () => true;
      mimeType = "video/webm";
      private listeners: Record<string, Array<(event?: any) => void>> = {};
      constructor(_stream: unknown, options: { mimeType: string }) { this.mimeType = options.mimeType; }
      addEventListener(type: string, listener: (event?: any) => void) { (this.listeners[type] ??= []).push(listener); }
      start() { return undefined; }
      stop() { this.listeners.dataavailable?.forEach((listener) => listener({ data: new Blob(["draft"], { type: this.mimeType }) })); this.listeners.stop?.forEach((listener) => listener()); }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("performance", { now: () => clock });
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => { queueMicrotask(() => { clock += 1000; callback(clock); }); return 1; });
    vi.stubGlobal("document", { createElement: vi.fn((tag: string) => tag === "canvas" ? canvas : anchor), body: { appendChild: vi.fn() } });
    vi.stubGlobal("window", { setTimeout: (callback: () => void) => { callback(); return 0; } });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:draft"), revokeObjectURL: vi.fn() });

    const result = await downloadDraftVideo({ title: "No setup needed", scenes: [scene("scene_001", 1)], preset: "youtube_1080p" });

    expect(result).toMatchObject({ filename: "No-setup-needed-standard.webm", durationSeconds: 1, sceneCount: 1 });
    expect(anchor.href).toBe("blob:draft");
    expect(anchor.download).toBe("No-setup-needed-standard.webm");
    expect(click).toHaveBeenCalledOnce();
  });

  it("stops active browser streams and rejects cleanly when a preview render is aborted", async () => {
    let frame: ((time: number) => void) | undefined;
    const stopTrack = vi.fn();
    const context = { createLinearGradient: () => ({ addColorStop: vi.fn() }), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(), measureText: () => ({ width: 24 }) };
    const stream = { getTracks: () => [{ stop: stopTrack }] };
    const canvas = { width: 0, height: 0, getContext: () => context, captureStream: () => stream };
    class FakeRecorder {
      static isTypeSupported = () => true;
      mimeType = "video/webm";
      private listeners: Record<string, Array<(event?: any) => void>> = {};
      constructor(_stream: unknown, options: { mimeType: string }) { this.mimeType = options.mimeType; }
      addEventListener(type: string, listener: (event?: any) => void) { (this.listeners[type] ??= []).push(listener); }
      start() { return undefined; }
      stop() { this.listeners.stop?.forEach((listener) => listener()); }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => { frame = callback; return 1; });
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    vi.stubGlobal("window", {});
    const controller = new AbortController();
    const pending = renderDraftVideo({ title: "Abort", scenes: [scene("scene_001", 3)], preset: "youtube_1080p", signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    frame?.(1);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(stopTrack).toHaveBeenCalled();
  });
});
