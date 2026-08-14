// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ health: { data: undefined as any, isError: false } }));
vi.mock("@/lib/trpc", () => ({ trpc: { operations: { health: { useQuery: () => mocks.health } } } }));

import { WorkerReadiness } from "./WorkerReadiness";

describe("WorkerReadiness", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); root = undefined; container = undefined; mocks.health = { data: undefined, isError: false }; });

  it("distinguishes a configured endpoint that still needs a token", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.health = { data: { privateWorkers: { tts: { endpointConfigured: true, tokenConfigured: false, ready: false }, render: { endpointConfigured: false, tokenConfigured: false, ready: false } } }, isError: false };
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<WorkerReadiness />));
    expect(container.textContent).toContain("token required");
    expect(container.textContent).toContain("not configured");
  });

  it("does not misrepresent a forbidden health check as an unconfigured worker", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.health = { data: undefined, isError: true };
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root?.render(<WorkerReadiness />));
    expect(container.textContent).toContain("administrator access required");
  });
});
