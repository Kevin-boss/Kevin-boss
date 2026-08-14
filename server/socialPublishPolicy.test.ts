import { describe, expect, it } from "vitest";
import { assessSocialDispatchReadiness, buildSocialDispatchIdempotencyKey, sanitizeSocialProviderError } from "./socialPublishPolicy";

describe("social publishing safety policy", () => {
  const approvedAt = new Date("2026-08-14T10:00:00Z");

  it("requires a scheduled approved plan, final video asset, and matching connected account before dispatch", () => {
    expect(assessSocialDispatchReadiness({ status: "awaiting_approval", platform: "youtube", accountStatus: "connected", accountPlatform: "youtube", deliveryAssetId: 4, approvedAt })).toEqual({ ready: false, reason: "The publishing plan must be approved and scheduled before dispatch." });
    expect(assessSocialDispatchReadiness({ status: "scheduled", platform: "youtube", accountStatus: "connected", accountPlatform: "tiktok", deliveryAssetId: 4, approvedAt })).toEqual({ ready: false, reason: "The selected account does not match the publishing platform." });
    expect(assessSocialDispatchReadiness({ status: "scheduled", platform: "youtube", accountStatus: "connected", accountPlatform: "youtube", deliveryAssetId: 4, approvedAt })).toEqual({ ready: true });
  });

  it("creates a stable bounded key for a managed schedule and strips tokens from errors", () => {
    expect(buildSocialDispatchIdempotencyKey(4, 8, "task_42")).toBe("social-4-8-task_42");
    expect(sanitizeSocialProviderError(new Error("Bearer abc.def access_token=secret-value"))).toBe("Bearer [redacted] access_token=[redacted]");
  });
});
