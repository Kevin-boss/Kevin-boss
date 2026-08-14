import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const ACTIVE_WORKSPACE_KEY = "content-os.active-workspace";

export function useWorkspace() {
  const query = trpc.workspace.bootstrap.useQuery();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(() => {
    const value = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    return value ? Number(value) : null;
  });

  useEffect(() => {
    if (!query.data) return;
    const available = query.data.workspaces;
    const exists = available.some(item => item.workspace.id === activeWorkspaceId);
    if (!exists) setActiveWorkspaceId(query.data.current.workspace.id);
  }, [activeWorkspaceId, query.data]);

  const active = query.data?.workspaces.find(item => item.workspace.id === activeWorkspaceId) ?? query.data?.current;
  const selectWorkspace = (workspaceId: number) => {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, String(workspaceId));
    setActiveWorkspaceId(workspaceId);
  };

  return { ...query, active, activeWorkspaceId: active?.workspace.id ?? null, selectWorkspace };
}
