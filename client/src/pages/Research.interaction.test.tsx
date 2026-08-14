// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({
  addSource: { isPending: false, mutateAsync: vi.fn() },
  refetch: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({ trpc: { production: { research: { list: { useQuery: () => ({ data: { sources: [], claims: [], citations: [] }, refetch: mocks.refetch }) }, addSource: { useMutation: () => mocks.addSource }, extractClaims: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } } } } }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: ({ required: _required, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: ({ required: _required, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Research source UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.addSource.isPending = false;
    mocks.addSource.mutateAsync.mockReset();
    mocks.refetch.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const { default: Research } = await import("./Research");
    await act(async () => root.render(<Research />));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
  });

  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("adds provenance-bearing source input and reports success", async () => {
    mocks.addSource.mutateAsync.mockResolvedValue({ sourceId: 16 });
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Add source"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.addSource.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9, sourceType: "user_provided" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Source added with provenance.");
  });

  it("reports a source mutation failure without losing selected-project context", async () => {
    mocks.addSource.mutateAsync.mockRejectedValue(new Error("Source storage unavailable"));
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Add source"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.addSource.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(toast.error).toHaveBeenCalledWith("Source storage unavailable");
  });
});
