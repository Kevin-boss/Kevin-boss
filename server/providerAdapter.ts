import { assertBuiltInOrFreeFirst, type ProviderPolicyCandidate } from "./providerPolicy";

export type RegistryProvider = ProviderPolicyCandidate & { endpoint: string; modelId: string; provider: string };

export function selectPreferredProvider(providers: RegistryProvider[], capability: string) {
  return assertBuiltInOrFreeFirst(providers, capability);
}

export async function callRegistryProvider(provider: RegistryProvider, payload: Record<string, unknown>, timeoutMs = 45_000) {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: provider.modelId, ...payload }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${provider.provider} returned HTTP ${response.status}.`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function executeRegistryText(provider: RegistryProvider, payload: Record<string, unknown>) {
  const response = await callRegistryProvider(provider, payload);
  const choices = response.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error(`${provider.provider} returned no text content.`);
  return content;
}

export async function executeRegistryImage(provider: RegistryProvider, payload: Record<string, unknown>) {
  const response = await callRegistryProvider(provider, payload, 120_000);
  const data = response.data as Array<{ url?: unknown; b64_json?: unknown }> | undefined;
  const url = data?.[0]?.url;
  if (typeof url === "string") return url;
  const b64 = data?.[0]?.b64_json;
  if (typeof b64 === "string") return `data:image/png;base64,${b64}`;
  if (typeof response.url === "string") return response.url;
  throw new Error(`${provider.provider} returned no image URL.`);
}

export async function executeRegistryAsr(provider: RegistryProvider, payload: Record<string, unknown>) {
  const response = await callRegistryProvider(provider, payload, 120_000);
  if (typeof response.text !== "string") throw new Error(`${provider.provider} returned no transcript text.`);
  return { text: response.text, language: typeof response.language === "string" ? response.language : "und", segments: Array.isArray(response.segments) ? response.segments : [] };
}
