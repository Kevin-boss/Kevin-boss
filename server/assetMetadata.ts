export const assetRightsStatuses = ["verified", "review_required", "attribution_required", "restricted", "unknown"] as const;
export type AssetRightsStatus = typeof assetRightsStatuses[number];

export function normalizeAssetMetadata(input: { tags?: string[]; license?: string | null; author?: string | null; attribution?: string | null; rightsStatus?: AssetRightsStatus }) {
  const tags = Array.from(new Set((input.tags ?? []).map(tag => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 30);
  return {
    ...(input.rightsStatus ? { rightsStatus: input.rightsStatus } : {}),
    ...(input.license !== undefined ? { license: input.license?.trim() || null } : {}),
    ...(input.author !== undefined ? { author: input.author?.trim() || null } : {}),
    ...(input.attribution !== undefined ? { attribution: input.attribution?.trim() || null } : {}),
    ...(input.tags !== undefined ? { tags } : {}),
  };
}
