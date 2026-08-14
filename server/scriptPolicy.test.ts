import { describe, expect, it } from "vitest";
import { attachSceneCitationIds, reviewSceneVariant, stageSceneVariant, updateSceneFields, type ScriptScene } from "./scriptPolicy";

const scene: ScriptScene = { id: "scene_001", duration: 8, voiceover: "Original", visualPrompt: "Visual", broll: "B-roll", onscreenText: "", transition: "cut", music: "ambient", soundEffect: "none" };
const replacement: ScriptScene = { ...scene, voiceover: "Replacement" };

describe("Script Studio policy", () => {
  it("persists full structured scene-field edits without changing the scene ID", () => { const content = updateSceneFields({ scenes: [scene] }, scene.id, { duration: 14, visualPrompt: "New visual", broll: "New B-roll", onscreenText: "New title", transition: "wipe", music: "pulse", soundEffect: "hit" }); expect(content?.scenes[0]).toMatchObject({ id: scene.id, duration: 14, visualPrompt: "New visual", broll: "New B-roll", onscreenText: "New title", transition: "wipe", music: "pulse", soundEffect: "hit" }); expect(updateSceneFields({ scenes: [scene] }, "missing", { duration: 3 })).toBeNull(); });

  it("maps verified citation IDs to a specific scene", () => {
    const content = attachSceneCitationIds({ scenes: [scene], sceneVariants: [] }, scene.id, [4, 4, 9]);
    expect(content.sceneCitations?.[scene.id]).toEqual([4, 9]);
  });

  it("stages a pending variant without overwriting the active scene", () => {
    const content = stageSceneVariant({ scenes: [scene], sceneVariants: [] }, { variantId: "v1", sceneId: scene.id, status: "pending", content: replacement, jobId: 10, createdAt: new Date().toISOString() });
    expect(content.scenes[0]?.voiceover).toBe("Original");
    expect(content.sceneVariants[0]?.status).toBe("pending");
  });

  it("replaces the active scene only after acceptance", () => {
    const staged = stageSceneVariant({ scenes: [scene], sceneVariants: [] }, { variantId: "v1", sceneId: scene.id, status: "pending", content: replacement, jobId: 10, createdAt: new Date().toISOString() });
    expect(reviewSceneVariant(staged, "v1", "reject")?.scenes[0]?.voiceover).toBe("Original");
    expect(reviewSceneVariant(staged, "v1", "accept")?.scenes[0]?.voiceover).toBe("Replacement");
  });
});
