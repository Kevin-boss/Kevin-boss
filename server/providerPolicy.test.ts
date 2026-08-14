import { describe, expect, it } from "vitest";
import { assertBuiltInOrFreeFirst, assertFreeFirstSelection, rankFreeFirst } from "./providerPolicy";

const providers = [
  { id: 1, costTier: "paid" as const, selfHosted: "no" as const, commercialUse: "allowed" as const, enabled: "yes" as const, capabilities: ["tts", "text"] },
  { id: 2, costTier: "free" as const, selfHosted: "yes" as const, commercialUse: "allowed" as const, enabled: "yes" as const, capabilities: ["tts"] },
  { id: 3, costTier: "free" as const, selfHosted: "yes" as const, commercialUse: "review" as const, enabled: "yes" as const, capabilities: ["tts"] },
];

describe("free-first provider policy", () => {
  it("ranks an approved free self-hosted provider before paid providers", () => {
    expect(rankFreeFirst(providers, "tts").map(provider => provider.id)).toEqual([2, 1]);
  });

  it("filters out disabled, restricted, and unsupported providers", () => {
    expect(rankFreeFirst(providers, "image")).toEqual([]);
  });

  it("blocks paid selection when an approved free alternative exists", () => {
    expect(() => assertFreeFirstSelection(providers[0], providers, "tts")).toThrow(/free approved tts provider/i);
  });

  it("allows built-in fallback only when no eligible registry provider exists", () => {
    for (const capability of ["text", "image", "video", "tts", "asr", "embedding", "vision"] as const) {
      expect(assertBuiltInOrFreeFirst([], capability).mode).toBe("built_in");
    }
    expect(assertBuiltInOrFreeFirst(providers, "tts").mode).toBe("registry");
    expect(() => assertBuiltInOrFreeFirst([{ ...providers[0], capabilities: ["video"] }], "video")).toThrow(/free or self-hosted/i);
  });

  it("ranks free providers and blocks paid-only execution for every current capability", () => {
    for (const capability of ["text", "image", "asr", "tts", "video"] as const) {
      const free = { ...providers[1], id: 20, capabilities: [capability] };
      const paid = { ...providers[0], id: 21, capabilities: [capability] };
      expect(rankFreeFirst([paid, free], capability).map(item => item.id)).toEqual([20, 21]);
      expect(assertBuiltInOrFreeFirst([paid, free], capability).provider?.id).toBe(20);
      expect(() => assertBuiltInOrFreeFirst([paid], capability)).toThrow(/free or self-hosted/i);
    }
  });
});
