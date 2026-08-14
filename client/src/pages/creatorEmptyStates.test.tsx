// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => {
  const trpcNode = (): any => new Proxy({}, {
    get: (_target, property) => {
      if (property === "useQuery") return () => {
        const data = Object.assign([], { sources: [], claims: [], citations: [] });
        return { data, isLoading: false, isError: false, refetch: vi.fn() };
      };
      if (property === "useMutation") return () => ({ isPending: false, mutateAsync: vi.fn(), mutate: vi.fn() });
      if (property === "useUtils") return () => ({});
      return trpcNode();
    },
  });
  return { trpc: trpcNode() };
});
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3, active: { workspace: { id: 3 } }, isLoading: false }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title, description }: { title: string; description: string }) => <header><h1>{title}</h1><p>{description}</p></header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: () => <select aria-label="Project"><option>Select a project</option></select> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("creator workspace empty states", () => {
  const pages = [
    ["Script Studio", () => import("./ScriptStudio"), "Your scene plan will appear here"],
    ["Research", () => import("./Research"), "No source material yet"],
    ["Media Library", () => import("./AssetLibrary"), "No assets match this library view"],
    ["Scene editor", () => import("./TimelineEditor"), "Select a project to open its scene timeline"],
    ["Voice and captions", () => import("./VoiceCaptions"), "No voices have been approved"],
    ["Jobs", () => import("./Jobs"), "No jobs have been created in this workspace"],
    ["Action-only Copilot", () => import("./Copilot"), "No Copilot actions yet"],
  ] as const;

  it.each(pages)("renders the %s title and a safe empty state", async (_name, loadPage, emptyMessage) => {
    const { default: Page } = await loadPage();
    const markup = renderToStaticMarkup(<Page />);
    expect(markup).toContain(emptyMessage);
    expect(markup).not.toContain("undefined");
  });

  const guardedForms = [
    ["Script Studio", () => import("./ScriptStudio"), "Generate structured script"],
    ["Research", () => import("./Research"), "Add source"],
    ["Media Library", () => import("./AssetLibrary"), "Generate and save"],
    ["Voice and captions", () => import("./VoiceCaptions"), "Transcribe and generate subtitles"],
    ["Action-only Copilot", () => import("./Copilot"), "Execute as a tool action"],
  ] as const;

  it.each(guardedForms)("keeps the %s project-dependent control disabled without a selected project", async (_name, loadPage, label) => {
    const { default: Page } = await loadPage();
    const markup = renderToStaticMarkup(<Page />);
    expect(markup).toMatch(new RegExp(`<button[^>]*disabled=\"\"[^>]*>[\\s\\S]*?${label}`));
  });
});
