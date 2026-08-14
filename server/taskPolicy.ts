export type TaskCapability = "text" | "image" | "video" | "tts" | "asr" | "embedding" | "vision";

export const taskContracts: Record<TaskCapability, { input: string[]; output: string[]; fallback: TaskCapability[] }> = {
  text: { input: ["prompt", "structured JSON schema"], output: ["validated JSON", "text"], fallback: ["text"] },
  image: { input: ["prompt", "optional reference image"], output: ["image asset"], fallback: ["image"] },
  video: { input: ["render manifest", "asset references"], output: ["MP4 storage key"], fallback: ["image"] },
  tts: { input: ["text", "voice", "language", "speed", "emotion"], output: ["audio asset"], fallback: ["tts"] },
  asr: { input: ["audio URL", "language"], output: ["timed transcript segments"], fallback: ["asr"] },
  embedding: { input: ["text"], output: ["vector"], fallback: ["embedding"] },
  vision: { input: ["image URL", "prompt"], output: ["structured observations"], fallback: ["vision", "text"] },
};

export function getTaskContract(capability: TaskCapability) {
  return taskContracts[capability];
}

export function canUseProvider(provider: { enabled: string; commercialUse: string; capabilities: unknown }, capability: TaskCapability) {
  const capabilities = Array.isArray(provider.capabilities) ? provider.capabilities : [];
  return provider.enabled === "yes" && provider.commercialUse === "allowed" && capabilities.includes(capability);
}

export function getFallbackChain(capability: TaskCapability) {
  return taskContracts[capability].fallback;
}
