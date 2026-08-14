import { describe, expect, it } from "vitest";
import { parseWorkerExportResponse, renderWorkerAvailability } from "./exportPolicy";

describe("render worker export policy", () => {
  it("exposes an explicit unavailable state without a worker endpoint", () => {
    expect(renderWorkerAvailability(undefined)).toEqual({ available: false, code: "RENDER_WORKER_UNAVAILABLE" });
    expect(renderWorkerAvailability("https://worker.internal/render")).toEqual({ available: true, code: null });
  });

  it("normalizes only valid export response fields", () => {
    expect(parseWorkerExportResponse({ storageKey: "exports/out.mp4", title: "Export", mimeType: "video/mp4", ignored: true })).toEqual({ storageKey: "exports/out.mp4", title: "Export", mimeType: "video/mp4" });
    expect(parseWorkerExportResponse({ storageKey: "", title: 7, mimeType: null })).toEqual({ storageKey: undefined, title: undefined, mimeType: undefined });
    expect(parseWorkerExportResponse(null)).toEqual({});
  });
});
