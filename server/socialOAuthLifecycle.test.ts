import { describe, expect, it, vi } from "vitest";
import { consumeSocialOAuthCallbackState, SocialOAuthStateValidationError } from "./socialOAuthLifecycle";

const now = new Date("2026-08-15T12:00:00.000Z");
const callbackState = {
  id: 24,
  workspaceId: 3,
  platform: "youtube" as const,
  state: "state-value",
  redirectUri: "https://app.example.com/api/social/oauth/callback",
  codeVerifier: "server-only-pkce-verifier",
  expiresAt: new Date("2026-08-15T12:10:00.000Z"),
  completedAt: null,
};

function createDb(rows: unknown[], updateResult: unknown = [{ affectedRows: 1 }]) {
  const completedAt = vi.fn();
  const updateWhere = vi.fn().mockResolvedValue(updateResult);
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }),
    update: () => ({ set: (value: unknown) => { completedAt(value); return { where: updateWhere }; } }),
  };
  return { db, completedAt, updateWhere };
}

describe("consumeSocialOAuthCallbackState", () => {
  it("atomically consumes a valid current callback state for a server-side exchange adapter", async () => {
    const { db, completedAt, updateWhere } = createDb([callbackState]);

    await expect(consumeSocialOAuthCallbackState({ db: db as any, state: callbackState.state, workspaceId: 3, now })).resolves.toEqual({
      oauthStateId: 24,
      workspaceId: 3,
      platform: "youtube",
      redirectUri: callbackState.redirectUri,
      codeVerifier: "server-only-pkce-verifier",
    });
    expect(completedAt).toHaveBeenCalledWith({ completedAt: now });
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it("rejects missing, expired, completed, or cross-workspace states before any update", async () => {
    const { db, updateWhere } = createDb([]);

    await expect(consumeSocialOAuthCallbackState({ db: db as any, state: "unknown", workspaceId: 3, now })).rejects.toBeInstanceOf(SocialOAuthStateValidationError);
    expect(updateWhere).not.toHaveBeenCalled();
  });

  it("rejects a concurrent re-use when the guarded completion update affects no row", async () => {
    const { db } = createDb([callbackState], [{ affectedRows: 0 }]);

    await expect(consumeSocialOAuthCallbackState({ db: db as any, state: callbackState.state, workspaceId: 3, now })).rejects.toThrow(/already been consumed/i);
  });
});
