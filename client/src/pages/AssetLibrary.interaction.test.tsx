// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({ createImage: { isPending: false, mutateAsync: vi.fn() }, refetch: vi.fn() }));

vi.mock("@/lib/trpc", () => {
  const mutation = (value = { isPending: false, mutateAsync: vi.fn() }) => ({ useMutation: () => value });
  return { trpc: { production: { assets: { list: { useQuery: () => ({ data: [], refetch: mocks.refetch }) }, folders: { list: { useQuery: () => ({ data: [], refetch: vi.fn() }) }, create: mutation() }, updateMetadata: mutation(), createImage: mutation(mocks.createImage), upload: mutation() } } } };
});
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ activeWorkspaceId: 3 }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("@/components/ProjectPicker", () => ({ ProjectPicker: ({ onChange }: { onChange: (id: number) => void }) => <button type="button" onClick={() => onChange(9)}>Select test project</button> }));
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>, CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Media Library image generation UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.createImage.isPending = false;
    mocks.createImage.mutateAsync.mockReset();
    mocks.refetch.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    const { default: AssetLibrary } = await import("./AssetLibrary");
    await act(async () => root.render(<AssetLibrary />));
    const projectButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Select test project"))!;
    await act(async () => projectButton.click());
    const prompt = container.querySelector("textarea")!;
    prompt.value = "A rights-aware testing visual";
  });

  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("requests an image and refreshes the rights-aware asset library on success", async () => {
    mocks.createImage.mutateAsync.mockResolvedValue({ assetId: 11 });
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Generate and save"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.createImage.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9, usage: "scene_visual" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Visual generated and saved with rights review status.");
  });

  it("reports image generation errors without clearing the selected project", async () => {
    mocks.createImage.mutateAsync.mockRejectedValue(new Error("Image provider unavailable"));
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Generate and save"))!;
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(mocks.createImage.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: 9 }));
    expect(toast.error).toHaveBeenCalledWith("Image provider unavailable");
  });
});
