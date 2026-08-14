// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  posts: { data: [] as any[], refetch: vi.fn() }, accounts: { data: [] }, create: { mutateAsync: vi.fn(), isPending: false },
}));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (projectId: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/trpc", () => ({ trpc: { production: { social: { listPosts: { useQuery: () => mocks.posts }, listAccounts: { useQuery: () => mocks.accounts }, createPost: { useMutation: () => mocks.create } } } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Publishing from "./Publishing";
import { toast } from "sonner";

describe("Publishing", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); root = undefined; container = undefined; vi.clearAllMocks(); mocks.create.isPending = false; mocks.posts.data = []; mocks.accounts.data = []; });

  it("creates an approval-required scheduled plan without a connected account", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.create.mutateAsync.mockImplementation(async () => { mocks.posts.data = [{ id: 1, title: "Launch plan", copy: "A reviewable caption", platform: "youtube", status: "awaiting_approval", scheduledFor: new Date("2026-08-15T13:30:00") }]; return { id: 1, status: "awaiting_approval" }; });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    expect(container.textContent).toContain("No official accounts are connected.");
    await act(async () => Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Select test project"))?.click());
    const inputs = container.querySelectorAll("input");
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { inputSetter.call(inputs[0], "Launch plan"); inputs[0]?.dispatchEvent(new Event("input", { bubbles: true })); inputSetter.call(inputs[1], "2026-08-15T13:30"); inputs[1]?.dispatchEvent(new Event("input", { bubbles: true })); });
    const textarea = container.querySelector("textarea")!;
    const textSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    await act(async () => { textSetter.call(textarea, "A reviewable caption"); textarea.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { container?.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(mocks.create.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9, platform: "youtube", title: "Launch plan", copy: "A reviewable caption", scheduledFor: expect.any(Date) }));
    expect(mocks.posts.refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Approval-required schedule plan created.");
    expect(container.textContent).toContain("awaiting approval");
  });
});
