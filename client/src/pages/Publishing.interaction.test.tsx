// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  posts: { data: [] as any[], refetch: vi.fn() }, accounts: { data: [] as any[], refetch: vi.fn() }, create: { mutateAsync: vi.fn(), isPending: false }, adapt: { mutateAsync: vi.fn(), isPending: false }, disconnect: { mutateAsync: vi.fn(), isPending: false }, assign: { mutateAsync: vi.fn(), isPending: false }, cancel: { mutateAsync: vi.fn(), isPending: false }, reschedule: { mutateAsync: vi.fn(), isPending: false },
}));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (projectId: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/trpc", () => ({ trpc: { production: { script: { generatePlatformCopy: { useMutation: () => mocks.adapt } }, social: { listPosts: { useQuery: () => mocks.posts }, listAccounts: { useQuery: () => mocks.accounts }, createPost: { useMutation: () => mocks.create }, disconnectAccount: { useMutation: () => mocks.disconnect }, assignAccount: { useMutation: () => mocks.assign }, cancelDispatch: { useMutation: () => mocks.cancel }, rescheduleDispatch: { useMutation: () => mocks.reschedule } } } } }));
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

  it("assigns only a matching connected official account from the review queue", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.posts.data = [{ id: 12, title: "YouTube release", copy: "Ready for approval", platform: "youtube", status: "awaiting_approval", scheduledFor: new Date("2026-08-20T09:30:00"), socialAccountId: null }];
    mocks.accounts.data = [{ id: 8, accountName: "Studio Channel", platform: "youtube", connectionStatus: "connected" }, { id: 9, accountName: "Shorts Profile", platform: "tiktok", connectionStatus: "connected" }];
    mocks.assign.mutateAsync.mockResolvedValue({ postId: 12, socialAccountId: 8 });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    const accountSelect = container.querySelector('select[aria-label*="Connected YouTube account"]') as HTMLSelectElement;
    expect(accountSelect.textContent).toContain("Studio Channel");
    expect(accountSelect.textContent).not.toContain("Shorts Profile");
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
    await act(async () => { selectSetter.call(accountSelect, "8"); accountSelect.dispatchEvent(new Event("change", { bubbles: true })); await Promise.resolve(); });
    expect(mocks.assign.mutateAsync).toHaveBeenCalledWith({ postId: 12, socialAccountId: 8 });
    expect(mocks.posts.refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Connected account assigned. Approval is still required before dispatch.");
  });

  it("confirms cancellation of an eligible local plan and refreshes its review state", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.posts.data = [{ id: 15, title: "Withdraw release", copy: "No longer needed", platform: "youtube", status: "awaiting_approval", scheduledFor: new Date("2026-08-20T09:30:00"), socialAccountId: null }];
    mocks.cancel.mutateAsync.mockResolvedValue({ postId: 15, cancelled: true, queuedAttemptsCancelled: true });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    await act(async () => Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Cancel plan"))?.click());
    expect(document.body.textContent).toContain("Cancel Withdraw release?");
    await act(async () => { Array.from(document.querySelectorAll("button")).filter(button => button.textContent?.includes("Cancel plan")).at(-1)?.click(); await Promise.resolve(); });
    expect(mocks.cancel.mutateAsync).toHaveBeenCalledWith({ postId: 15 });
    expect(mocks.posts.refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Withdraw release cancelled. It will not be dispatched.");
  });

  it("reschedules an eligible plan locally while preserving its approval and readiness boundary", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.posts.data = [{ id: 16, title: "Move release", copy: "Reschedule for review", platform: "youtube", status: "awaiting_approval", scheduledFor: new Date("2026-08-20T09:30:00"), socialAccountId: null }];
    mocks.reschedule.mutateAsync.mockResolvedValue({ postId: 16, nextExecutionAt: null });
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<Publishing />));
    const scheduleInput = container.querySelector('input[aria-label*="Local schedule time for Move release"]') as HTMLInputElement;
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { inputSetter.call(scheduleInput, "2026-08-21T10:15"); scheduleInput.dispatchEvent(new Event("input", { bubbles: true })); scheduleInput.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => { Array.from(container!.querySelectorAll("button")).find(button => button.textContent?.includes("Save time"))?.click(); await Promise.resolve(); });
    expect(mocks.reschedule.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ postId: 16, scheduledFor: expect.any(Date) }));
    expect((mocks.reschedule.mutateAsync.mock.calls[0]![0]!.scheduledFor as Date).getTime()).toBe(new Date("2026-08-21T10:15").getTime());
    expect(mocks.posts.refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Schedule updated. Approval and provider readiness remain enforced.");
  });
});
