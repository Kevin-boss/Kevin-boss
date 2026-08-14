import { describe, expect, it } from "vitest";
import { normalizeAssetMetadata } from "./assetMetadata";

describe("asset metadata policy", () => {
  it("normalizes tags and preserves complete licensing metadata", () => {
    expect(normalizeAssetMetadata({ tags: [" Brand ", "brand", "Campaign"], license: "  CC BY 4.0 ", author: "  Studio ", attribution: "  studio.example " })).toEqual({ tags: ["brand", "campaign"], license: "CC BY 4.0", author: "Studio", attribution: "studio.example" });
  });

  it("allows each asset to carry an independent folder assignment", () => {
    const first = { folderId: 12, ...normalizeAssetMetadata({ rightsStatus: "verified" }) };
    const second = { folderId: null, ...normalizeAssetMetadata({ rightsStatus: "review_required" }) };
    expect(first.folderId).toBe(12);
    expect(second.folderId).toBeNull();
    expect(first.rightsStatus).not.toBe(second.rightsStatus);
  });
});
