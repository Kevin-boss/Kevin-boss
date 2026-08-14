export type ExportPreset = "youtube_1080p" | "vertical_1080x1920" | "square_1080";

export type RenderManifest = {
  preset: ExportPreset;
  width: number;
  height: number;
  videoCodec: "h264";
  audioCodec: "aac";
  container: "mp4";
  maxDurationSeconds: number;
};

const manifests: Record<ExportPreset, RenderManifest> = {
  youtube_1080p: { preset: "youtube_1080p", width: 1920, height: 1080, videoCodec: "h264", audioCodec: "aac", container: "mp4", maxDurationSeconds: 3600 },
  vertical_1080x1920: { preset: "vertical_1080x1920", width: 1080, height: 1920, videoCodec: "h264", audioCodec: "aac", container: "mp4", maxDurationSeconds: 900 },
  square_1080: { preset: "square_1080", width: 1080, height: 1080, videoCodec: "h264", audioCodec: "aac", container: "mp4", maxDurationSeconds: 900 },
};

export function getRenderManifest(preset: ExportPreset): RenderManifest {
  return manifests[preset];
}

export function validateRenderResponse(response: { storageKey?: unknown; mimeType?: unknown; durationSeconds?: unknown }, manifest: RenderManifest) {
  if (typeof response.storageKey !== "string" || response.storageKey.trim().length < 3) return { ok: false as const, reason: "Render worker did not return a storage key." };
  if (response.mimeType !== undefined && response.mimeType !== "video/mp4") return { ok: false as const, reason: "Render output must be an MP4 video." };
  if (response.durationSeconds !== undefined && (typeof response.durationSeconds !== "number" || response.durationSeconds <= 0 || response.durationSeconds > manifest.maxDurationSeconds)) return { ok: false as const, reason: "Render duration is outside the selected preset limit." };
  return { ok: true as const };
}

export function buildRenderManifestPayload(preset: ExportPreset, projectId: number, versionId: number, jobId: number) {
  return { jobId, projectId, versionId, manifest: getRenderManifest(preset) };
}
