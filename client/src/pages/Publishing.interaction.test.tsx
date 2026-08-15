// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  posts: { data: [] as any[], refetch: vi.fn() }, accounts: { data: [] as any[], refetch: vi.fn() }, create: { mutateAsync: vi.fn(), isPending: false }, adapt: { mutateAsync: vi.fn(), isPending: false }, disconnect: { mutateAsync: vi.fn(), isPending: false },
}));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (projectId: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/trpc", () => ({ trpc: { production: { script: { generatePlatformCopy: { useMutation: () => mocks.adapt } }, social: { listPosts: { useQuery: () => mocks.posts }, listAccounts: { useQuery: () => mocks.accounts }, createPost: { useMutation: () => mocks.create }, disconnectAccount: { useMutation: () => mocks.disconnect } } } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Publishing from "./Publishing";
import { toast } from "sonner";

describe("Publishing", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); root = undefined; container = undefined; vi.clearAllMocks(); mocks.create.isPending = false; mocks.adapt.isPending = false; mocks.disconnect.isPending = false; mocks.posts.data = []; mocks.accounts.data = []; });

  it("creates an approval-required scheduled plan without a connected account", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.create.mutateAsync.mockImplementation(async () => { mocks.posts.data = [{ id: 1, title: "Launch plan", copy: "A reviewable caption", platform: "youtube", status: "awaiting_approval", scheduledFor: new Date("2026-08-15T13:30:00") }]; return { id: 1, status: "awaiting_approval" }; });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    expect(container.textContent).toContain("No official accounts are connected.");
    expect(container.textContent).toContain("Credentials on activation.");
    expect(container.textContent).toContain("Credentials are requested only when you choose to activate publishing for selected platforms.");
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
    expect(toast.success).toHaveBeenCalledWith("Approval-required publishing plan created.");
    expect(container.textContent).toContain("awaiting approval");
  });

  it("generates a governed platform adaptation after a project is selected", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.adapt.mutateAsync.mockResolvedValue({ title: "A YouTube-ready title", caption: "A reviewed caption", hashtags: ["#content", "#review"] });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    await act(async () => Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Select test project"))?.click());
    await act(async () => Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Generate platform adaptation"))?.click());
    expect(mocks.adapt.mutateAsync).toHaveBeenCalledWith({ projectId: 9, platform: "youtube", language: "en" });
    expect((container.querySelectorAll("input")[0] as HTMLInputElement).value).toBe("A YouTube-ready title");
    expect(container.querySelector("textarea")?.value).toContain("#content");
    expect(toast.success).toHaveBeenCalledWith("YouTube adaptation generated for review.");
  });

  it("switches the schedule surface from the monthly calendar to a date-ordered agenda", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.posts.data = [{ id: 5, title: "Reviewed release", copy: "Ready for review", platform: "linkedin", status: "awaiting_approval", scheduledFor: new Date("2026-08-20T09:30:00") }];
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    await act(async () => Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Agenda"))?.click());
    expect(container.textContent).toContain("Reviewed release");
    expect(container.textContent).toContain("LinkedIn");
  });

  it("confirms a local account disconnect and refreshes readiness state", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.accounts.data = [{ id: 8, accountName: "Studio Channel", platform: "youtube", connectionStatus: "connected" }];
    mocks.disconnect.mutateAsync.mockResolvedValue({ accountId: 8, connectionStatus: "not_connected", linkedPlansInvalidated: true });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    await act(async () => Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Disconnect"))?.click());
    expect(document.body.textContent).toContain("Disconnect Studio Channel?");
    await act(async () => { Array.from(document.querySelectorAll("button")).find(button => button.textContent?.includes("Disconnect account"))?.click(); await Promise.resolve(); });
    expect(mocks.disconnect.mutateAsync).toHaveBeenCalledWith({ workspaceId: 3, accountId: 8 });
    expect(mocks.accounts.refetch).toHaveBeenCalled();
    expect(mocks.posts.refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Studio Channel disconnected. Linked plans now require reassignment and approval.");
  });
});
