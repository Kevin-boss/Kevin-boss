import { useWorkspace } from "@/hooks/useWorkspace";
import { trpc } from "@/lib/trpc";

export function ProjectPicker({ projectId, onChange, label = "Project" }: { projectId: number | null; onChange: (projectId: number | null) => void; label?: string }) {
  const { activeWorkspaceId } = useWorkspace();
  const { data: projects } = trpc.project.list.useQuery({ workspaceId: activeWorkspaceId ?? 0 }, { enabled: Boolean(activeWorkspaceId) });
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      <select value={projectId ?? ""} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-cyan-300/60">
        <option value="">Select a project</option>
        {projects?.map(project => <option value={project.id} key={project.id}>{project.title}</option>)}
      </select>
    </label>
  );
}
