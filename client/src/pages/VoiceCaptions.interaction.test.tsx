// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({ transcribe: { isPending: false, mutateAsync: vi.fn() } }));

vi.mock("@/lib/trpc", () => ({ trpc: { production: { voice: { list: { useQuery: () => ({ data: [] }) }, transcribe: { useMutation: () => mocks.transcribe } } } } }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: ({ required: _required, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Voice and Captions transcription UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.transcribe.isPending = false;
    mocks.transcribe.mutateAsync.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const { default: VoiceCaptions } = await import("./VoiceCaptions");
    await act(async () => root.render(<VoiceCaptions />));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
  });

  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("creates caption review state and reports transcription success", async () => {
    mocks.transcribe.mutateAsync.mockResolvedValue({ transcript: "Hello world", segments: [{ start: 0, end: 1, text: "Hello world" }], srt: "1", vtt: "WEBVTT" });
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Transcribe and generate subtitles"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.transcribe.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9, captionStyle: "minimal" }));
    expect(container.textContent).toContain("Download reviewed SRT");
    expect(toast.success).toHaveBeenCalledWith("Transcript and subtitle files are ready for review.");
  });

  it("shows transcription errors while retaining the selected-project context", async () => {
    mocks.transcribe.mutateAsync.mockRejectedValue(new Error("ASR provider unavailable"));
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Transcribe and generate subtitles"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.transcribe.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(toast.error).toHaveBeenCalledWith("ASR provider unavailable");
  });
});
