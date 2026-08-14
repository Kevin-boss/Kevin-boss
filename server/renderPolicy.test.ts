import { describe, expect, it } from "vitest";
import { buildRenderManifestPayload, getRenderManifest, validateRenderResponse } from "./renderPolicy";

describe("render policy", () => {
  it("defines stable dimensions and codecs for every download preset", () => {
    expect(getRenderManifest("youtube_1080p")).toMatchObject({ width: 1920, height: 1080, container: "mp4" });
    expect(getRenderManifest("vertical_1080x1920")).toMatchObject({ width: 1080, height: 1920 });
    expect(getRenderManifest("square_1080")).toMatchObject({ width: 1080, height: 1080 });
  });

  it("rejects missing keys, non-MP4 responses, and overlong output", () => {
    const manifest = getRenderManifest("square_1080");
    expect(validateRenderResponse({}, manifest).ok).toBe(false);
    expect(validateRenderResponse({ storageKey: "exports/a", mimeType: "video/webm" }, manifest).ok).toBe(false);
    expect(validateRenderResponse({ storageKey: "exports/a", durationSeconds: 901 }, manifest).ok).toBe(false);
  });

  it("builds a worker payload containing the selected manifest", () => {
    const payload = buildRenderManifestPayload("youtube_1080p", 4, 8, 12);
    expect(payload).toMatchObject({ jobId: 12, projectId: 4, versionId: 8, manifest: { width: 1920, height: 1080 } });
  });
});
