import { Button } from "@/components/ui/button";
import { ChevronDown, Command, Plus, Sparkles } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useLocation } from "wouter";

export function PageHeader({ eyebrow, title, description, actionLabel, actionPath }: { eyebrow: string; title: string; description: string; actionLabel?: string; actionPath?: string }) {
  const { active, data, selectWorkspace } = useWorkspace();
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0b1020]/85 px-5 py-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/75">{eyebrow}</p>
          <h1 className="text-xl font-semibold tracking-[-0.025em] text-white md:text-2xl">{title}</h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-slate-400 lg:block">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-300 lg:flex">
            <span className="text-slate-500">Workspace</span>
            <select value={active?.workspace.id ?? ""} onChange={event => selectWorkspace(Number(event.target.value))} className="max-w-32 bg-transparent font-medium text-white outline-none">
              {data?.workspaces.map(item => <option className="bg-slate-900" value={item.workspace.id} key={item.workspace.id}>{item.workspace.name}</option>)}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </label>
          <Button variant="outline" size="sm" className="hidden border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/10 hover:text-white md:flex" onClick={() => setLocation("/copilot")}>
            <Command className="mr-1.5 h-3.5 w-3.5" /> Copilot
          </Button>
          {actionLabel && actionPath ? <Button size="sm" className="bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(103,232,249,.18)] hover:bg-cyan-200" onClick={() => setLocation(actionPath)}><Plus className="mr-1.5 h-3.5 w-3.5" />{actionLabel}</Button> : <Button size="sm" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => setLocation("/studio")}><Sparkles className="mr-1.5 h-3.5 w-3.5" />Create</Button>}
        </div>
      </div>
    </header>
  );
}
