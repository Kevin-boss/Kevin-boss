import { describe, expect, it } from "vitest";
import { assertApprovedVoiceForSynthesis, buildPrivateTtsPayload, parsePrivateTtsResponse } from "./ttsPolicy";

describe("private TTS policy", () => {
  const approvedVoice = { id: 4, workspaceId: 7, provider: "kokoro", providerVoiceId: "af_heart", commercialUse: "allowed" as const };
  const verifiedConsent = { voiceId: 4, workspaceId: 7, status: "verified" as const, approvedUseScope: "commercial_tts" as const, evidenceReference: "consent/voice-4.pdf", verifiedByUserId: 2, verifiedAt: new Date() };

  it("accepts only a commercial-use-approved voice belonging to the selected workspace and provider", () => {
    expect(() => assertApprovedVoiceForSynthesis(approvedVoice, verifiedConsent, 7, "kokoro", "af_heart")).not.toThrow();
    expect(() => assertApprovedVoiceForSynthesis({ ...approvedVoice, commercialUse: "review" }, verifiedConsent, 7, "kokoro", "af_heart")).toThrow("not approved");
    expect(() => assertApprovedVoiceForSynthesis(approvedVoice, verifiedConsent, 8, "kokoro", "af_heart")).toThrow("belongs to this workspace");
    expect(() => assertApprovedVoiceForSynthesis(approvedVoice, { ...verifiedConsent, status: "pending" }, 7, "kokoro", "af_heart")).toThrow("consent evidence");
  });

  it("creates a stable Kokoro-compatible private speech request without leaking consent metadata", () => {
    expect(buildPrivateTtsPayload({ model: "Kokoro-82M", voice: "af_heart", text: "Narration", language: "en", speed: 1, emotion: "calm" })).toEqual({ model: "Kokoro-82M", voice: "af_heart", input: "Narration", language: "en", speed: 1, emotion: "calm", response_format: "wav" });
  });

  it("rejects malformed private speech responses and normalizes safe audio MIME types", () => {
    expect(parsePrivateTtsResponse({ audioBase64: "YWJj", mimeType: "audio/mpeg" })).toEqual({ audioBase64: "YWJj", mimeType: "audio/mpeg" });
    expect(parsePrivateTtsResponse({ audioBase64: "YWJj", mimeType: "text/plain" }).mimeType).toBe("audio/wav");
    expect(() => parsePrivateTtsResponse({ mimeType: "audio/wav" })).toThrow("audioBase64");
  });
});
