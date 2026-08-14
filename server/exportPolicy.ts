export type WorkerExportResponse = { storageKey?: string; title?: string; mimeType?: string };

export function renderWorkerAvailability(endpoint: string | undefined) {
  return endpoint ? { available: true as const, code: null } : { available: false as const, code: "RENDER_WORKER_UNAVAILABLE" as const };
}

export function parseWorkerExportResponse(payload: unknown): WorkerExportResponse {
  if (!payload || typeof payload !== "object") return {};
  const value = payload as Record<string, unknown>;
  return {
    storageKey: typeof value.storageKey === "string" && value.storageKey.length > 0 ? value.storageKey : undefined,
    title: typeof value.title === "string" ? value.title : undefined,
    mimeType: typeof value.mimeType === "string" ? value.mimeType : undefined,
  };
}
