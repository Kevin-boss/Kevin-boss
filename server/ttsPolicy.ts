export type ApprovedVoice = {
  workspaceId: number;
  provider: string;
  providerVoiceId: string;
  commercialUse: "allowed" | "review" | "restricted";
};

export type VoiceConsent = { voiceId: number; workspaceId: number; status: "pending" | "verified" | "revoked"; approvedUseScope: "commercial_tts" | "internal_only"; evidenceReference: string | null; verifiedByUserId: number | null; verifiedAt: Date | null };

export function assertApprovedVoiceForSynthesis(voice: (ApprovedVoice & { id?: number }) | undefined, consent: VoiceConsent | undefined, workspaceId: number, provider: string, providerVoiceId: string) {
  if (!voice || voice.workspaceId !== workspaceId || voice.provider !== provider || voice.providerVoiceId !== providerVoiceId) {
    throw new Error("Select an approved voice that belongs to this workspace and provider.");
  }
  if (voice.commercialUse !== "allowed") throw new Error("This voice is not approved for commercial synthesis.");
  if (!consent || consent.voiceId !== voice.id || consent.workspaceId !== workspaceId || consent.status !== "verified" || consent.approvedUseScope !== "commercial_tts" || !consent.evidenceReference || !consent.verifiedByUserId || !consent.verifiedAt) throw new Error("This voice lacks verified commercial consent evidence.");
}

export function buildPrivateTtsPayload(input: { model: string; voice: string; text: string; language: string; speed: number; emotion?: string }) {
  return {
    model: input.model,
    voice: input.voice,
    input: input.text,
    language: input.language,
    speed: input.speed,
    ...(input.emotion ? { emotion: input.emotion } : {}),
    response_format: "wav",
  };
}

export function parsePrivateTtsResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("TTS provider returned an invalid response.");
  const result = payload as { audioBase64?: unknown; mimeType?: unknown };
  if (typeof result.audioBase64 !== "string" || !result.audioBase64.trim()) throw new Error("TTS provider response did not include audioBase64.");
  const mimeType = typeof result.mimeType === "string" && result.mimeType.startsWith("audio/") ? result.mimeType : "audio/wav";
  return { audioBase64: result.audioBase64, mimeType };
}
