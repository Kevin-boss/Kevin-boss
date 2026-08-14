import { describe, expect, it } from "vitest";
import { getMissingSocialProviderCredentials, getSocialProviderContract, socialPlatforms } from "./socialProviderContracts";

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
});
