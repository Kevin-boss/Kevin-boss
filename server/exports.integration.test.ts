import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { requireProjectAccess, requireWorkspaceAccess, createJob } from "./platform";
import { storageGetSignedUrl } from "./storage";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./platform", async importOriginal => {
  const actual = await importOriginal<typeof import("./platform")>();
  return {
    ...actual,
    createJob: vi.fn(),
    recordAudit: vi.fn(),
    requireProjectAccess: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    updateJob: vi.fn(),
  };
});
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));

const user = { id: 7, openId: "export-user", email: "export@example.com", name: "Export User", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const ctx = { user, req: { protocol: "https", headers: {} } as any, res: {} as any };

describe("downloadable export procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RENDER_WORKER_URL", "https://render.internal/export");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ storageKey: "exports/ready.mp4", mimeType: "video/mp4" }) }));
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 44, projectId: 9, workspaceId: 3, type: "video", title: "Export", storageKey: "exports/export.mp4" }] }) }) }), insert: () => ({ values: async () => [{ insertId: 55 }] }), update: () => ({ set: () => ({ where: async () => [] }) }) } as any);
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(requireWorkspaceAccess).mockResolvedValue(undefined as any);
    vi.mocked(createJob).mockResolvedValue(101);
    vi.mocked(storageGetSignedUrl).mockResolvedValue("https://signed.example/export.mp4");
  });

  it("returns a clear unavailable state when no render worker is configured", async () => {
    vi.stubEnv("RENDER_WORKER_URL", "");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.production.render.request({ projectId: 9, versionId: 12, preset: "youtube_1080p" });
    expect(result).toMatchObject({ jobId: 101, available: false, status: "failed" });
  });

  it("records a completed video asset when the worker returns a storage key", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.production.render.request({ projectId: 9, versionId: 12, preset: "vertical_1080x1920" });
    expect(result).toMatchObject({ jobId: 101, available: true, status: "completed", assetId: 55 });
  });

  it("returns a signed URL only after tenant access is checked", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.production.exports.download({ assetId: 44 });
    expect(result).toMatchObject({ assetId: 44, url: "https://signed.example/export.mp4" });
    expect(requireWorkspaceAccess).toHaveBeenCalledWith(7, 3, "read");
    expect(storageGetSignedUrl).toHaveBeenCalledWith("exports/export.mp4");
  });

  it("rejects a missing storage key and a denied workspace", async () => {
    vi.mocked(getDb).mockResolvedValueOnce({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 44, projectId: 9, workspaceId: 3, type: "video", title: "Export", storageKey: null }] }) }) }) } as any);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.exports.download({ assetId: 44 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.mocked(getDb).mockResolvedValueOnce({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 44, projectId: 9, workspaceId: 3, type: "video", title: "Export", storageKey: "exports/export.mp4" }] }) }) }) } as any);
    vi.mocked(requireWorkspaceAccess).mockRejectedValueOnce(new Error("forbidden"));
    await expect(caller.production.exports.download({ assetId: 44 })).rejects.toThrow("forbidden");
  });
});
