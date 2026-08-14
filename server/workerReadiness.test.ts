import { describe, expect, it } from "vitest";
import { getPrivateWorkerReadiness } from "./workerReadiness";

describe("private worker readiness", () => {
  it("reports configuration presence without returning endpoints or tokens", () => {
    expect(getPrivateWorkerReadiness({ TTS_WORKER_URL: "https://tts.internal", TTS_WORKER_TOKEN: "secret", RENDER_WORKER_URL: "https://render.internal" })).toEqual({ tts: { endpointConfigured: true, tokenConfigured: true, ready: true }, render: { endpointConfigured: true, tokenConfigured: false, ready: true } });
  });
});
