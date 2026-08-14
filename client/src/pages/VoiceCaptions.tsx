import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { ProjectPicker } from "@/components/ProjectPicker";
import { useWorkspace } from "@/hooks/useWorkspace";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Captions, CheckCircle2, FileAudio, Loader2, Mic2, SlidersHorizontal, Volume2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type Segment = { start: number; end: number; text: string };

export default function VoiceCaptions() {
  const { activeWorkspaceId } = useWorkspace();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [gender, setGender] = useState<"male" | "female" | "neutral" | undefined>();
  const [tone, setTone] = useState("");
  const [accent, setAccent] = useState("");
  const [speed, setSpeed] = useState("");
  const [emotion, setEmotion] = useState("");
  const [captionStyle, setCaptionStyle] = useState<"minimal" | "karaoke" | "boxed" | "broadcast">("minimal");
  const [result, setResult] = useState<{ transcript: string; segments: Segment[]; srt: string; vtt: string } | null>(null);
  const [reviewedSegments, setReviewedSegments] = useState<Segment[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [speechText, setSpeechText] = useState("A short approved voice sample for this production.");
  const [speechResult, setSpeechResult] = useState<{ url: string; assetId: number } | null>(null);
  const [synthesisSpeed, setSynthesisSpeed] = useState("1");
  const [deliveryEmotion, setDeliveryEmotion] = useState("");

  const voices = trpc.production.voice.list.useQuery(
    { workspaceId: activeWorkspaceId ?? 0, language, gender, tone: tone || undefined, accent: accent || undefined, speed: speed || undefined, emotion: emotion || undefined },
    { enabled: Boolean(activeWorkspaceId) },
  );
  const transcribe = trpc.production.voice.transcribe.useMutation();
  const synthesize = trpc.production.voice.synthesize.useMutation();
  const selectedVoice = voices.data?.find((voice) => voice.id === selectedVoiceId) ?? null;

  const submitTranscription = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return toast.error("Select a project first.");
    try {
      const value = await transcribe.mutateAsync({ projectId, audioUrl, language, title: "Project transcript", captionStyle });
      setResult(value);
      setReviewedSegments(value.segments);
      toast.success("Transcript and subtitle files are ready for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transcription failed.");
    }
  };

  const submitSynthesis = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return toast.error("Select a project first.");
    if (!selectedVoice) return toast.error("Select an approved voice first.");
    if (!selectedVoice.providerId) return toast.error("The selected voice does not have a ready approved TTS provider.");
    if (!speechText.trim()) return toast.error("Enter text for the approved voice.");
    try {
      const usesPublicModelDefaultVoice = selectedVoice.provider === "huggingface";
      const value = await synthesize.mutateAsync({ projectId, providerId: selectedVoice.providerId, voiceId: selectedVoice.providerVoiceId, text: speechText.trim(), language, speed: usesPublicModelDefaultVoice ? 1 : Number(synthesisSpeed), emotion: usesPublicModelDefaultVoice ? undefined : deliveryEmotion.trim() || undefined });
      setSpeechResult(value);
      toast.success("Approved voice audio is ready for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice synthesis failed.");
    }
  };

  const reviewedSrt = reviewedSegments.map((segment, index) => `${index + 1}\n${captionTime(segment.start)} --> ${captionTime(segment.end)}\n${segment.text.trim()}\n`).join("\n");
  const reviewedVtt = `WEBVTT\n\n${reviewedSegments.map(segment => `${captionTime(segment.start).replace(",", ".")} --> ${captionTime(segment.end).replace(",", ".")}\n${segment.text.trim()}\n`).join("\n")}`;
  const download = (name: string, value: string, type: string) => {
    const url = URL.createObjectURL(new Blob([value], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-[#0b1020]">
      <PageHeader eyebrow="Voice & accessibility" title="Voice and captions" description="Select permitted voices, synthesize approved narration, transcribe source audio, and export word-timed subtitles." />
      <div className="mx-auto grid max-w-[1600px] gap-6 p-5 md:p-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <Card className="border-white/7 bg-white/[.035] shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-cyan-200"><FileAudio className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.15em]">Transcription</span></div>
              <form className="mt-5 space-y-4" onSubmit={submitTranscription}>
                <ProjectPicker projectId={projectId} onChange={setProjectId} />
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Audio URL</span><Input required type="url" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://…/source-audio.mp3" className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-600" /></label>
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Spoken language</span><select value={language} onChange={e => setLanguage(e.target.value as "en" | "fr")} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none"><option value="en">English</option><option value="fr">Français</option></select></label>
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Caption style</span><select value={captionStyle} onChange={e => setCaptionStyle(e.target.value as typeof captionStyle)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm capitalize text-white outline-none">{["minimal", "karaoke", "boxed", "broadcast"].map(style => <option key={style} value={style}>{style}</option>)}</select></label>
                <Button disabled={!projectId || transcribe.isPending} className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{transcribe.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Captions className="mr-2 h-4 w-4" />}Transcribe and generate subtitles</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="border-violet-300/15 bg-violet-300/[.035] shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-violet-200"><Volume2 className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.15em]">Approved voice synthesis</span></div>
              <form className="mt-4 space-y-3" onSubmit={submitSynthesis}>
                <div className="rounded-lg border border-white/8 bg-slate-950/35 p-3 text-xs text-slate-400" aria-live="polite">
                  {selectedVoice ? <><span className="font-medium text-slate-200">{selectedVoice.name}</span><span className="block pt-1">{selectedVoice.providerId ? `Ready provider #${selectedVoice.providerId}` : "No enabled commercial-use provider matches this voice yet."}</span></> : "Choose an approved voice from the catalog to enable synthesis."}
                </div>
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Narration text</span><textarea value={speechText} onChange={event => setSpeechText(event.target.value)} maxLength={12000} className="min-h-28 w-full rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-300/60" /></label>
                {selectedVoice && selectedVoice.provider !== "huggingface" && <div className="grid grid-cols-2 gap-3 rounded-lg border border-violet-200/12 bg-violet-300/[.035] p-3"><label className="block"><span className="mb-1.5 block text-[11px] text-slate-400">Delivery speed</span><select aria-label="Narration delivery speed" value={synthesisSpeed} onChange={event => setSynthesisSpeed(event.target.value)} className="h-9 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 text-xs text-white outline-none"><option value="0.8">Measured · 0.8×</option><option value="0.9">Calm · 0.9×</option><option value="1">Natural · 1.0×</option><option value="1.1">Energetic · 1.1×</option><option value="1.2">Fast · 1.2×</option></select></label><label className="block"><span className="mb-1.5 block text-[11px] text-slate-400">Delivery direction</span><Input aria-label="Narration delivery emotion" value={deliveryEmotion} onChange={event => setDeliveryEmotion(event.target.value)} maxLength={80} placeholder="Warm, confident…" className="h-9 border-white/10 bg-slate-950/60 text-xs text-white placeholder:text-slate-600" /></label><p className="col-span-2 text-[10px] leading-4 text-slate-500">Controls are sent only to an approved private worker. Consent and commercial-use enforcement still apply to every request.</p></div>}
                {selectedVoice?.provider === "huggingface" && <p className="rounded-lg bg-cyan-300/7 p-2 text-[11px] leading-4 text-cyan-100">This public-provider route uses the registered model-default voice. It intentionally ignores private-worker delivery controls.</p>}
                <Button disabled={!projectId || !selectedVoice?.providerId || !speechText.trim() || synthesize.isPending} className="w-full bg-violet-300 text-slate-950 hover:bg-violet-200">{synthesize.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}Synthesize approved voice</Button>
              </form>
              {speechResult && <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-emerald-100"><CheckCircle2 className="h-4 w-4" />Audio asset #{speechResult.assetId} is ready</div><audio controls className="w-full" src={speechResult.url}>Your browser cannot play this audio preview.</audio></div>}
            </CardContent>
          </Card>
          <p className="px-2 text-xs leading-5 text-slate-500">Transcription accepts pre-uploaded audio URLs. Voice synthesis only runs for a workspace voice that has both verified commercial consent and an enabled, allowed provider.</p>
        </aside>
        <main className="space-y-5">
          <Card className="border-white/7 bg-white/[.025] shadow-none">
            <CardContent className="p-0">
              <div className="flex flex-col gap-4 border-b border-white/7 p-5 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-medium text-white">Voice catalog</h2><p className="mt-1 text-xs text-slate-500">Filterable provider registry for permitted workspace voices. Selecting a voice never bypasses provider or consent checks.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Voice gender" value={gender ?? "all"} onChange={e => setGender(e.target.value === "all" ? undefined : e.target.value as typeof gender)} className="h-8 rounded-lg border border-white/10 bg-slate-950/60 px-2 text-xs capitalize text-white outline-none"><option value="all">All genders</option><option value="female">Female</option><option value="male">Male</option><option value="neutral">Neutral</option></select><Input aria-label="Voice tone filter" value={tone} onChange={e => setTone(e.target.value)} placeholder="Tone" className="h-8 w-20 border-white/10 bg-slate-950/60 text-xs text-white placeholder:text-slate-600" /><Input aria-label="Voice accent filter" value={accent} onChange={e => setAccent(e.target.value)} placeholder="Accent" className="h-8 w-20 border-white/10 bg-slate-950/60 text-xs text-white placeholder:text-slate-600" /><Input aria-label="Voice speed filter" value={speed} onChange={e => setSpeed(e.target.value)} placeholder="Speed" className="h-8 w-20 border-white/10 bg-slate-950/60 text-xs text-white placeholder:text-slate-600" /><Input aria-label="Voice emotion filter" value={emotion} onChange={e => setEmotion(e.target.value)} placeholder="Emotion" className="h-8 w-24 border-white/10 bg-slate-950/60 text-xs text-white placeholder:text-slate-600" /><SlidersHorizontal className="h-4 w-4 self-center text-slate-500" /></div></div>
              {voices.isLoading ? <div className="grid min-h-52 place-items-center text-center" role="status" aria-live="polite"><div><Loader2 className="mx-auto h-5 w-5 animate-spin text-cyan-200" /><p className="mt-3 text-sm text-slate-400">Loading approved workspace voices…</p></div></div> : voices.data?.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{voices.data.map(voice => <div className={`rounded-xl border p-4 transition-colors ${selectedVoiceId === voice.id ? "border-violet-300/60 bg-violet-300/8" : "border-white/7 bg-slate-950/35"}`} key={voice.id}><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-400/12"><Mic2 className="h-4 w-4 text-violet-200" /></div><div><p className="text-sm font-medium text-slate-200">{voice.name}</p><p className="text-[10px] uppercase tracking-wide text-slate-500">{voice.language} · {voice.gender}</p></div></div><p className="mt-4 text-xs text-slate-500">{voice.tone || "No tone profile"} · {voice.accent || "Unspecified accent"}</p><div className="mt-3 flex items-center justify-between gap-2"><span className={`inline-block rounded px-1.5 py-1 text-[10px] ${voice.commercialUse === "allowed" ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-200/10 text-amber-100"}`}>{voice.commercialUse === "allowed" ? "Commercial use allowed" : "License review required"}</span>{voice.providerId ? <Button type="button" variant="outline" size="sm" aria-pressed={selectedVoiceId === voice.id} onClick={() => { setSelectedVoiceId(voice.id); setSpeechResult(null); }} className="h-7 border-violet-200/20 px-2 text-[11px] text-violet-100 hover:bg-violet-200/10">{selectedVoiceId === voice.id ? "Selected" : "Choose voice"}</Button> : <span className="inline-flex items-center gap-1 text-[10px] text-amber-100"><AlertCircle className="h-3 w-3" />Provider unavailable</span>}</div></div>)}</div> : <div className="grid min-h-52 place-items-center text-center"><div><Mic2 className="mx-auto h-5 w-5 text-slate-600" /><p className="mt-3 text-sm text-slate-500">No voices have been approved for this workspace.</p><p className="mt-1 text-xs text-slate-600">Add provider-backed voices through the administrative registry before use.</p></div></div>}
            </CardContent>
          </Card>
          <Card className="border-white/7 bg-white/[.025] shadow-none"><CardContent className="p-0"><div className="border-b border-white/7 p-5"><h2 className="font-medium text-white">Caption review</h2><p className="mt-1 text-xs text-slate-500">Word-level timing is preserved with the transcript for animated caption styling.</p></div>{result ? <div className="p-5"><p className="mb-4 text-xs text-slate-500">Review and correct each timed segment before exporting captions.</p><div className="space-y-2">{reviewedSegments.map((segment, index) => <div className="grid gap-2 rounded-lg border border-white/7 bg-slate-950/35 p-3 sm:grid-cols-[120px_1fr]" key={`${segment.start}-${index}`}><span className="text-[11px] text-cyan-200">{captionTime(segment.start)} – {captionTime(segment.end)}</span><Input value={segment.text} onChange={e => setReviewedSegments(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: e.target.value } : item))} className="border-white/10 bg-slate-950/60 text-sm text-white" /></div>)}</div><div className="mt-6 flex flex-wrap gap-3"><Button type="button" variant="outline" className="border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10" onClick={() => download("captions.srt", reviewedSrt, "application/x-subrip")}>Download reviewed SRT</Button><Button type="button" variant="outline" className="border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10" onClick={() => download("captions.vtt", reviewedVtt, "text/vtt")}>Download reviewed VTT</Button></div></div> : <div className="grid min-h-48 place-items-center text-center"><div><Captions className="mx-auto h-5 w-5 text-slate-600" /><p className="mt-3 text-sm text-slate-500">Your transcript and exports will appear here.</p></div></div>}</CardContent></Card>
        </main>
      </div>
    </div>
  );
}

function captionTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}
