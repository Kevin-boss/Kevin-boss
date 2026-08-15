export type ExportPreset = "youtube_1080p" | "vertical_1080x1920" | "square_1080";
export type RenderQuality = "standard" | "high_fidelity";

export type RenderManifest = {
  preset: ExportPreset;
  quality: RenderQuality;
  width: number;
  height: number;
  videoCodec: "h264";
  audioCodec: "aac";
  container: "mp4";
  frameRate: 24 | 30;
  targetVideoBitrate: number;
  targetAudioBitrate: number;
  audioSampleRate: 44100 | 48000;
  maxDurationSeconds: number;
};

const dimensions: Record<ExportPreset, Pick<RenderManifest, "width" | "height" | "maxDurationSeconds">> = {
  youtube_1080p: { width: 1920, height: 1080, maxDurationSeconds: 3600 },
  vertical_1080x1920: { width: 1080, height: 1920, maxDurationSeconds: 900 },
  square_1080: { width: 1080, height: 1080, maxDurationSeconds: 900 },
};

const qualityProfiles: Record<RenderQuality, Pick<RenderManifest, "frameRate" | "targetVideoBitrate" | "targetAudioBitrate" | "audioSampleRate">> = {
  standard: { frameRate: 24, targetVideoBitrate: 8_000_000, targetAudioBitrate: 128_000, audioSampleRate: 44100 },
  high_fidelity: { frameRate: 30, targetVideoBitrate: 12_000_000, targetAudioBitrate: 192_000, audioSampleRate: 48000 },
};

export function getRenderManifest(preset: ExportPreset, quality: RenderQuality = "high_fidelity"): RenderManifest {
  return { preset, quality, ...dimensions[preset], ...qualityProfiles[quality], videoCodec: "h264", audioCodec: "aac", container: "mp4" };
}

export function validateRenderResponse(response: { storageKey?: unknown; mimeType?: unknown; durationSeconds?: unknown }, manifest: RenderManifest) {
  if (typeof response.storageKey !== "string" || response.storageKey.trim().length < 3) return { ok: false as const, reason: "Render worker did not return a storage key." };
  if (response.mimeType !== undefined && response.mimeType !== "video/mp4") return { ok: false as const, reason: "Render output must be an MP4 video." };
  if (response.durationSeconds !== undefined && (typeof response.durationSeconds !== "number" || response.durationSeconds <= 0 || response.durationSeconds > manifest.maxDurationSeconds)) return { ok: false as const, reason: "Render duration is outside the selected preset limit." };
  return { ok: true as const };
}

export function buildRenderManifestPayload(preset: ExportPreset, projectId: number, versionId: number, jobId: number, quality: RenderQuality = "high_fidelity") {
  return { jobId, projectId, versionId, manifest: getRenderManifest(preset, quality) };
}
