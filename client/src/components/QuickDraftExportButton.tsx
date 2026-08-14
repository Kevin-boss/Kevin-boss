import { Button } from "@/components/ui/button";
import { draftQualityProfiles, downloadRenderedDraft, renderDraftVideo, type DraftPreset, type DraftQuality, type DraftScene, type RenderedDraftVideo } from "@/lib/draftVideoExport";
import { Download, Eye, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function QuickDraftExportButton({ title, scenes, preset }: { title: string; scenes: DraftScene[]; preset: DraftPreset }) {
  const [quality, setQuality] = useState<DraftQuality>("standard");
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<(RenderedDraftVideo & { url: string }) | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
    };
  }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const createPreview = async () => {
    if (preview) { URL.revokeObjectURL(preview.url); setPreview(null); }
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      setProgress(0);
      const rendered = await renderDraftVideo({ title, scenes, preset, quality, signal: controller.signal, onProgress: setProgress });
      if (controller.signal.aborted || !mountedRef.current) return;
      setPreview({ ...rendered, url: URL.createObjectURL(rendered.blob) });
      toast.success("Quick draft preview is ready.");
    } catch (error) {
      if (mountedRef.current && !(error instanceof Error && error.name === "AbortError")) toast.error(error instanceof Error ? error.message : "Could not create the browser draft preview.");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        if (mountedRef.current) setProgress(null);
      }
    }
  };

  const downloadPreview = () => {
    if (!preview) return;
    downloadRenderedDraft(preview);
    toast.success(`Downloaded ${preview.filename}.`);
  };

  const clearPreview = () => {
    if (!preview) return;
    URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const cancelPreview = () => controllerRef.current?.abort();

  const isGenerating = progress !== null;
  return <div className="w-full space-y-3 sm:w-auto">
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="quick-draft-quality">Quick draft quality</label>
      <select id="quick-draft-quality" value={quality} onChange={(event) => setQuality(event.target.value as DraftQuality)} disabled={isGenerating} className="h-9 rounded-lg border border-white/10 bg-slate-950/60 px-2 text-xs text-white">
        {Object.entries(draftQualityProfiles).map(([value, profile]) => <option key={value} value={value}>{profile.label} · {profile.description}</option>)}
      </select>
      <Button type="button" onClick={createPreview} disabled={isGenerating || !scenes.length} variant="outline" className="border-cyan-200/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20">
        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
        {isGenerating ? `Generating ${progress}%` : preview ? "Regenerate preview" : "Preview quick draft"}
      </Button>
      {isGenerating && <Button type="button" onClick={cancelPreview} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/10"><X className="mr-1.5 h-3.5 w-3.5" />Cancel</Button>}
    </div>
    {isGenerating && <div className="space-y-1.5" aria-live="polite"><div className="flex justify-between text-[10px] uppercase tracking-[.12em] text-cyan-100"><span>Rendering WebM locally</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Quick draft rendering progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0}><div className="h-full rounded-full bg-cyan-300 transition-[width] duration-200" style={{ width: `${progress ?? 0}%` }} /></div></div>}
    {preview && <div className="overflow-hidden rounded-xl border border-cyan-200/15 bg-slate-950/55 p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p className="flex items-center gap-1.5 text-xs font-medium text-cyan-100"><Sparkles className="h-3.5 w-3.5" />Quick draft preview</p><p className="mt-0.5 text-[10px] text-slate-500">{preview.sceneCount} scenes · {preview.durationSeconds.toFixed(1)} seconds · browser-local WebM</p></div><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={clearPreview} className="border-white/10 text-slate-300 hover:bg-white/10"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Discard</Button><Button type="button" size="sm" onClick={downloadPreview} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Download className="mr-1.5 h-3.5 w-3.5" />Download WebM</Button></div></div><video className="w-full rounded-lg bg-black" controls playsInline preload="metadata" src={preview.url}>Your browser cannot preview this WebM draft.</video></div>}
  </div>;
}
