// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickDraftExportButton } from "./QuickDraftExportButton";
import { downloadDraftVideo } from "@/lib/draftVideoExport";
import { toast } from "sonner";

vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/lib/draftVideoExport", () => ({ downloadDraftVideo: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const scenes = [{ id: "scene_001", duration: 1, voiceover: "Voice", visualPrompt: "Visual", onscreenText: "Title" }];

describe("QuickDraftExportButton", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    vi.clearAllMocks();
  });

  it("starts the no-configuration download on click and exposes loading then success states", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let resolveDownload: ((value: { filename: string; durationSeconds: number; sceneCount: number }) => void) | undefined;
    vi.mocked(downloadDraftVideo).mockReturnValue(new Promise((resolve) => { resolveDownload = resolve; }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(<QuickDraftExportButton title="No setup" scenes={scenes} preset="youtube_1080p" />));
    const button = container.querySelector("button")!;
    expect(button.textContent).toContain("Download quick draft");

    await act(async () => { button.click(); await Promise.resolve(); });
    expect(downloadDraftVideo).toHaveBeenCalledWith(expect.objectContaining({ title: "No setup", scenes, preset: "youtube_1080p" }));
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Creating 0%");

    await act(async () => { resolveDownload?.({ filename: "no-setup.webm", durationSeconds: 1, sceneCount: 1 }); await Promise.resolve(); });
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain("Download quick draft");
    expect(toast.success).toHaveBeenCalledWith("Downloaded no-setup.webm.");
  });
});
