// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  renderDraftVideo: vi.fn(),
  downloadRenderedDraft: vi.fn(),
}));

const scene = { id: "scene_001", duration: 2, voiceover: "A clear, approved narration.", visualPrompt: "Cinematic city sunrise", broll: "City aerial", onscreenText: "A better story", transition: "fade", music: "ambient", soundEffect: "soft rise" };

vi.mock("@/lib/trpc", () => ({
  trpc: {
    project: { get: { useQuery: () => ({ data: { project: { title: "Handed-off production" } } }) } },
    production: {
      script: { get: { useQuery: () => ({ data: [{ content: { scenes: [scene] } }] }) } },
      editor: {
        get: { useQuery: () => ({ data: { id: 31, projectDocument: { scenes: [], tracks: [] } } }) },
        save: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
      },
      render: { request: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } },
      exports: { list: { useQuery: () => ({ data: [], refetch: vi.fn() }) }, download: { useQuery: () => ({ data: null }) } },
    },
  },
}));

vi.mock("@/lib/draftVideoExport", () => ({
  draftQualityProfiles: {
    preview: { label: "Preview", description: "Lower resolution · fastest" },
    standard: { label: "Standard", description: "Balanced local draft" },
    high: { label: "High", description: "Full preset resolution" },
  },
  renderDraftVideo: mocks.renderDraftVideo,
  downloadRenderedDraft: mocks.downloadRenderedDraft,
}));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: () => <span>Project selected from handoff</span> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Scene Editor quick-draft integration", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    window.history.replaceState({}, "", "/editor?project=1");
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:handed-off-draft"), revokeObjectURL: vi.fn() });
    mocks.renderDraftVideo.mockReset();
    mocks.downloadRenderedDraft.mockReset();
    mocks.renderDraftVideo.mockResolvedValue({ blob: new Blob(["webm"], { type: "video/webm" }), filename: "handed-off-production-standard.webm", durationSeconds: 2, sceneCount: 1 });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const { default: TimelineEditor } = await import("./TimelineEditor");
    await act(async () => root.render(<TimelineEditor />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.history.replaceState({}, "", "/editor");
    vi.unstubAllGlobals();
  });

  it("creates a real quick-draft preview and hands the resulting asset to the download action", async () => {
    const previewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Preview quick draft"))!;
    await act(async () => { previewButton.click(); await Promise.resolve(); });

    expect(mocks.renderDraftVideo).toHaveBeenCalledWith(expect.objectContaining({ title: "Handed-off production", preset: "youtube_1080p", quality: "standard", scenes: [expect.objectContaining({ id: "scene_001", voiceover: scene.voiceover })] }));
    expect(container.querySelector("video")?.getAttribute("src")).toBe("blob:handed-off-draft");

    const downloadButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Download WebM"))!;
    await act(async () => downloadButton.click());
    expect(mocks.downloadRenderedDraft).toHaveBeenCalledWith(expect.objectContaining({ filename: "handed-off-production-standard.webm" }));
  });
});
