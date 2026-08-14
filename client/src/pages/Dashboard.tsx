import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Clapperboard, Clock3, FolderKanban, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusTone: Record<string, string> = { idea: "bg-slate-700/70 text-slate-200", scripting: "bg-violet-400/15 text-violet-200", generating: "bg-cyan-400/15 text-cyan-200", editing: "bg-amber-300/15 text-amber-100", ready: "bg-emerald-400/15 text-emerald-200", scheduled: "bg-blue-400/15 text-blue-200", published: "bg-emerald-400/15 text-emerald-200", failed: "bg-rose-400/15 text-rose-200" };

export default function Dashboard() {
  const { activeWorkspaceId, active, isLoading } = useWorkspace();
  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery({ workspaceId: activeWorkspaceId ?? 0 }, { enabled: Boolean(activeWorkspaceId) });
  const { data: jobs } = trpc.production.jobs.list.useQuery({ workspaceId: activeWorkspaceId ?? 0 }, { enabled: Boolean(activeWorkspaceId), refetchInterval: 5000 });
  const createProject = trpc.project.create.useMutation();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submitProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeWorkspaceId) return;
    try {
      const result = await createProject.mutateAsync({ workspaceId: activeWorkspaceId, title, description: description || undefined });
      await utils.project.list.invalidate({ workspaceId: activeWorkspaceId });
      setCreating(false); setTitle(""); setDescription("");
      toast.success("Project created. Continue in Script Studio.");
      setLocation(`/studio?project=${result.projectId}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create the project."); }
  };

  const activeJobs = jobs?.filter(job => ["queued", "processing", "retrying"].includes(job.status)) ?? [];
  return <div className="min-h-full bg-[#0b1020] text-slate-100">
    <PageHeader eyebrow={active?.organization.name ?? "Loading studio"} title="Your content command center" description="Create, review, publish, and learn from every production in one precise workflow." actionLabel="New production" actionPath="/studio" />
    <div className="mx-auto max-w-[1600px] space-y-7 p-5 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-200/10 bg-[radial-gradient(circle_at_82%_0%,rgba(34,211,238,.17),transparent_33%),radial-gradient(circle_at_15%_95%,rgba(124,58,237,.22),transparent_39%),linear-gradient(130deg,#141c35_0%,#101629_62%,#0c1120_100%)] p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="relative z-10 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-200/80">Production OS</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">From a raw idea to a distribution-ready video.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Start a new production, let the script and research workspaces build the brief, then keep control over every scene, asset, caption, and publishing decision.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => setCreating(true)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Sparkles className="mr-2 h-4 w-4" />Create from a prompt</Button><Button onClick={() => setLocation("/projects")} variant="outline" className="border-white/10 bg-white/[.04] text-white hover:bg-white/[.09]">Open projects <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-cyan-300/10" /><div className="pointer-events-none absolute right-16 top-16 h-44 w-44 rounded-full border border-violet-300/10" />
      </section>

      {creating && <section className="rounded-2xl border border-cyan-300/25 bg-slate-900/90 p-5 shadow-xl shadow-black/25"><form className="grid gap-4 md:grid-cols-[1fr_1.6fr_auto] md:items-end" onSubmit={submitProject}><label><span className="mb-1.5 block text-xs font-medium text-slate-300">Production title</span><Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Cybersecurity explained" className="border-white/10 bg-slate-950/70 text-white placeholder:text-slate-600" required /></label><label><span className="mb-1.5 block text-xs font-medium text-slate-300">Brief</span><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A concise working brief for your team" className="min-h-10 border-white/10 bg-slate-950/70 text-white placeholder:text-slate-600 md:min-h-10" /></label><div className="flex gap-2"><Button type="button" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setCreating(false)}>Cancel</Button><Button disabled={createProject.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button></div></form></section>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Active productions", value: projects?.filter(item => item.status !== "archived").length ?? 0, detail: "Across this workspace", icon: FolderKanban, color: "text-violet-200 bg-violet-400/10" }, { label: "Jobs in motion", value: activeJobs.length, detail: "Queued or processing", icon: Wand2, color: "text-cyan-200 bg-cyan-400/10" }, { label: "Ready to review", value: projects?.filter(item => item.status === "ready").length ?? 0, detail: "Quality checked", icon: Clapperboard, color: "text-emerald-200 bg-emerald-400/10" }, { label: "Publishing queue", value: projects?.filter(item => item.status === "scheduled").length ?? 0, detail: "Awaiting a schedule", icon: Clock3, color: "text-amber-100 bg-amber-300/10" }].map(metric => <Card key={metric.label} className="border-white/7 bg-white/[.035] shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-400">{metric.label}</p><p className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white">{isLoading || projectsLoading ? "—" : metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></div><span className={`rounded-xl p-2.5 ${metric.color}`}><metric.icon className="h-4 w-4" /></span></div></CardContent></Card>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]"><Card className="border-white/7 bg-white/[.03] shadow-none"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-white/7 px-5 py-4"><div><h3 className="font-medium text-white">Recent productions</h3><p className="mt-1 text-xs text-slate-500">The current status for each active project.</p></div><Button variant="ghost" className="text-cyan-200 hover:bg-cyan-300/10 hover:text-cyan-100" onClick={() => setLocation("/projects")}>View all</Button></div>{projects?.length ? <div className="divide-y divide-white/6">{projects.slice(0, 6).map(project => <button key={project.id} onClick={() => setLocation(`/studio?project=${project.id}`)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[.035]"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-400/25 to-cyan-300/15 text-violet-100"><Clapperboard className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-100">{project.title}</p><p className="mt-1 truncate text-xs text-slate-500">{project.description || "No production brief yet"}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${statusTone[project.status] || statusTone.idea}`}>{project.status}</span><ArrowRight className="h-4 w-4 text-slate-600" /></button>)}</div> : <div className="px-5 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[.05]"><Plus className="h-5 w-5 text-cyan-200" /></div><h4 className="mt-4 font-medium text-white">No productions yet</h4><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Create a production to open your script, research, visual, and publishing workflow.</p><Button className="mt-5 bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => setCreating(true)}>Create your first production</Button></div>}</CardContent></Card>
      <Card className="border-white/7 bg-white/[.03] shadow-none"><CardContent className="p-0"><div className="border-b border-white/7 px-5 py-4"><h3 className="font-medium text-white">Job activity</h3><p className="mt-1 text-xs text-slate-500">Live execution state with recovery controls.</p></div>{jobs?.length ? <div className="divide-y divide-white/6">{jobs.slice(0, 5).map(job => <div className="px-5 py-3.5" key={job.id}><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium capitalize text-slate-200">{job.type.replace(/_/g, " ")}</p><span className={`text-[11px] capitalize ${job.status === "failed" ? "text-rose-300" : job.status === "completed" ? "text-emerald-300" : "text-cyan-200"}`}>{job.status}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${job.progress}%` }} /></div></div>)}</div> : <div className="px-5 py-12 text-center text-sm text-slate-500">Jobs will appear here when you generate content, assets, or captions.</div>}</CardContent></Card></section>
    </div>
  </div>;
}
