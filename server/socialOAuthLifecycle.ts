import { and, eq, gt, isNull } from "drizzle-orm";
import { socialOAuthStates } from "../drizzle/schema";
import { getDb } from "./db";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export class SocialOAuthStateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialOAuthStateValidationError";
  }
}

export type ServerSocialOAuthCallbackState = {
  oauthStateId: number;
  workspaceId: number;
  platform: typeof socialOAuthStates.$inferSelect.platform;
  redirectUri: string;
  codeVerifier: string | null;
};

/**
 * Consumes a provider callback state inside a server-side exchange adapter.
 * This function must never be called by a browser-facing tRPC procedure: its
 * return value includes the PKCE verifier needed only for the server-to-server
 * token exchange. It intentionally performs no token exchange itself.
 */
export async function consumeSocialOAuthCallbackState(input: {
  db: Database;
  state: string;
  workspaceId: number;
  now?: Date;
}): Promise<ServerSocialOAuthCallbackState> {
  const now = input.now ?? new Date();
  const record = (await input.db.select().from(socialOAuthStates).where(and(
    eq(socialOAuthStates.state, input.state),
    eq(socialOAuthStates.workspaceId, input.workspaceId),
    gt(socialOAuthStates.expiresAt, now),
    isNull(socialOAuthStates.completedAt),
  )).limit(1))[0];

  if (!record) {
    throw new SocialOAuthStateValidationError("OAuth callback state is missing, expired, already consumed, or belongs to another workspace.");
  }

  const result = await input.db.update(socialOAuthStates).set({ completedAt: now }).where(and(
    eq(socialOAuthStates.id, record.id),
    isNull(socialOAuthStates.completedAt),
  ));
  const updateResult = Array.isArray(result) ? result[0] : result;
  const affectedRows = typeof updateResult === "object" && updateResult !== null
    ? Number((updateResult as { affectedRows?: number; rowsAffected?: number }).affectedRows ?? (updateResult as { rowsAffected?: number }).rowsAffected ?? 1)
    : 1;
  if (affectedRows === 0) {
    throw new SocialOAuthStateValidationError("OAuth callback state has already been consumed.");
  }

  return { oauthStateId: record.id, workspaceId: record.workspaceId, platform: record.platform, redirectUri: record.redirectUri, codeVerifier: record.codeVerifier ?? null };
}
