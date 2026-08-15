import { QuickDraftExportButton } from "@/components/QuickDraftExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DraftPreset, DraftScene } from "@/lib/draftVideoExport";
import { ArrowLeft, Clapperboard, FileVideo2, LockKeyhole, Sparkles, Wand2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";

const starterScript = "Introduce the idea with a concise, clear opening. Explain the core value in one memorable point. Show the practical outcome the audience can expect. End with a focused call to action.";

const presets: Array<{ value: DraftPreset; label: string; detail: string }> = [
  { value: "youtube_1080p", label: "Landscape", detail: "16:9 · presentations and YouTube" },
  { value: "vertical_1080x1920", label: "Vertical", detail: "9:16 · shorts and stories" },
  { value: "square_1080", label: "Square", detail: "1:1 · feed posts" },
];

function makeGuestScenes(script: string): DraftScene[] {
  const fragments = script
    .trim()
    .split(/\n+|(?<=[.!?])\s+/)
    .map(fragment => fragment.trim())
    .filter(Boolean)
    .slice(0, 8);
  return fragments.map((voiceover, index) => ({
    id: `guest_scene_${index + 1}`,
    duration: 3,
    voiceover,
    visualPrompt: `A clean cinematic editorial scene illustrating: ${voiceover}`,
    onscreenText: voiceover.length > 92 ? `${voiceover.slice(0, 89)}…` : voiceover,
  }));
}

export default function GuestQuickDraft() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("My browser-local draft");
  const [script, setScript] = useState(starterScript);
  const [preset, setPreset] = useState<DraftPreset>("vertical_1080x1920");
  const scenes = useMemo(() => makeGuestScenes(script), [script]);

  return <main className="min-h-screen overflow-x-hidden bg-[#070b16] text-white">
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="absolute -bottom-52 right-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/10 blur-[140px]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
    </div>
    <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Workspace sign-in</button>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-300/[.07] px-3 py-1.5 text-xs text-emerald-100"><LockKeyhole className="h-3.5 w-3.5" />No account · no upload · no persistence</div>
      </header>

      <section className="grid gap-8 pb-10 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/[.08] px-3 py-1.5 text-xs font-medium uppercase tracking-[.14em] text-cyan-100"><Clapperboard className="h-3.5 w-3.5" />Guest quick draft</div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-[-.05em] text-white md:text-6xl">Create a WebM video draft in your browser.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">Turn a short script into an editable, browser-rendered video storyboard. It runs locally on this device: no sign-in, API key, upload, or saved project is required.</p>
        </div>
        <div className="rounded-3xl border border-amber-200/15 bg-amber-300/[.045] p-5 shadow-2xl shadow-black/20">
          <div className="flex gap-3"><FileVideo2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-100" /><div><p className="font-medium text-amber-50">Guest drafts are visual previews.</p><p className="mt-1 text-sm leading-6 text-slate-400">They render designed scene cards and are intentionally silent. Sign in only when you need saved productions, approved natural-voice synthesis, private high-fidelity MP4 rendering, collaboration, or publishing.</p></div></div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-2xl shadow-black/20 md:p-7">
          <div className="flex items-center gap-2 text-cyan-100"><Wand2 className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.16em]">Local storyboard input</span></div>
          <div className="mt-6 grid gap-5">
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-200">Draft title</span><Input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="A clear video title" className="h-11 border-white/10 bg-slate-950/60 text-white placeholder:text-slate-600" /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-200">Script or scene notes</span><Textarea value={script} onChange={event => setScript(event.target.value)} placeholder="Write a few sentences. Each sentence becomes a scene card." className="min-h-52 border-white/10 bg-slate-950/60 text-white placeholder:text-slate-600" /><span className="mt-2 block text-xs text-slate-500">Sentences and separate lines become up to eight scene cards. Content stays in this page and is not saved.</span></label>
            <fieldset><legend className="mb-2 block text-sm font-medium text-slate-200">Frame</legend><div className="grid gap-2 sm:grid-cols-3">{presets.map(option => <button key={option.value} type="button" onClick={() => setPreset(option.value)} aria-pressed={preset === option.value} className={`rounded-xl border p-3 text-left transition ${preset === option.value ? "border-cyan-200/40 bg-cyan-300/[.11]" : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-white/[.04]"}`}><span className="block text-sm font-medium text-slate-100">{option.label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{option.detail}</span></button>)}</div></fieldset>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-200" /><h2 className="text-sm font-semibold text-white">Draft plan</h2></div><p className="mt-1 text-xs leading-5 text-slate-500">A maximum of 24 seconds is rendered locally for a fast review loop.</p><div className="mt-5 space-y-2">{scenes.length ? scenes.map((scene, index) => <div key={scene.id} className="rounded-xl border border-white/7 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-cyan-200">Scene {String(index + 1).padStart(2, "0")}</span><span className="text-[10px] text-slate-500">3 sec</span></div><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-300">{scene.onscreenText}</p></div>) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-500">Add at least one sentence to create a local draft plan.</p>}</div></div>
          <div className="rounded-3xl border border-cyan-200/15 bg-cyan-300/[.055] p-5"><p className="text-sm font-medium text-cyan-100">Ready to create</p><p className="mt-1 text-xs leading-5 text-slate-400">Choose a local quality profile, generate an in-browser preview, then download your WebM.</p><div className="mt-4"><QuickDraftExportButton title={title || "guest-draft"} scenes={scenes} preset={preset} /></div></div>
          <Button type="button" onClick={() => setLocation("/")} variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/[.06]">Sign in to save or produce at higher fidelity</Button>
        </aside>
      </section>
    </div>
  </main>;
}
