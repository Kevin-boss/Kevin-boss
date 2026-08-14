// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({
  transcribe: { isPending: false, mutateAsync: vi.fn() },
  synthesize: { isPending: false, mutateAsync: vi.fn() },
  isVoiceLoading: false,
  voices: [] as Array<{ id: number; name: string; provider: string; providerVoiceId: string; language: string; gender: "male" | "female" | "neutral"; tone: string | null; accent: string | null; speed: string | null; emotion: string | null; commercialUse: "allowed" | "review" | "restricted"; providerId: number | null }>,
}));

vi.mock("@/lib/trpc", () => ({ trpc: { production: { voice: { list: { useQuery: () => ({ data: mocks.voices, isLoading: mocks.isVoiceLoading }) }, transcribe: { useMutation: () => mocks.transcribe }, synthesize: { useMutation: () => mocks.synthesize } } } } }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: ({ required: _required, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const approvedVoice = { id: 22, name: "Kokoro public default", provider: "huggingface", providerVoiceId: "hf-default", language: "en", gender: "neutral" as const, tone: "natural", accent: "US", speed: "standard", emotion: "calm", commercialUse: "allowed" as const, providerId: 55 };

describe("Voice and Captions creator interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderAndSelectProject = async () => {
    const { default: VoiceCaptions } = await import("./VoiceCaptions");
    await act(async () => root.render(<VoiceCaptions />));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
  };

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.transcribe.isPending = false;
    mocks.synthesize.isPending = false;
    mocks.isVoiceLoading = false;
    mocks.voices = [approvedVoice];
    mocks.transcribe.mutateAsync.mockReset();
    mocks.synthesize.mutateAsync.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await renderAndSelectProject();
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

  it("submits the selected approved voice to the matching ready provider and displays its audio result", async () => {
    mocks.synthesize.mutateAsync.mockResolvedValue({ assetId: 71, url: "https://media.test/approved-voice.mp3" });
    const chooseButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Choose voice"))!;
    await act(async () => chooseButton.click());
    const synthesizeButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Synthesize approved voice"))!;
    await act(async () => { synthesizeButton.click(); await Promise.resolve(); });
    expect(mocks.synthesize.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9, providerId: 55, voiceId: "hf-default", language: "en" }));
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("https://media.test/approved-voice.mp3");
    expect(toast.success).toHaveBeenCalledWith("Approved voice audio is ready for review.");
  });

  it("surfaces a synthesis failure without clearing the selected approved voice", async () => {
    mocks.synthesize.mutateAsync.mockRejectedValue(new Error("Provider rejected request"));
    const chooseButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Choose voice"))!;
    await act(async () => chooseButton.click());
    const synthesizeButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Synthesize approved voice"))!;
    await act(async () => { synthesizeButton.click(); await Promise.resolve(); });
    expect(toast.error).toHaveBeenCalledWith("Provider rejected request");
    expect(container.textContent).toContain("Kokoro public default");
  });

  it("disables transcription submission while ASR is pending", async () => {
    await act(async () => root.unmount());
    mocks.transcribe.isPending = true;
    root = createRoot(container);
    await renderAndSelectProject();
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Transcribe and generate subtitles"))!;
    expect(button.disabled).toBe(true);
  });

  it("disables voice synthesis while the TTS request is pending", async () => {
    await act(async () => root.unmount());
    mocks.synthesize.isPending = true;
    root = createRoot(container);
    await renderAndSelectProject();
    const chooseButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Choose voice"))!;
    await act(async () => chooseButton.click());
    const synthesizeButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Synthesize approved voice"))!;
    expect(synthesizeButton.disabled).toBe(true);
  });

  it("shows an accessible loading state while approved workspace voices are being queried", async () => {
    await act(async () => root.unmount());
    mocks.isVoiceLoading = true;
    root = createRoot(container);
    const { default: VoiceCaptions } = await import("./VoiceCaptions");
    await act(async () => root.render(<VoiceCaptions />));
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Loading approved workspace voices…");
  });
});
