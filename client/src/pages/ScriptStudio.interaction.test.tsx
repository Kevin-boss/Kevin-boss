// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({
  generate: { isPending: false, mutateAsync: vi.fn() },
  refetch: vi.fn(),
}));

vi.mock("@/lib/trpc", () => {
  const mutation = (value = { isPending: false, mutateAsync: vi.fn() }) => ({ useMutation: () => value });
  return { trpc: { production: { script: { get: { useQuery: () => ({ data: [], refetch: mocks.refetch }) }, generate: mutation(mocks.generate), updateScene: mutation(), attachSceneCitations: mutation(), regenerateScene: mutation(), reviewSceneVariant: mutation(), generatePlatformCopy: mutation() }, research: { list: { useQuery: () => ({ data: { citations: [] } }) } } } } };
});
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: ({ required: _required, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Script Studio generation UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.generate.isPending = false;
    mocks.generate.mutateAsync.mockReset();
    mocks.refetch.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const { default: ScriptStudio } = await import("./ScriptStudio");
    await act(async () => root.render(<ScriptStudio />));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
  });

  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("submits a structured script brief and reports success", async () => {
    mocks.generate.mutateAsync.mockResolvedValue({ jobId: 10 });
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Generate structured script"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.generate.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Structured script is ready for review.");
  });

  it("shows a generation error without clearing the selected project state", async () => {
    mocks.generate.mutateAsync.mockRejectedValue(new Error("Text provider unavailable"));
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Generate structured script"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.generate.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(toast.error).toHaveBeenCalledWith("Text provider unavailable");
  });
});
