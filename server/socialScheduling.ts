import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { scheduledPosts, socialAccounts, socialPublishAttempts } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { assessSocialDispatchReadiness, buildSocialDispatchIdempotencyKey, sanitizeSocialProviderError } from "./socialPublishPolicy";

export function toUtcHeartbeatCron(value: Date) {
  return `0 ${value.getUTCMinutes()} ${value.getUTCHours()} ${value.getUTCDate()} ${value.getUTCMonth() + 1} *`;
}

export async function handleScheduledSocialDispatch(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database-unavailable", taskUid });
    const post = (await db.select().from(scheduledPosts).where(eq(scheduledPosts.scheduleCronTaskUid, taskUid)).limit(1))[0];
    if (!post) return res.json({ ok: true, skipped: "orphan", taskUid });
    if (post.lastDispatchAt) return res.json({ ok: true, skipped: "already-queued", taskUid, postId: post.id });
    if (!post.scheduledFor || post.scheduledFor.getTime() > Date.now()) return res.json({ ok: true, skipped: "not-due", taskUid, postId: post.id });
    const account = post.socialAccountId ? (await db.select().from(socialAccounts).where(eq(socialAccounts.id, post.socialAccountId)).limit(1))[0] : undefined;
    const readiness = assessSocialDispatchReadiness({ status: post.status, platform: post.platform, accountStatus: account?.connectionStatus, accountPlatform: account?.platform, deliveryAssetId: post.deliveryAssetId, approvedAt: post.approvedAt });
    if (!readiness.ready) return res.json({ ok: true, skipped: "not-ready", reason: readiness.reason, taskUid, postId: post.id });
    const idempotencyKey = buildSocialDispatchIdempotencyKey(post.id, account!.id, taskUid);
    const existing = (await db.select().from(socialPublishAttempts).where(and(eq(socialPublishAttempts.scheduledPostId, post.id), eq(socialPublishAttempts.idempotencyKey, idempotencyKey))).limit(1))[0];
    if (existing) return res.json({ ok: true, skipped: "existing-attempt", taskUid, postId: post.id, attemptId: existing.id });
    const inserted = await db.insert(socialPublishAttempts).values({ scheduledPostId: post.id, socialAccountId: account!.id, idempotencyKey, status: "queued", createdByUserId: post.createdByUserId });
    const attemptId = Number(inserted[0].insertId);
    await db.update(scheduledPosts).set({ lastDispatchAt: new Date(), lastError: null }).where(eq(scheduledPosts.id, post.id));
    return res.json({ ok: true, queued: true, taskUid, postId: post.id, attemptId });
  } catch (error) {
    const message = sanitizeSocialProviderError(error);
    return res.status(500).json({ error: message, context: { taskUid, url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
