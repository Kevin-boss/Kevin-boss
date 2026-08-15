import { describe, expect, it } from "vitest";
import { buildSocialOAuthAuthorizationUrl, getMissingSocialProviderCredentials, getSocialProviderContract, socialPlatforms } from "./socialProviderContracts";

describe("official social provider contracts", () => {
  it("lists only verified provider contracts and records the LinkedIn manual-refresh boundary", () => {
    expect(socialPlatforms).toEqual(["youtube", "tiktok", "facebook", "instagram", "linkedin", "x"]);
    expect(getSocialProviderContract("linkedin").webhook).toMatchObject({ supported: false, mode: "manual_refresh" });
    expect(getSocialProviderContract("instagram").publication).toMatchObject({ supported: true, requiresPublicMediaUrl: true });
  });

  it("reports exactly the missing server-side credentials without exposing their values", () => {
    expect(getMissingSocialProviderCredentials("youtube", {})).toEqual(["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"]);
    expect(getMissingSocialProviderCredentials("x", { X_CLIENT_ID: "set", X_CLIENT_SECRET: "set", X_WEBHOOK_SECRET: "set" })).toEqual([]);
  });

  it("builds official PKCE authorization URLs with only declared scopes and state", () => {
    const url = new URL(buildSocialOAuthAuthorizationUrl({ platform: "youtube", clientId: "client-id", redirectUri: "https://app.example.com/api/social/oauth/callback", state: "opaque-state", codeChallenge: "challenge" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/youtube.upload");
    expect(url.searchParams.get("state")).toBe("opaque-state");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(() => buildSocialOAuthAuthorizationUrl({ platform: "youtube", clientId: "client-id", redirectUri: "https://app.example.com/callback", state: "state" })).toThrow(/PKCE/i);
  });
});
