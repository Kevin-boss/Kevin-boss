export type DraftScene = {
  id: string;
  duration: number;
  voiceover: string;
  visualPrompt: string;
  onscreenText: string;
};

export type DraftPreset = "youtube_1080p" | "vertical_1080x1920" | "square_1080";
export type DraftQuality = "preview" | "standard" | "high";

export const draftPresetDimensions: Record<DraftPreset, { width: number; height: number }> = {
  youtube_1080p: { width: 1280, height: 720 },
  vertical_1080x1920: { width: 720, height: 1280 },
  square_1080: { width: 900, height: 900 },
};

export const draftQualityProfiles: Record<DraftQuality, { label: string; description: string; scale: number; frameRate: number; videoBitsPerSecond: number }> = {
  preview: { label: "Preview", description: "Lower resolution · fastest", scale: 0.5, frameRate: 20, videoBitsPerSecond: 1_250_000 },
  standard: { label: "Standard", description: "Balanced local draft", scale: 0.75, frameRate: 24, videoBitsPerSecond: 3_000_000 },
  high: { label: "High", description: "Full preset resolution", scale: 1, frameRate: 30, videoBitsPerSecond: 6_000_000 },
};

const MAX_SCENE_SECONDS = 3;
const MAX_EXPORT_SECONDS = 24;

export function buildDraftExportPlan(scenes: DraftScene[]) {
  const plannedScenes = scenes.slice(0, 12).map((scene) => ({
    ...scene,
    duration: Math.min(MAX_SCENE_SECONDS, Math.max(1, Number.isFinite(scene.duration) ? scene.duration : 1)),
  }));
  let remaining = MAX_EXPORT_SECONDS;
  return plannedScenes.flatMap((scene) => {
    if (remaining <= 0) return [];
    const duration = Math.min(scene.duration, remaining);
    remaining -= duration;
    return [{ ...scene, duration }];
  });
}

export function getDraftDimensions(preset: DraftPreset, quality: DraftQuality) {
  const base = draftPresetDimensions[preset];
  const scale = draftQualityProfiles[quality].scale;
  return { width: Math.round(base.width * scale), height: Math.round(base.height * scale) };
}

function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line); line = word;
      if (lines.length === maxLines) break;
    } else line = candidate;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function preferredMimeType() {
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}

export type RenderedDraftVideo = { blob: Blob; filename: string; durationSeconds: number; sceneCount: number };

export async function renderDraftVideo({ title, scenes, preset, quality = "standard", onProgress, signal }: {
  title: string;
  scenes: DraftScene[];
  preset: DraftPreset;
  quality?: DraftQuality;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}): Promise<RenderedDraftVideo> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") throw new Error("This browser does not support quick draft-video export.");
  const plan = buildDraftExportPlan(scenes);
  if (!plan.length) throw new Error("Add at least one scene before creating a draft preview.");
  const { width, height } = getDraftDimensions(preset, quality);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas video export is unavailable in this browser.");
  const stream = canvas.captureStream(draftQualityProfiles[quality].frameRate);
  const recorder = new MediaRecorder(stream, { mimeType: preferredMimeType(), videoBitsPerSecond: draftQualityProfiles[quality].videoBitsPerSecond });
  const abortError = () => Object.assign(new Error("Quick draft rendering cancelled."), { name: "AbortError" });
  let recording = false;
  let recorderStopped = false;
  const stopRecorder = () => {
    if (!recording || recorderStopped) return;
    recorderStopped = true;
    recorder.stop();
  };
  const abort = () => { stopRecorder(); stream.getTracks().forEach((track) => track.stop()); };
  if (signal?.aborted) { abort(); throw abortError(); }
  const chunks: BlobPart[] = [];
  recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    recorder.addEventListener("error", () => reject(new Error("Quick draft-video recording failed.")), { once: true });
  });
  const totalMs = plan.reduce((total, scene) => total + scene.duration * 1000, 0);
  let elapsedMs = 0;
  const renderScene = (scene: DraftScene, localProgress: number, sceneIndex: number) => {
    const accent = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24"][sceneIndex % 4]!;
    const inset = Math.round(Math.min(width, height) * 0.07);
    const textWidth = width - inset * 2;
    const labelSize = Math.max(17, Math.round(width * 0.023));
    const titleSize = Math.max(26, Math.round(width * 0.052));
    const bodySize = Math.max(18, Math.round(width * 0.028));
    const opacity = Math.min(1, localProgress * 4, (1 - localProgress) * 7);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#090f1f"); gradient.addColorStop(0.58, "#16133a"); gradient.addColorStop(1, "#062837");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `${accent}24`; ctx.beginPath(); ctx.arc(width * (0.72 + localProgress * 0.06), height * 0.25, Math.min(width, height) * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `${accent}55`; ctx.lineWidth = Math.max(2, Math.round(width * 0.003)); ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = accent; ctx.font = `600 ${labelSize}px ui-sans-serif, system-ui`; ctx.letterSpacing = "0.1em"; ctx.fillText(`SCENE ${String(sceneIndex + 1).padStart(2, "0")}  ·  AI CONTENT OS`, inset * 1.45, inset * 1.75);
    ctx.letterSpacing = ""; ctx.fillStyle = "#f8fafc"; ctx.font = `700 ${titleSize}px ui-sans-serif, system-ui`;
    const headline = wrapText(ctx, scene.onscreenText || scene.visualPrompt || scene.id, textWidth * 0.86, 3);
    headline.forEach((line, index) => ctx.fillText(line, inset * 1.45, height * 0.39 + index * titleSize * 1.15));
    ctx.fillStyle = "#cbd5e1"; ctx.font = `400 ${bodySize}px ui-sans-serif, system-ui`;
    const voiceover = wrapText(ctx, scene.voiceover || "Draft scene", textWidth * 0.86, 3);
    voiceover.forEach((line, index) => ctx.fillText(line, inset * 1.45, height * 0.72 + index * bodySize * 1.45));
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#94a3b8"; ctx.font = `400 ${Math.max(14, Math.round(width * 0.018))}px ui-sans-serif, system-ui`; ctx.fillText("Quick draft · browser-rendered · no external provider", inset * 1.45, height - inset * 1.35);
  };
  recorder.start(250);
  recording = true;
  signal?.addEventListener("abort", abort, { once: true });
  try {
    for (let index = 0; index < plan.length; index += 1) {
      const scene = plan[index]!;
      const sceneMs = scene.duration * 1000;
      const started = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          if (signal?.aborted) return resolve();
          const localElapsed = Math.min(sceneMs, now - started);
          renderScene(scene, localElapsed / sceneMs, index);
          onProgress?.(Math.round(((elapsedMs + localElapsed) / totalMs) * 100));
          if (localElapsed < sceneMs) requestAnimationFrame(frame); else resolve();
        };
        requestAnimationFrame(frame);
      });
      if (signal?.aborted) throw abortError();
      elapsedMs += sceneMs;
    }
    stopRecorder(); await stopped;
    if (signal?.aborted) throw abortError();
    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    if (!blob.size) throw new Error("Quick draft-video export created an empty file.");
    const filename = `${title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "ai-content-os-draft"}-${quality}.webm`;
    onProgress?.(100);
    return { blob, filename, durationSeconds: totalMs / 1000, sceneCount: plan.length };
  } finally {
    signal?.removeEventListener("abort", abort);
    abort();
  }
}

export function downloadRenderedDraft({ blob, filename }: Pick<RenderedDraftVideo, "blob" | "filename">) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadDraftVideo(options: Parameters<typeof renderDraftVideo>[0]) {
  const rendered = await renderDraftVideo(options);
  downloadRenderedDraft(rendered);
  return rendered;
}
