// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickDraftExportButton } from "./QuickDraftExportButton";
import { downloadRenderedDraft, renderDraftVideo } from "@/lib/draftVideoExport";
import { toast } from "sonner";

vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/lib/draftVideoExport", () => ({
  renderDraftVideo: vi.fn(), downloadRenderedDraft: vi.fn(),
  draftQualityProfiles: {
    preview: { label: "Preview", description: "Lower resolution · fastest" },
    standard: { label: "Standard", description: "Balanced local draft" },
    high: { label: "High", description: "Full preset resolution" },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const scenes = [{ id: "scene_001", duration: 1, voiceover: "Voice", visualPrompt: "Visual", onscreenText: "Title" }];

describe("QuickDraftExportButton", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove(); root = undefined; container = undefined;
    vi.clearAllMocks(); vi.unstubAllGlobals();
  });

  it("creates a selected-quality preview with progress before explicitly downloading the WebM", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:quick-draft"), revokeObjectURL: vi.fn() });
    let resolveRender: ((value: { blob: Blob; filename: string; durationSeconds: number; sceneCount: number }) => void) | undefined;
    vi.mocked(renderDraftVideo).mockReturnValue(new Promise((resolve) => { resolveRender = resolve; }));
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);

    await act(async () => root?.render(<QuickDraftExportButton title="No setup" scenes={scenes} preset="youtube_1080p" />));
    const quality = container.querySelector("select")!;
    await act(async () => { quality.value = "high"; quality.dispatchEvent(new Event("change", { bubbles: true })); });
    const previewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Preview quick draft"))!;
    await act(async () => { previewButton.click(); await Promise.resolve(); });
    expect(renderDraftVideo).toHaveBeenCalledWith(expect.objectContaining({ title: "No setup", scenes, preset: "youtube_1080p", quality: "high" }));
    expect(previewButton.disabled).toBe(true);
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();

    await act(async () => { resolveRender?.({ blob: new Blob(["webm"], { type: "video/webm" }), filename: "no-setup-high.webm", durationSeconds: 1, sceneCount: 1 }); await Promise.resolve(); });
    expect(container.querySelector("video")?.getAttribute("src")).toBe("blob:quick-draft");
    expect(toast.success).toHaveBeenCalledWith("Quick draft preview is ready.");
    const downloadButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Download WebM"))!;
    await act(async () => downloadButton.click());
    expect(downloadRenderedDraft).toHaveBeenCalledWith(expect.objectContaining({ filename: "no-setup-high.webm" }));
    expect(toast.success).toHaveBeenCalledWith("Downloaded no-setup-high.webm.");
  });

  it("cancels an in-flight local preview safely", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(renderDraftVideo).mockImplementation(({ signal }) => new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(Object.assign(new Error("Quick draft rendering cancelled."), { name: "AbortError" })), { once: true });
    }));
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<QuickDraftExportButton title="No setup" scenes={scenes} preset="youtube_1080p" />));
    const previewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Preview quick draft"))!;
    await act(async () => { previewButton.click(); await Promise.resolve(); });
    const cancelButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Cancel"))!;
    await act(async () => { cancelButton.click(); await Promise.resolve(); });
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("aborts an active local preview safely when the control unmounts", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(renderDraftVideo).mockImplementation(({ signal }) => {
      capturedSignal = signal;
      return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(Object.assign(new Error("Quick draft rendering cancelled."), { name: "AbortError" })), { once: true }));
    });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<QuickDraftExportButton title="No setup" scenes={scenes} preset="youtube_1080p" />));
    const previewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Preview quick draft"))!;
    await act(async () => { previewButton.click(); await Promise.resolve(); });
    await act(async () => { root?.unmount(); await Promise.resolve(); });
    expect(capturedSignal?.aborted).toBe(true);
    expect(container.childElementCount).toBe(0);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
