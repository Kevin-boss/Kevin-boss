import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { ProjectPicker } from "@/components/ProjectPicker";
import { useWorkspace } from "@/hooks/useWorkspace";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, FilePenLine, LayoutList, Loader2, Send, ShieldCheck, Sparkles, Unplug, XCircle } from "lucide-react";
import React, { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const platforms = ["youtube", "tiktok", "facebook", "instagram", "linkedin", "x"] as const;
type Platform = (typeof platforms)[number];
type CalendarMode = "calendar" | "agenda";

const platformLabels: Record<Platform, string> = { youtube: "YouTube", tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X" };
const platformColors: Record<Platform, string> = { youtube: "bg-red-300/15 text-red-100", tiktok: "bg-cyan-300/15 text-cyan-100", facebook: "bg-blue-300/15 text-blue-100", instagram: "bg-pink-300/15 text-pink-100", linkedin: "bg-sky-300/15 text-sky-100", x: "bg-slate-300/15 text-slate-100" };

export default function Publishing() {
  const { activeWorkspaceId } = useWorkspace();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [title, setTitle] = useState("");
  const [copy, setCopy] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [mode, setMode] = useState<CalendarMode>("calendar");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const posts = trpc.production.social.listPosts.useQuery({ workspaceId: activeWorkspaceId ?? 0 }, { enabled: Boolean(activeWorkspaceId) });
  const accounts = trpc.production.social.listAccounts.useQuery({ workspaceId: activeWorkspaceId ?? 0 }, { enabled: Boolean(activeWorkspaceId) });
  const create = trpc.production.social.createPost.useMutation();
  const adapt = trpc.production.script.generatePlatformCopy.useMutation();
  const disconnect = trpc.production.social.disconnectAccount.useMutation();
  const assignAccount = trpc.production.social.assignAccount.useMutation();
  const cancelDispatch = trpc.production.social.cancelDispatch.useMutation();
  const rescheduleDispatch = trpc.production.social.rescheduleDispatch.useMutation();

  const scheduledPosts = useMemo(() => (posts.data ?? []).filter(post => post.scheduledFor).sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()), [posts.data]);
  const monthLabel = calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const calendarDays = useMemo(() => buildCalendarDays(calendarCursor), [calendarCursor]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return toast.error("Select a project first.");
    try {
      await create.mutateAsync({ projectId, platform, title: title || undefined, copy: copy || undefined, scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined });
      await posts.refetch();
      setTitle("");
      setCopy("");
      setScheduledFor("");
      toast.success(scheduledFor ? "Approval-required publishing plan created." : "Platform-specific draft created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create publishing plan.");
    }
  };

  const generateAdaptation = async () => {
    if (!projectId) return toast.error("Select a project before generating platform copy.");
    try {
      const generated = await adapt.mutateAsync({ projectId, platform, language: "en" });
      setTitle(generated.title);
      setCopy([generated.caption, generated.hashtags.join(" ")].filter(Boolean).join("\n\n"));
      toast.success(`${platformLabels[platform]} adaptation generated for review.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate platform copy.");
    }
  };

  const disconnectAccount = async (accountId: number, accountName: string) => {
    if (!activeWorkspaceId) return;
    try {
      await disconnect.mutateAsync({ workspaceId: activeWorkspaceId, accountId });
      await Promise.all([accounts.refetch(), posts.refetch()]);
      toast.success(`${accountName} disconnected. Linked plans now require reassignment and approval.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect the social account.");
    }
  };

  const assignAccountToPost = async (postId: number, accountId: number) => {
    try {
      await assignAccount.mutateAsync({ postId, socialAccountId: accountId });
      await posts.refetch();
      toast.success("Connected account assigned. Approval is still required before dispatch.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign the connected account.");
    }
  };

  const cancelPlan = async (postId: number, planTitle: string) => {
    try {
      await cancelDispatch.mutateAsync({ postId });
      await posts.refetch();
      toast.success(`${planTitle} cancelled. It will not be dispatched.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the publishing plan.");
    }
  };

  const reschedulePlan = async (postId: number, scheduledFor: string) => {
    const nextSchedule = new Date(scheduledFor);
    if (Number.isNaN(nextSchedule.getTime())) return toast.error("Choose a valid future schedule time.");
    try {
      await rescheduleDispatch.mutateAsync({ postId, scheduledFor: nextSchedule });
      await posts.refetch();
      toast.success("Schedule updated. Approval and provider readiness remain enforced.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the plan schedule.");
    }
  };

  return (
    <div className="min-h-full bg-[#0b1020]">
      <PageHeader eyebrow="Distribution" title="Publishing control room" description="Adapt each production for its destination, review its provenance, and reserve an approval-aware publishing slot." />
      <div className="mx-auto max-w-[1600px] space-y-6 p-5 md:p-8">
        <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <Card className="border-white/7 bg-white/[.035] shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-cyan-200"><FilePenLine className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.16em]">Platform adaptation studio</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Generate a governed platform draft from the selected script, then edit it before creating a reviewable plan.</p>
              <form className="mt-5 space-y-4" onSubmit={submit}>
                <ProjectPicker projectId={projectId} onChange={setProjectId} />
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Destination</span><select value={platform} onChange={event => setPlatform(event.target.value as Platform)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none">{platforms.map(item => <option value={item} key={item}>{platformLabels[item]}</option>)}</select></label>
                <Button type="button" variant="outline" disabled={!projectId || adapt.isPending} onClick={generateAdaptation} className="w-full border-violet-200/25 bg-violet-300/7 text-violet-100 hover:bg-violet-300/14">{adapt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate platform adaptation</Button>
                <div className="rounded-lg border border-violet-200/12 bg-violet-300/[.035] p-3 text-[11px] leading-4 text-slate-400"><span className="font-medium text-violet-100">AI-generated draft boundary.</span> Generated title, caption, and hashtags remain editable and must be reviewed before a connected-account dispatch can occur.</div>
                <div className="rounded-lg border border-cyan-200/12 bg-cyan-300/[.035] p-3 text-[11px] leading-4 text-slate-400"><span className="font-medium text-cyan-100">Credentials on activation.</span> Create and review plans without credentials. When you choose to publish to one or more platforms, the required official credentials for those selected platforms are requested together, stored server-side, and validated before connection.</div>
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Title</span><Input value={title} onChange={event => setTitle(event.target.value)} placeholder={`${platformLabels[platform]} title`} className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-600" /></label>
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Caption / description</span><Textarea value={copy} onChange={event => setCopy(event.target.value)} placeholder="Caption, description, chapters, or hashtags…" className="min-h-32 border-white/10 bg-slate-950/60 text-white placeholder:text-slate-600" /></label>
                <label className="block"><span className="mb-1.5 block text-xs text-slate-400">Local schedule time (optional)</span><Input type="datetime-local" value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} className="border-white/10 bg-slate-950/60 text-white" /></label>
                <Button disabled={!projectId || create.isPending} className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}Save review-ready plan</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/7 bg-white/[.025] shadow-none">
            <CardContent className="p-0">
              <div className="flex flex-col gap-4 border-b border-white/7 p-5 md:flex-row md:items-center md:justify-between">
                <div><h2 className="font-medium text-white">Content calendar</h2><p className="mt-1 text-xs text-slate-500">A shared agenda for review-ready drafts, approval holds, and scheduled distribution.</p></div>
                <div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" aria-label="Previous month" onClick={() => setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="border-white/10 text-slate-200"><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-32 text-center text-sm font-medium text-slate-200">{monthLabel}</span><Button type="button" size="icon" variant="outline" aria-label="Next month" onClick={() => setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="border-white/10 text-slate-200"><ChevronRight className="h-4 w-4" /></Button><div className="ml-2 flex rounded-lg border border-white/10 bg-slate-950/50 p-1"><Button type="button" size="sm" variant={mode === "calendar" ? "secondary" : "ghost"} aria-pressed={mode === "calendar"} onClick={() => setMode("calendar")} className="h-7 px-2 text-xs"><CalendarDays className="mr-1 h-3.5 w-3.5" />Calendar</Button><Button type="button" size="sm" variant={mode === "agenda" ? "secondary" : "ghost"} aria-pressed={mode === "agenda"} onClick={() => setMode("agenda")} className="h-7 px-2 text-xs"><LayoutList className="mr-1 h-3.5 w-3.5" />Agenda</Button></div></div>
              </div>
              {mode === "calendar" ? <CalendarGrid days={calendarDays} posts={scheduledPosts} /> : <Agenda posts={scheduledPosts} accounts={accounts.data ?? []} assigning={assignAccount.isPending} onAssignAccount={assignAccountToPost} cancelling={cancelDispatch.isPending} onCancel={cancelPlan} rescheduling={rescheduleDispatch.isPending} onReschedule={reschedulePlan} />}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/7 bg-white/[.025] shadow-none"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-white/7 p-5"><div><h2 className="font-medium text-white">Connection readiness</h2><p className="mt-1 text-xs text-slate-500">Only connected official accounts can enter dispatch after approval.</p></div><span className="rounded-full bg-slate-300/8 px-2.5 py-1 text-[10px] text-slate-400">{accounts.data?.filter(account => account.connectionStatus === "connected").length ?? 0} connected</span></div>{accounts.data?.length ? <div className="divide-y divide-white/6">{accounts.data.map(account => <div className="flex items-center gap-3 p-5" key={account.id}><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-400/12"><Send className="h-4 w-4 text-violet-200" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium capitalize text-slate-200">{account.accountName}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{account.platform} · {account.connectionStatus.replace(/_/g, " ")}</p></div><div className="flex items-center gap-2">{account.connectionStatus === "connected" ? <><CheckCircle2 className="h-4 w-4 text-emerald-300" /><AlertDialog><AlertDialogTrigger asChild><Button type="button" size="sm" variant="outline" disabled={disconnect.isPending} className="border-amber-200/20 text-amber-100 hover:bg-amber-300/10"><Unplug className="mr-1.5 h-3.5 w-3.5" />Disconnect</Button></AlertDialogTrigger><AlertDialogContent className="border-white/10 bg-slate-950 text-slate-100"><AlertDialogHeader><AlertDialogTitle>Disconnect {account.accountName}?</AlertDialogTitle><AlertDialogDescription>Its credential reference will be removed locally. Any linked scheduled plans will require a new connected account and approval before they can dispatch.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={disconnect.isPending}>Keep connected</AlertDialogCancel><AlertDialogAction disabled={disconnect.isPending} onClick={() => disconnectAccount(account.id, account.accountName)} className="bg-amber-300 text-slate-950 hover:bg-amber-200">{disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}Disconnect account</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></> : <CircleAlert className="h-4 w-4 text-amber-100" />}</div></div>)}</div> : <div className="grid min-h-40 place-items-center text-center"><div><CircleAlert className="mx-auto h-5 w-5 text-slate-600" /><p className="mt-3 text-sm text-slate-500">No official accounts are connected.</p><p className="mt-1 text-xs text-slate-600">You can still prepare and review plans safely. Credentials are requested only when you choose to activate publishing for selected platforms.</p></div></div>}</CardContent></Card>
          <Card className="border-white/7 bg-white/[.025] shadow-none"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-white/7 p-5"><div><h2 className="font-medium text-white">Review queue</h2><p className="mt-1 text-xs text-slate-500">Plans remain transparent about approval and connection prerequisites.</p></div><ShieldCheck className="h-5 w-5 text-amber-100" /></div><div className="divide-y divide-white/6">{posts.data?.length ? posts.data.slice(0, 6).map(post => <PlanRow post={post} accounts={accounts.data ?? []} assigning={assignAccount.isPending} onAssignAccount={assignAccountToPost} cancelling={cancelDispatch.isPending} onCancel={cancelPlan} rescheduling={rescheduleDispatch.isPending} onReschedule={reschedulePlan} key={post.id} />) : <div className="grid min-h-40 place-items-center text-center"><div><ShieldCheck className="mx-auto h-5 w-5 text-slate-600" /><p className="mt-3 text-sm text-slate-500">No plans are awaiting review.</p></div></div>}</div></CardContent></Card>
        </section>
      </div>
    </div>
  );
}

function CalendarGrid({ days, posts }: { days: Date[]; posts: Array<{ id: number; platform: Platform; title: string | null; status: string; scheduledFor: Date | string | null }> }) {
  const today = new Date();
  return <div className="p-3"><div className="grid grid-cols-7 border-b border-white/7 pb-2 text-center text-[10px] font-medium uppercase tracking-[.12em] text-slate-500">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div><div className="grid grid-cols-7">{days.map(day => { const sameMonth = day.getMonth() === days[15].getMonth(); const isToday = sameDay(day, today); const dayPosts = posts.filter(post => post.scheduledFor && sameDay(new Date(post.scheduledFor), day)); return <div key={day.toISOString()} className={`min-h-28 border-b border-r border-white/6 p-2 ${sameMonth ? "bg-transparent" : "bg-slate-950/20"}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${isToday ? "bg-cyan-300 text-slate-950" : sameMonth ? "text-slate-300" : "text-slate-600"}`}>{day.getDate()}</span><div className="mt-2 space-y-1">{dayPosts.slice(0, 2).map(post => <div className={`truncate rounded px-1.5 py-1 text-[10px] ${platformColors[post.platform]}`} title={post.title ?? "Untitled platform post"} key={post.id}>{platformLabels[post.platform]} · {post.title || "Draft"}</div>)}{dayPosts.length > 2 && <p className="px-1 text-[10px] text-slate-500">+{dayPosts.length - 2} more</p>}</div></div>; })}</div></div>;
}

function Agenda({ posts, accounts, assigning, onAssignAccount, cancelling, onCancel, rescheduling, onReschedule }: { posts: Array<{ id: number; platform: Platform; title: string | null; copy: string | null; status: string; scheduledFor: Date | string | null; socialAccountId: number | null }>; accounts: Array<{ id: number; platform: Platform; accountName: string; connectionStatus: string }>; assigning: boolean; onAssignAccount: (postId: number, accountId: number) => void; cancelling: boolean; onCancel: (postId: number, planTitle: string) => void; rescheduling: boolean; onReschedule: (postId: number, scheduledFor: string) => void }) {
  return posts.length ? <div className="divide-y divide-white/6">{posts.map(post => <PlanRow post={post} accounts={accounts} assigning={assigning} onAssignAccount={onAssignAccount} cancelling={cancelling} onCancel={onCancel} rescheduling={rescheduling} onReschedule={onReschedule} key={post.id} />)}</div> : <div className="grid min-h-72 place-items-center text-center"><div><CalendarDays className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-3 text-sm text-slate-500">No scheduled plans in the current agenda.</p><p className="mt-1 text-xs text-slate-600">Create an approval-ready plan with a date to add it here.</p></div></div>;
}

function PlanRow({ post, accounts, assigning, onAssignAccount, cancelling, onCancel, rescheduling, onReschedule }: { post: { id: number; platform: Platform; title: string | null; copy: string | null; status: string; scheduledFor: Date | string | null; socialAccountId: number | null }; accounts: Array<{ id: number; platform: Platform; accountName: string; connectionStatus: string }>; assigning: boolean; onAssignAccount: (postId: number, accountId: number) => void; cancelling: boolean; onCancel: (postId: number, planTitle: string) => void; rescheduling: boolean; onReschedule: (postId: number, scheduledFor: string) => void }) {
  const tone = post.status === "awaiting_approval" ? "bg-amber-200/10 text-amber-100" : post.status === "published" ? "bg-emerald-300/10 text-emerald-100" : "bg-slate-300/8 text-slate-300";
  const matchingAccounts = accounts.filter(account => account.platform === post.platform && account.connectionStatus === "connected");
  const canCancel = !["published", "cancelled", "publishing"].includes(post.status);
  const planTitle = post.title || "Untitled platform post";
  const [rescheduleFor, setRescheduleFor] = useState(() => toLocalDateTimeInput(post.scheduledFor));
  return <div className="flex gap-4 p-5"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${platformColors[post.platform]}`}><Send className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-medium text-slate-200">{planTitle}</p><span className={`rounded-full px-2.5 py-1 text-[10px] capitalize ${tone}`}>{post.status.replace(/_/g, " ")}</span></div><p className="mt-1 text-xs text-slate-500">{platformLabels[post.platform]}{post.scheduledFor ? ` · ${new Date(post.scheduledFor).toLocaleString()}` : " · unscheduled draft"}</p>{post.copy && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{post.copy}</p>}{matchingAccounts.length > 0 && <label className="mt-3 block text-[11px] text-slate-500"><span className="mb-1 block">Connected {platformLabels[post.platform]} account</span><select aria-label={`Connected ${platformLabels[post.platform]} account for ${planTitle}`} value={post.socialAccountId ?? ""} disabled={assigning} onChange={event => { const accountId = Number(event.target.value); if (accountId) onAssignAccount(post.id, accountId); }} className="h-8 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 text-xs text-slate-200 outline-none disabled:opacity-60"><option value="">Select connected account</option>{matchingAccounts.map(account => <option value={account.id} key={account.id}>{account.accountName}</option>)}</select></label>}{canCancel && <><label className="mt-3 block text-[11px] text-slate-500"><span className="mb-1 block">Local schedule time</span><div className="flex gap-2"><Input aria-label={`Local schedule time for ${planTitle}`} type="datetime-local" value={rescheduleFor} onChange={event => setRescheduleFor(event.target.value)} disabled={rescheduling} className="h-8 border-white/10 bg-slate-950/60 text-xs text-white" /><Button type="button" size="sm" variant="outline" disabled={rescheduling || !rescheduleFor} onClick={() => onReschedule(post.id, rescheduleFor)} className="h-8 shrink-0 border-cyan-200/20 text-cyan-100 hover:bg-cyan-300/10">{rescheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save time"}</Button></div></label><AlertDialog><AlertDialogTrigger asChild><Button type="button" size="sm" variant="outline" disabled={cancelling} className="mt-3 border-rose-200/20 text-rose-100 hover:bg-rose-300/10"><XCircle className="mr-1.5 h-3.5 w-3.5" />Cancel plan</Button></AlertDialogTrigger><AlertDialogContent className="border-white/10 bg-slate-950 text-slate-100"><AlertDialogHeader><AlertDialogTitle>Cancel {planTitle}?</AlertDialogTitle><AlertDialogDescription>This stops any local queued attempt and removes its saved dispatch schedule. Published and in-flight plans cannot be cancelled here.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={cancelling}>Keep plan</AlertDialogCancel><AlertDialogAction disabled={cancelling} onClick={() => onCancel(post.id, planTitle)} className="bg-rose-300 text-slate-950 hover:bg-rose-200">{cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}Cancel plan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}</div></div>;
}

function toLocalDateTimeInput(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function buildCalendarDays(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function sameDay(left: Date, right: Date) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
