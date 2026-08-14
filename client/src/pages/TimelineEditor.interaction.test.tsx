// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({ save: { isPending: false, mutateAsync: vi.fn() }, render: { isPending: false, mutateAsync: vi.fn() }, refetchExports: vi.fn() }));
const scene = { id: "scene-1", duration: 4, voiceover: "Opening voiceover", visualPrompt: "Security operations center", broll: "Keyboard closeup", onscreenText: "Protect the perimeter", transition: "cut", music: "Ambient pulse", soundEffect: "soft hit" };

vi.mock("@/lib/trpc", () => ({
  trpc: {
    project: { get: { useQuery: () => ({ data: { project: { title: "Test production" } } }) } },
    production: {
      script: { get: { useQuery: () => ({ data: [{ content: { scenes: [scene] } }] }) } },
      editor: {
        get: { useQuery: () => ({ data: { id: 17, projectDocument: { scenes: [scene], tracks: [] } } }) },
        save: { useMutation: () => mocks.save },
      },
      render: { request: { useMutation: () => mocks.render } },
      exports: {
        list: { useQuery: () => ({ data: [], refetch: mocks.refetchExports }) },
        download: { useQuery: () => ({ data: null }) },
      },
    },
  },
}));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/QuickDraftExportButton", () => ({ QuickDraftExportButton: () => <button type="button">Download quick draft</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Timeline Editor interactions", () => {
  let container: HTMLDivElement;
  let root: Root;
  const selectProject = async () => {
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
  };
  const changeTransition = async (value: string) => {
    const transition = container.querySelectorAll("input")[1]!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { setter.call(transition, value); transition.dispatchEvent(new Event("input", { bubbles: true })); });
  };

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.save.isPending = false; mocks.render.isPending = false;
    mocks.save.mutateAsync.mockReset(); mocks.render.mutateAsync.mockReset(); mocks.refetchExports.mockReset();
    vi.mocked(toast.success).mockReset(); vi.mocked(toast.error).mockReset();
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    const { default: TimelineEditor } = await import("./TimelineEditor"); await act(async () => root.render(<TimelineEditor />));
    await selectProject();
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("persists a changed scene property and clears the dirty action state", async () => {
    mocks.save.mutateAsync.mockResolvedValue({ editorId: 17 });
    await changeTransition("dissolve");
    const saveButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Save timeline"))!;
    expect(saveButton.disabled).toBe(false);
    await act(async () => { saveButton.click(); await Promise.resolve(); });
    expect(mocks.save.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9, scenes: [expect.objectContaining({ transition: "dissolve" })] }));
    expect(toast.success).toHaveBeenCalledWith("Timeline changes saved to the current video version.");
  });

  it("reports a save failure while leaving the edited timeline available", async () => {
    mocks.save.mutateAsync.mockRejectedValue(new Error("Timeline persistence unavailable"));
    await changeTransition("dissolve");
    const saveButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Save timeline"))!;
    await act(async () => { saveButton.click(); await Promise.resolve(); });
    expect(mocks.save.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(toast.error).toHaveBeenCalledWith("Timeline persistence unavailable");
    expect(container.querySelectorAll("input")[1]!.value).toBe("dissolve");
  });

  it("distinguishes the local draft from the production-worker path and submits the final export request", async () => {
    mocks.render.mutateAsync.mockResolvedValue({ available: false, message: "No private render worker is configured." });
    expect(container.textContent).toContain("Browser-local quick draft");
    expect(container.textContent).toContain("Production worker MP4");
    expect(container.textContent).toContain("natural voice, realistic footage, and long-form jobs approaching one hour");
    const renderButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Queue production MP4"))!;
    await act(async () => { renderButton.click(); await Promise.resolve(); });
    expect(mocks.render.mutateAsync).toHaveBeenCalledWith({ projectId: 9, versionId: 17, preset: "youtube_1080p" });
    expect(mocks.refetchExports).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Render queued but no worker is configured yet.");
  });

  it("shows the pending final-render state and prevents duplicate submission", async () => {
    await act(async () => root.unmount());
    mocks.render.isPending = true;
    const { default: TimelineEditor } = await import("./TimelineEditor");
    root = createRoot(container);
    await act(async () => root.render(<TimelineEditor />));
    await selectProject();
    const renderButton = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Queue production MP4"))!;
    expect(renderButton.disabled).toBe(true);
  });
});
