// @vitest-environment jsdom
import React, { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

vi.mock("./components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-workspace">{children}</div> }));
vi.mock("./pages/GuestQuickDraft", () => ({ default: () => <div data-testid="guest-draft">Guest browser-local draft</div> }));
vi.mock("./components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("./components/ui/tooltip", () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./contexts/ThemeContext", () => ({ ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe("App guest route", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); root = undefined; container = undefined; window.history.replaceState({}, "", "/"); });

  it("renders the anonymous quick-draft route without mounting the protected workspace layout", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    window.history.replaceState({}, "", "/quick-draft");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    const { default: App } = await import("./App");
    await act(async () => root?.render(<App />));
    expect(container.querySelector("[data-testid=guest-draft]")?.textContent).toContain("Guest browser-local draft");
    expect(container.querySelector("[data-testid=protected-workspace]")).toBeNull();
  });
});
