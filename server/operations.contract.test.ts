import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { requireWorkspaceAccess } from "./platform";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./platform", async importOriginal => {
  const actual = await importOriginal<typeof import("./platform")>();
  return { ...actual, requireWorkspaceAccess: vi.fn() };
});

const user = { id: 4, openId: "ops-user", email: "ops@example.com", name: "Ops User", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const admin = { ...user, id: 5, role: "admin" as const };
const ctx = (currentUser = user) => ({ user: currentUser, req: { protocol: "https", headers: {} } as any, res: {} as any });

describe("operations procedures", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(requireWorkspaceAccess).mockResolvedValue(undefined as any); });

  it("returns the free plan when an organization has no subscription row", async () => {
    let selectCount = 0;
    const db = { select: () => { selectCount += 1; return { from: () => ({ where: () => selectCount === 1 ? { limit: async () => [{ id: 8, organizationId: 22 }] } : { orderBy: () => ({ limit: async () => [] }) } }) }; } };
    vi.mocked(getDb).mockResolvedValue(db as any);
    const result = await appRouter.createCaller(ctx()).operations.plan({ workspaceId: 8 });
    expect(result).toMatchObject({ plan: "free", status: "active" });
  });

  it("marks only the current user's notification as read", async () => {
    const where = vi.fn().mockResolvedValue([]); const set = vi.fn(() => ({ where }));
    vi.mocked(getDb).mockResolvedValue({ update: () => ({ set }) } as any);
    const result = await appRouter.createCaller(ctx()).operations.notifications.markRead({ workspaceId: 8, notificationId: 91 });
    expect(result).toEqual({ markedRead: true });
    expect(requireWorkspaceAccess).toHaveBeenCalledWith(4, 8, "read");
    expect(where).toHaveBeenCalled();
  });

  it("blocks health access for non-admin users", async () => {
    await expect(appRouter.createCaller(ctx()).operations.health()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows administrator health access after database availability", async () => {
    let selectCount = 0;
    vi.mocked(getDb).mockResolvedValue({ select: () => { selectCount += 1; if (selectCount === 1) return { from: async () => [] }; return { from: () => ({ where: async () => [] }) }; } } as any);
    const result = await appRouter.createCaller(ctx(admin)).operations.health();
    expect(result.providers).toMatchObject({ total: 0, enabled: 0, unhealthy: 0 });
    expect(result.failedJobs).toBe(0);
  });
});
