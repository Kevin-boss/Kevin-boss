import { describe, expect, it } from "vitest";
import { canUseProvider, getFallbackChain, getTaskContract } from "./taskPolicy";

describe("AI task policy", () => {
  it("defines structured contracts and safe fallbacks", () => {
    expect(getTaskContract("video").output).toContain("MP4 storage key");
    expect(getFallbackChain("video")).toEqual(["image"]);
    expect(getTaskContract("asr").output).toContain("timed transcript segments");
  });

  it("requires enabled, commercially allowed capability providers", () => {
    expect(canUseProvider({ enabled: "yes", commercialUse: "allowed", capabilities: ["tts"] }, "tts")).toBe(true);
    expect(canUseProvider({ enabled: "yes", commercialUse: "review", capabilities: ["tts"] }, "tts")).toBe(false);
    expect(canUseProvider({ enabled: "yes", commercialUse: "allowed", capabilities: ["image"] }, "tts")).toBe(false);
  });
});
