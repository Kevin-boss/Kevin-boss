type Environment = Record<string, string | undefined>;

export function getPrivateWorkerReadiness(env: Environment = process.env) {
  const worker = (urlKey: string, tokenKey: string) => ({
    endpointConfigured: Boolean(env[urlKey]),
    tokenConfigured: Boolean(env[tokenKey]),
    ready: Boolean(env[urlKey] && env[tokenKey]),
  });
  return { tts: worker("TTS_WORKER_URL", "TTS_WORKER_TOKEN"), render: worker("RENDER_WORKER_URL", "RENDER_WORKER_TOKEN") };
}
