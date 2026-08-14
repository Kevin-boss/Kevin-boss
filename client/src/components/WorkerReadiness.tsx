import React from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, ServerCog } from "lucide-react";

export function WorkerReadiness() {
  const health = trpc.operations.health.useQuery(undefined, { retry: false });
  const workers = health.data?.privateWorkers;
  const line = (label: string, worker?: { endpointConfigured: boolean; tokenConfigured: boolean; ready: boolean }) => {
    const status = health.isError ? "administrator access required" : !worker ? "checking status" : worker.ready ? "ready" : worker.endpointConfigured && !worker.tokenConfigured ? "token required" : worker.endpointConfigured ? "endpoint configured" : "not configured";
    const ready = worker?.ready && !health.isError;
    return <div className="flex items-center justify-between gap-3" key={label}><span>{label}</span><span className={`inline-flex items-center gap-1 ${ready ? "text-emerald-200" : health.isError ? "text-amber-100" : "text-slate-500"}`}>{ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{status}</span></div>;
  };
  return <div className="mx-auto max-w-[1500px] px-5 pt-5 md:px-8"><div className="rounded-2xl border border-white/8 bg-white/[.025] p-4 text-xs text-slate-400"><div className="flex items-center gap-2 text-slate-200"><ServerCog className="h-4 w-4 text-violet-200" /><span className="font-medium">Private worker readiness</span></div><p className="mt-1 leading-5 text-slate-500">Administrator-only status. Endpoint URLs and tokens are never displayed in the browser.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{line("Natural-voice TTS", workers?.tts)}{line("Final MP4 render", workers?.render)}</div></div></div>;
}
