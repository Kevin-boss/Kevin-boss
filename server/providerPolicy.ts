import { TRPCError } from "@trpc/server";

export type ProviderPolicyCandidate = {
  id: number;
  costTier: "free" | "paid" | "metered";
  selfHosted: "yes" | "no";
  commercialUse: "allowed" | "review" | "restricted";
  enabled: "yes" | "no";
  capabilities: unknown;
};

export function supportsCapability(provider: ProviderPolicyCandidate, capability: string) {
  return provider.enabled === "yes" && provider.commercialUse === "allowed" && Array.isArray(provider.capabilities) && provider.capabilities.includes(capability);
}

export function rankFreeFirst<T extends ProviderPolicyCandidate>(providers: T[], capability: string) {
  return providers.filter(provider => supportsCapability(provider, capability)).sort((a, b) => Number(a.costTier !== "free") - Number(b.costTier !== "free") || Number(b.selfHosted === "yes") - Number(a.selfHosted === "yes") || a.id - b.id);
}

export function assertFreeFirstSelection<T extends ProviderPolicyCandidate>(selected: T | undefined, providers: T[], capability: string) {
  if (!selected || !supportsCapability(selected, capability)) throw new TRPCError({ code: "BAD_REQUEST", message: `The selected provider is not enabled for ${capability} or lacks an allowed commercial-use policy.` });
  const preferred = rankFreeFirst(providers, capability)[0];
  if (preferred && preferred.costTier === "free" && selected.costTier !== "free") throw new TRPCError({ code: "BAD_REQUEST", message: `A free approved ${capability} provider is available. Select it before using a paid or metered provider.` });
  return selected;
}
