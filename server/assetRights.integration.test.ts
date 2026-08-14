import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { recordAudit, requireWorkspaceAccess } from "./platform";
import { storagePut } from "./storage";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./platform", async importOriginal => {
  const actual = await importOriginal<typeof import("./platform")>();
  return { ...actual, recordAudit: vi.fn(), requireWorkspaceAccess: vi.fn() };
});

const user = { id: 7, openId: "rights-user", email: "rights@example.com", name: "Rights User", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const ctx = { user, req: { protocol: "https", headers: {} } as any, res: {} as any };
const uploadInput = { workspaceId: 3, title: "Licensed b-roll", fileName: "broll.png", contentType: "image/png", dataBase64: Buffer.from("image bytes").toString("base64"), type: "image" as const };

describe("asset rights enforcement", () => {
  it("routes licensed uploads to manual rights review instead of marking them verified", async () => {
    const inserts: Record<string, unknown>[] = [];
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ membership: { role: "editor" } } as any);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    vi.mocked(storagePut).mockResolvedValue({ key: "uploads/broll.png", url: "https://storage.test/broll.png" });
    vi.mocked(getDb).mockResolvedValue({ insert: () => ({ values: async (values: Record<string, unknown>) => { inserts.push(values); return [{ insertId: 44 }]; } }) } as any);

    const result = await appRouter.createCaller(ctx).production.assets.upload({ ...uploadInput, license: "CC BY 4.0", author: "Original creator", attribution: "Credit Original creator" });

    expect(result).toMatchObject({ assetId: 44, key: "uploads/broll.png" });
    expect(inserts[0]).toMatchObject({ rightsStatus: "review_required", license: "CC BY 4.0", author: "Original creator", attribution: "Credit Original creator" });
    expect(inserts[0]?.rightsStatus).not.toBe("verified");
  });

  it("marks unlicensed uploads as unknown rather than silently granting usage rights", async () => {
    const inserts: Record<string, unknown>[] = [];
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ membership: { role: "editor" } } as any);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    vi.mocked(storagePut).mockResolvedValue({ key: "uploads/broll.png", url: "https://storage.test/broll.png" });
    vi.mocked(getDb).mockResolvedValue({ insert: () => ({ values: async (values: Record<string, unknown>) => { inserts.push(values); return [{ insertId: 45 }]; } }) } as any);

    await appRouter.createCaller(ctx).production.assets.upload(uploadInput);

    expect(inserts[0]).toMatchObject({ rightsStatus: "unknown", license: null, author: null, attribution: null });
  });
});
