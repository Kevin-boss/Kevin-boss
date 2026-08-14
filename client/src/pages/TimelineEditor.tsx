import { PageHeader } from "@/components/PageHeader";
import { ProjectPicker } from "@/components/ProjectPicker";
import { QuickDraftExportButton } from "@/components/QuickDraftExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Captions, Clapperboard, Download, Film, Loader2, Music2, Play, Save, Settings2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Scene = {
  id: string;
  duration: number;
  voiceover: string;
  visualPrompt: string;
  broll: string;
  onscreenText: string;
  transition: string;
  music: string;
  soundEffect: string;
};

type Track = {
  type: "video" | "scene" | "audio" | "broll" | "voice" | "music" | "sfx" | "captions" | "overlay";
  position: number;
  configuration: Record<string, unknown>;
};

const fallbackTracks: Track[] = [
  { type: "scene", position: 0, configuration: { label: "Scenes" } },
  { type: "video", position: 1, configuration: { label: "Video" } },
  { type: "audio", position: 2, configuration: { label: "Audio" } },
  { type: "captions", position: 3, configuration: { label: "Captions" } },
  { type: "overlay", position: 4, configuration: { label: "Overlays" } },
];

export default function TimelineEditor() {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftScenes, setDraftScenes] = useState<Scene[]>([]);
  const [draftTracks, setDraftTracks] = useState<Track[]>([]);
  const [preset, setPreset] = useState<"youtube_1080p" | "vertical_1080x1920" | "square_1080">("youtube_1080p");
  const [downloadAssetId, setDownloadAssetId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const project = trpc.project.get.useQuery({ projectId: projectId ?? 0 }, { enabled: Boolean(projectId) });
  const script = trpc.production.script.get.useQuery({ projectId: projectId ?? 0 }, { enabled: Boolean(projectId) });
  const editor = trpc.production.editor.get.useQuery({ projectId: projectId ?? 0 }, { enabled: Boolean(projectId) });
  const exportsQuery = trpc.production.exports.list.useQuery({ projectId: projectId ?? 0 }, { enabled: Boolean(projectId), refetchInterval: 5000 });
  const save = trpc.production.editor.save.useMutation();
  const render = trpc.production.render.request.useMutation();
  const download = trpc.production.exports.download.useQuery({ assetId: downloadAssetId ?? 0 }, { enabled: Boolean(downloadAssetId) });

  const scriptScenes = ((script.data?.[0]?.content as { scenes?: Scene[] } | undefined)?.scenes ?? []);
  const document = editor.data?.projectDocument as { scenes?: Scene[]; tracks?: Track[] } | undefined;
  const scenes = draftScenes.length ? draftScenes : (document?.scenes ?? scriptScenes);
  const tracks = draftTracks.length ? draftTracks : (document?.tracks ?? fallbackTracks);
  const selected = scenes.find((scene) => scene.id === selectedId) ?? scenes[0];
  const duration = scenes.reduce((total, scene) => total + scene.duration, 0);

  useEffect(() => {
    setDraftScenes([]);
    setDraftTracks([]);
    setSelectedId(null);
    setDownloadAssetId(null);
    setDirty(false);
  }, [projectId]);

  useEffect(() => {
    if (!download.data?.url) return;
    window.open(download.data.url, "_blank", "noopener,noreferrer");
    setDownloadAssetId(null);
  }, [download.data]);

  const updateSelected = (patch: Partial<Scene>) => {
    if (!selected) return;
    setDraftScenes((current) => (current.length ? current : scenes).map((scene) => scene.id === selected.id ? { ...scene, ...patch } : scene));
    setDirty(true);
  };

  const requestRender = async () => {
    if (!projectId || !editor.data?.id) return;
    try {
      const result = await render.mutateAsync({ projectId, versionId: editor.data.id, preset });
      toast.success(result.available ? result.message : "Render queued but no worker is configured yet.");
      await exportsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit render job.");
    }
  };

  const saveEditor = async () => {
    if (!projectId) return;
    try {
      await save.mutateAsync({ projectId, scenes, tracks, settings: { aspectRatio: "16:9", exportPreset: preset } });
      setDirty(false);
      toast.success("Timeline changes saved to the current video version.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save editor changes.");
    }
  };

  const addTrack = () => {
    const type = window.prompt("Track type: scene, video, audio, broll, voice, music, sfx, captions, or overlay", "overlay") as Track["type"] | null;
    const accepted = ["scene", "video", "audio", "broll", "voice", "music", "sfx", "captions", "overlay"];
    if (!type || !accepted.includes(type)) return;
    setDraftTracks((current) => [...(current.length ? current : tracks), { type, position: tracks.length, configuration: { label: type } }]);
    setDirty(true);
  };

  const moveTrack = (index: number, direction: -1 | 1) => {
    const reordered = [...(draftTracks.length ? draftTracks : tracks)];
    const target = index + direction;
    if (target < 0 || target >= reordered.length) return;
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setDraftTracks(reordered.map((track, position) => ({ ...track, position })));
    setDirty(true);
  };

  const removeTrack = (position: number) => {
    setDraftTracks((current) => (current.length ? current : tracks).filter((track) => track.position !== position).map((track, index) => ({ ...track, position: index })));
    setDirty(true);
  };

  return <div className="min-h-full bg-[#0b1020]">
    <PageHeader eyebrow="Post-production" title="Scene editor" description="Edit your scene manifest, then download an immediate browser-rendered draft or submit a final MP4 to a private worker." />
    <div className="mx-auto max-w-[1600px] space-y-5 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-sm"><ProjectPicker projectId={projectId} onChange={setProjectId} /></div>
        {projectId && <Button disabled={save.isPending || !scenes.length || !dirty} onClick={saveEditor} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save timeline</Button>}
      </div>
      {!projectId ? <EmptyEditor /> : <>
        <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <Card className="overflow-hidden border-white/7 bg-slate-950/50 shadow-none"><CardContent className="p-0">
            <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,.18),transparent_28%),linear-gradient(125deg,#151b33,#070a12)]"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10 pl-0.5"><Play className="h-5 w-5 fill-white text-white" /></div><p className="mt-4 text-sm font-medium text-white">{project.data?.project.title}</p><p className="mt-1 text-xs text-slate-500">Quick drafts use your active scene manifest.</p></div></div>
            <div className="flex items-center justify-between border-t border-white/7 px-5 py-3 text-xs text-slate-400"><span>00:00</span><div className="mx-5 h-1 flex-1 rounded-full bg-white/10"><div className="h-full w-0 rounded-full bg-cyan-300" /></div><span>{duration.toFixed(1)}s</span></div>
          </CardContent></Card>
          <Card className="border-white/7 bg-white/[.03] shadow-none"><CardContent className="p-5"><div className="flex items-center gap-2 text-slate-200"><Settings2 className="h-4 w-4 text-cyan-200" /><span className="font-medium">Scene properties</span></div>{selected ? <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Duration (s)"><Input type="number" min="0.1" step="0.1" value={selected.duration} onChange={(event) => updateSelected({ duration: Number(event.target.value) })} className="border-white/10 bg-slate-950/60 text-white" /></Field><Field label="Transition"><Input value={selected.transition} onChange={(event) => updateSelected({ transition: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field></div><Field label="Voiceover"><Textarea value={selected.voiceover} onChange={(event) => updateSelected({ voiceover: event.target.value })} className="min-h-20 border-white/10 bg-slate-950/60 text-white" /></Field><Field label="Visual prompt"><Textarea value={selected.visualPrompt} onChange={(event) => updateSelected({ visualPrompt: event.target.value })} className="min-h-20 border-white/10 bg-slate-950/60 text-white" /></Field><Field label="On-screen text"><Input value={selected.onscreenText} onChange={(event) => updateSelected({ onscreenText: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field><div className="grid grid-cols-3 gap-2 text-xs"><Info icon={Captions} label="Captions" value="Word-timed layer" /><Info icon={Music2} label="Music" value={selected.music || "Not set"} /><Info icon={Volume2} label="SFX" value={selected.soundEffect || "Not set"} /></div></div> : <p className="mt-5 text-xs leading-5 text-slate-500">Select a scene below to edit its properties.</p>}</CardContent></Card>
        </section>
        <Card className="border-cyan-300/10 bg-cyan-300/[.035] shadow-none"><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Film className="h-4 w-4 text-cyan-200" /><h2 className="font-medium text-white">Video export</h2></div><p className="mt-1 max-w-2xl text-xs text-slate-500">Download a browser-rendered WebM draft now, without any worker or credentials. Private-worker rendering remains available for final MP4 exports.</p></div><div className="flex flex-wrap items-center gap-2"><select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)} className="h-9 rounded-lg border border-white/10 bg-slate-950/60 px-2 text-xs text-white"><option value="youtube_1080p">Landscape · 1080p</option><option value="vertical_1080x1920">Vertical · 1080 × 1920</option><option value="square_1080">Square · 1080</option></select><QuickDraftExportButton title={project.data?.project.title ?? "AI Content OS draft"} scenes={scenes} preset={preset} /><Button type="button" onClick={requestRender} disabled={render.isPending || !editor.data?.id} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{render.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}Render MP4</Button></div></div>{exportsQuery.data?.length ? <div className="mt-4 space-y-2">{exportsQuery.data.map((item) => <div className="flex items-center justify-between gap-3 rounded-lg border border-white/7 bg-slate-950/35 p-3" key={item.id}><div><p className="text-xs font-medium text-slate-200">{item.title}</p><p className="mt-1 text-[10px] text-slate-500">Completed export · {new Date(item.createdAt).toLocaleString()}</p></div><Button type="button" size="sm" variant="outline" onClick={() => setDownloadAssetId(item.id)} className="border-cyan-200/20 bg-transparent text-cyan-100 hover:bg-cyan-300/10"><Download className="mr-1.5 h-3.5 w-3.5" />Download</Button></div>)}</div> : <p className="mt-4 text-xs text-slate-600">Quick drafts download directly to this device. Completed private-worker MP4 exports appear here when configured.</p>}</CardContent></Card>
        <Card className="border-white/7 bg-white/[.03] shadow-none"><CardContent className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium text-white">Track routing</h2><p className="mt-1 text-xs text-slate-500">Add, reorder, or remove persisted production tracks.</p></div><Button type="button" variant="outline" onClick={addTrack} className="border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10">Add track</Button></div><div className="space-y-2">{tracks.map((track, index) => <div className="flex items-center gap-2 rounded-lg border border-white/7 bg-slate-950/35 p-2" key={`${track.type}-${track.position}`}><span className="flex-1 text-xs capitalize text-slate-300">{track.type} <span className="text-slate-600">· {String(track.configuration.label ?? "track")}</span></span><Button type="button" size="sm" variant="ghost" onClick={() => moveTrack(index, -1)} disabled={index === 0} className="h-7 px-2 text-slate-400">↑</Button><Button type="button" size="sm" variant="ghost" onClick={() => moveTrack(index, 1)} disabled={index === tracks.length - 1} className="h-7 px-2 text-slate-400">↓</Button><Button type="button" size="sm" variant="ghost" onClick={() => removeTrack(track.position)} className="h-7 px-2 text-rose-200">Remove</Button></div>)}</div></CardContent></Card>
        <Card className="border-white/7 bg-white/[.03] shadow-none"><CardContent className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium text-white">Timeline</h2><p className="mt-1 text-xs text-slate-500">Select a scene, edit its properties, then save the current version.</p></div><span className="text-xs text-slate-500">{scenes.length} scenes</span></div>{scenes.length ? <div className="space-y-3">{scenes.map((scene) => <button type="button" onClick={() => setSelectedId(scene.id)} className={`grid w-full grid-cols-[90px_1fr] items-center gap-3 rounded-lg p-1 text-left ${selected?.id === scene.id ? "bg-cyan-300/8" : ""}`} key={scene.id}><span className="text-xs text-slate-500">{scene.id}</span><div className="flex h-11 gap-1 overflow-hidden rounded-lg bg-slate-950/60 p-1"><span className="flex min-w-14 flex-1 items-center rounded bg-violet-400/70 px-3 text-[10px] text-slate-950" style={{ flexGrow: scene.duration }}>{scene.duration.toFixed(1)}s</span></div></button>)}</div> : <div className="flex min-h-36 items-center justify-center text-xs text-slate-600">Generate a script to populate scenes.</div>}</CardContent></Card>
      </>}
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs text-slate-400">{label}</span>{children}</label>; }
function Info({ icon: Icon, label, value }: { icon: typeof Settings2; label: string; value: string }) { return <div className="rounded-xl border border-white/7 bg-slate-950/35 p-3"><Icon className="h-4 w-4 text-cyan-200" /><p className="mt-2 text-slate-300">{label}</p><p className="mt-0.5 text-slate-500">{value}</p></div>; }
function EmptyEditor() { return <Card className="grid min-h-[500px] place-items-center border-white/7 bg-white/[.025] shadow-none"><CardContent className="text-center"><Clapperboard className="mx-auto h-7 w-7 text-slate-600" /><p className="mt-4 text-sm text-slate-400">Select a project to open its scene timeline.</p></CardContent></Card>; }
