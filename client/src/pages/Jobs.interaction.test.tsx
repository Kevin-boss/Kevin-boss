// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({ retry: { isPending: false, mutateAsync: vi.fn() }, invalidate: vi.fn() }));
const failedJob = { id: 42, type: "video_render", status: "failed", progress: 40, errorMessage: "Worker timeout", result: null };

vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ production: { jobs: { list: { invalidate: mocks.invalidate } } } }), production: { jobs: { list: { useQuery: () => ({ data: [failedJob], isFetching: false }) }, cancel: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) }, retry: { useMutation: () => mocks.retry } }, exports: { download: { useQuery: () => ({ data: null }) } } } } }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Jobs retry UI", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.retry.mutateAsync.mockReset(); mocks.invalidate.mockReset(); vi.mocked(toast.success).mockReset(); vi.mocked(toast.error).mockReset();
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    const { default: Jobs } = await import("./Jobs"); await act(async () => root.render(<Jobs />));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("requeues a failed job and invalidates its workspace history", async () => {
    mocks.retry.mutateAsync.mockResolvedValue({ updated: true });
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Retry"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.retry.mutateAsync).toHaveBeenCalledWith({ jobId: 42 });
    expect(mocks.invalidate).toHaveBeenCalledWith({ workspaceId: 3 });
    expect(toast.success).toHaveBeenCalledWith("Job requeued.");
  });

  it("reports a requeue failure while retaining the job action", async () => {
    mocks.retry.mutateAsync.mockRejectedValue(new Error("Retry limit reached"));
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Retry"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.retry.mutateAsync).toHaveBeenCalledWith({ jobId: 42 });
    expect(toast.error).toHaveBeenCalledWith("Retry limit reached");
  });
});
