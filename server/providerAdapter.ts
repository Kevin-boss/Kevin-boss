import { assertBuiltInOrFreeFirst, type ProviderPolicyCandidate } from "./providerPolicy";

export type RegistryProvider = ProviderPolicyCandidate & { endpoint: string; modelId: string; provider: string };

export function selectPreferredProvider(providers: RegistryProvider[], capability: string) {
  return assertBuiltInOrFreeFirst(providers, capability);
}

export async function callRegistryProvider(provider: RegistryProvider, payload: Record<string, unknown>, timeoutMs = 45_000) {
  const isHuggingFaceRouter = provider.endpoint.startsWith("https://router.huggingface.co/");
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(isHuggingFaceRouter && process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {}) },
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

/**
 * Future capability adapters must be created through this factory. It guarantees
 * that every registry-backed execution performs the shared free-first selection
 * before the modality-specific executor is called, with an explicit built-in
 * fallback when no registry provider is configured.
 */
const providerExecutorBrand = Symbol("providerExecutor");
type BrandedProviderExecutor<TPayload, TResult> = ((providers: unknown[], payload: TPayload) => Promise<TResult>) & { readonly [providerExecutorBrand]: true; readonly capability: string };

export function createProviderExecutor<TPayload, TResult>(config: {
  capability: string;
  executeRegistry: (provider: RegistryProvider, payload: TPayload) => Promise<TResult>;
  executeBuiltIn: (payload: TPayload) => Promise<TResult>;
}): BrandedProviderExecutor<TPayload, TResult> {
  const executor = (async (providers: unknown[], payload: TPayload) => {
    const candidates = providers.filter((row): row is RegistryProvider => !!row && typeof row === "object" && typeof (row as RegistryProvider).endpoint === "string" && typeof (row as RegistryProvider).modelId === "string");
    const selection = selectPreferredProvider(candidates, config.capability);
    if (selection.mode === "registry" && selection.provider) return config.executeRegistry(selection.provider, payload);
    return config.executeBuiltIn(payload);
  }) as BrandedProviderExecutor<TPayload, TResult>;
  Object.defineProperties(executor, { [providerExecutorBrand]: { value: true }, capability: { value: config.capability } });
  return executor;
}

const registeredProviderAdapters = new Map<string, BrandedProviderExecutor<unknown, unknown>>();

export function registerProviderAdapter<TPayload, TResult>(name: string, executor: BrandedProviderExecutor<TPayload, TResult>) {
  if (registeredProviderAdapters.has(name)) throw new Error(`Provider adapter ${name} is already registered.`);
  registeredProviderAdapters.set(name, executor as BrandedProviderExecutor<unknown, unknown>);
  return executor;
}

export function getProviderAdapter(name: string) {
  return registeredProviderAdapters.get(name);
}
