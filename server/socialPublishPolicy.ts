import { randomUUID } from "node:crypto";
import type { SocialPlatform } from "./socialProviderContracts";

export type SocialDispatchReadiness = { ready: true } | { ready: false; reason: string };

export function assessSocialDispatchReadiness(input: { status: string; platform: SocialPlatform; accountStatus?: string | null; accountPlatform?: string | null; deliveryAssetId?: number | null; approvedAt?: Date | null }) : SocialDispatchReadiness {
  if (input.status !== "scheduled") return { ready: false, reason: "The publishing plan must be approved and scheduled before dispatch." };
  if (!input.approvedAt) return { ready: false, reason: "The publishing plan has not recorded reviewer approval." };
  if (!input.deliveryAssetId) return { ready: false, reason: "Attach a completed video export before dispatch." };
  if (input.accountStatus !== "connected") return { ready: false, reason: "Connect an official social account before dispatch." };
  if (input.accountPlatform !== input.platform) return { ready: false, reason: "The selected account does not match the publishing platform." };
  return { ready: true };
}

export function buildSocialDispatchIdempotencyKey(postId: number, accountId: number, scheduleTaskUid?: string | null) {
  return `social-${postId}-${accountId}-${scheduleTaskUid ?? randomUUID()}`.slice(0, 96);
}

export function sanitizeSocialProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "Social provider dispatch failed.";
  return message.replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]").replace(/(client_secret|access_token|refresh_token)=([^&\s]+)/gi, "$1=[redacted]").slice(0, 1000);
}
