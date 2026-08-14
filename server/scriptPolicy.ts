import type { z } from "zod";

export type ScriptScene = { id: string; duration: number; voiceover: string; visualPrompt: string; broll: string; onscreenText: string; transition: string; music: string; soundEffect: string };
export type ScriptVariant = { variantId: string; sceneId: string; status: "pending" | "accepted" | "rejected"; content: ScriptScene; jobId: number; createdAt: string };

export function updateSceneFields<T extends { scenes: ScriptScene[] }>(content: T, sceneId: string, changes: Partial<ScriptScene>) {
  if (!content.scenes.some(scene => scene.id === sceneId)) return null;
  return { ...content, scenes: content.scenes.map(scene => scene.id === sceneId ? { ...scene, ...changes, id: sceneId } : scene) };
}

export function attachSceneCitationIds<T extends { sceneCitations?: Record<string, number[]> }>(content: T, sceneId: string, citationIds: number[]) {
  return { ...content, sceneCitations: { ...(content.sceneCitations ?? {}), [sceneId]: Array.from(new Set(citationIds)) } };
}

export function stageSceneVariant<T extends { sceneVariants: ScriptVariant[] }>(content: T, variant: ScriptVariant) {
  return { ...content, sceneVariants: [...content.sceneVariants.filter(item => item.sceneId !== variant.sceneId || item.status !== "pending"), variant] };
}

export function reviewSceneVariant<T extends { scenes: ScriptScene[]; sceneVariants: ScriptVariant[] }>(content: T, variantId: string, decision: "accept" | "reject") {
  const variant = content.sceneVariants.find(item => item.variantId === variantId);
  if (!variant) return null;
  const sceneVariants = content.sceneVariants.map(item => item.variantId === variantId ? { ...item, status: decision === "accept" ? "accepted" as const : "rejected" as const } : item);
  return decision === "accept" ? { ...content, scenes: content.scenes.map(scene => scene.id === variant.sceneId ? variant.content : scene), sceneVariants } : { ...content, sceneVariants };
}
