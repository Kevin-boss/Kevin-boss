// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({
  execute: { isPending: false, mutateAsync: vi.fn() },
  list: { data: [], refetch: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({ trpc: { copilot: { list: { useQuery: () => mocks.list }, execute: { useMutation: () => mocks.execute } } } }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Copilot project action UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.execute.isPending = false;
    mocks.execute.mutateAsync.mockReset();
    mocks.list.refetch.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const { default: Copilot } = await import("./Copilot");
    await act(async () => root.render(<Copilot />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("queues an action after project selection and reports success", async () => {
    mocks.execute.mutateAsync.mockResolvedValue({ toolName: "create_translation_job" });
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
    const executeButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Execute as a tool action"))!;
    expect(executeButton.disabled).toBe(false);

    await act(async () => { executeButton.click(); await Promise.resolve(); });

    expect(mocks.execute.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(mocks.list.refetch).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Executable action queued: create translation job");
  });

  it("keeps the selected project context and reports a mutation error", async () => {
    mocks.execute.mutateAsync.mockRejectedValue(new Error("Provider unavailable"));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
    const executeButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Execute as a tool action"))!;

    await act(async () => { executeButton.click(); await Promise.resolve(); });

    expect(mocks.execute.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(toast.error).toHaveBeenCalledWith("Provider unavailable");
  });

  it("disables executable command submission while the action is pending", async () => {
    mocks.execute.isPending = true;
    await act(async () => root.unmount());
    const { default: Copilot } = await import("./Copilot");
    root = createRoot(container);
    await act(async () => root.render(<Copilot />));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
    const executeButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Execute as a tool action"))!;
    expect(executeButton.disabled).toBe(true);
  });
});
