import { Button } from "@/components/ui/button";
import { downloadDraftVideo, type DraftPreset, type DraftScene } from "@/lib/draftVideoExport";
import { Download, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export function QuickDraftExportButton({ title, scenes, preset }: { title: string; scenes: DraftScene[]; preset: DraftPreset }) {
  const [progress, setProgress] = useState<number | null>(null);
  const downloadQuickDraft = async () => {
    try {
      setProgress(0);
      const result = await downloadDraftVideo({ title, scenes, preset, onProgress: setProgress });
      toast.success(`Downloaded ${result.filename}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the browser draft video.");
    } finally {
      setProgress(null);
    }
  };

  return <Button type="button" onClick={downloadQuickDraft} disabled={progress !== null || !scenes.length} variant="outline" className="border-cyan-200/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20">{progress !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{progress !== null ? `Creating ${progress}%` : "Download quick draft"}</Button>;
}
