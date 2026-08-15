// @vitest-environment jsdom
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mocks = vi.hoisted(() => ({ renderDraftVideo: vi.fn(), downloadRenderedDraft: vi.fn() }));

vi.mock("@/lib/draftVideoExport", () => ({
  draftQualityProfiles: {
    preview: { label: "Preview", description: "Lower resolution · fastest" },
    standard: { label: "Standard", description: "Balanced local draft" },
    high: { label: "High", description: "Full preset resolution" },
  },
  renderDraftVideo: mocks.renderDraftVideo,
  downloadRenderedDraft: mocks.downloadRenderedDraft,
}));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("GuestQuickDraft", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:guest-draft"), revokeObjectURL: vi.fn() });
    mocks.renderDraftVideo.mockReset();
    mocks.downloadRenderedDraft.mockReset();
    mocks.renderDraftVideo.mockResolvedValue({ blob: new Blob(["webm"], { type: "video/webm" }), filename: "guest-draft-standard.webm", durationSeconds: 6, sceneCount: 2 });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const { default: GuestQuickDraft } = await import("./GuestQuickDraft");
    await act(async () => root.render(<GuestQuickDraft />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("creates and downloads a browser-local WebM without project, account, or provider calls", async () => {
    expect(container.textContent).toContain("No account · no upload · no persistence");
    expect(container.textContent).toContain("intentionally silent");
    const previewButton = Array.from(container.querySelectorAll("button")).find(button => button.textContent?.includes("Preview quick draft"))!;
    await act(async () => { previewButton.click(); await Promise.resolve(); });
    expect(mocks.renderDraftVideo).toHaveBeenCalledWith(expect.objectContaining({ title: "My browser-local draft", preset: "vertical_1080x1920", scenes: expect.arrayContaining([expect.objectContaining({ id: "guest_scene_1" })]) }));
    expect(container.querySelector("video")?.getAttribute("src")).toBe("blob:guest-draft");
    const downloadButton = Array.from(container.querySelectorAll("button")).find(button => button.textContent?.includes("Download WebM"))!;
    await act(async () => downloadButton.click());
    expect(mocks.downloadRenderedDraft).toHaveBeenCalledWith(expect.objectContaining({ filename: "guest-draft-standard.webm" }));
  });
});
