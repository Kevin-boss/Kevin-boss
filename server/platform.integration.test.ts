import { describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { requireWorkspaceAccess, updateJob } from "./platform";

vi.mock("./db", () => ({ getDb: vi.fn() }));

function accessDb(rows: unknown[]) {
  const builder: any = { innerJoin: () => builder, where: () => builder, limit: async () => rows };
  return { select: () => ({ from: () => builder }) };
}

describe("platform authorization and job transitions", () => {
  it("enforces edit and review permissions using the persisted active membership role", async () => {
    vi.mocked(getDb).mockResolvedValue(accessDb([{ membership: { role: "editor" }, workspace: { id: 3 }, organization: { id: 1 } }]) as any);
    await expect(requireWorkspaceAccess(7, 3, "edit")).resolves.toMatchObject({ membership: { role: "editor" } });

    vi.mocked(getDb).mockResolvedValue(accessDb([{ membership: { role: "client" }, workspace: { id: 3 }, organization: { id: 1 } }]) as any);
    await expect(requireWorkspaceAccess(7, 3, "review")).resolves.toMatchObject({ membership: { role: "client" } });
    await expect(requireWorkspaceAccess(7, 3, "edit")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects missing active memberships rather than exposing workspace records", async () => {
    vi.mocked(getDb).mockResolvedValue(accessDb([]) as any);
    await expect(requireWorkspaceAccess(7, 3, "read")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("persists a job transition and records its matching status event", async () => {
    const updates: unknown[] = [];
    const events: unknown[] = [];
    vi.mocked(getDb).mockResolvedValue({
      update: () => ({ set: (values: unknown) => ({ where: async () => { updates.push(values); } }) }),
      insert: () => ({ values: async (values: unknown) => { events.push(values); return [{ insertId: 1 }]; } }),
    } as any);

    await updateJob(42, { status: "processing", progress: 55, startedAt: new Date("2026-08-14T08:00:00Z") }, { message: "Rendering scene assets", progress: 55 });

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ status: "processing", progress: 55 });
    expect(events).toEqual([{ jobId: 42, level: "info", message: "Rendering scene assets", progress: 55 }]);
  });
});
