import { describe, expect, it } from "vitest";
import { parseWorkerExportResponse, renderWorkerAvailability } from "./exportPolicy";

describe("downloadable export contracts", () => {
  it("returns an explicit unavailable state without a render worker", () => {
    expect(renderWorkerAvailability(undefined)).toEqual({ available: false, code: "RENDER_WORKER_UNAVAILABLE" });
  });

  it("accepts a worker storage key for a completed export", () => {
    expect(parseWorkerExportResponse({ storageKey: "exports/video.mp4", mimeType: "video/mp4" })).toMatchObject({ storageKey: "exports/video.mp4", mimeType: "video/mp4" });
  });

  it("does not treat malformed worker output as a downloadable export", () => {
    expect(parseWorkerExportResponse({ storageKey: 42 })).toEqual({});
  });
});
