import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { createJob, recordAudit, requireProjectAccess } from "./platform";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./platform", async importOriginal => {
  const actual = await importOriginal<typeof import("./platform")>();
  return { ...actual, createJob: vi.fn(), recordAudit: vi.fn(), requireProjectAccess: vi.fn() };
});

const user = { id: 7, openId: "copilot-user", email: "copilot@example.com", name: "Copilot User", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const ctx = { user, req: { protocol: "https", headers: {} } as any, res: {} as any };
const toolCall = (name: string, argumentsJson: string) => ({ choices: [{ message: { tool_calls: [{ function: { name, arguments: argumentsJson } }] } }] });

describe("executable Copilot actions", () => {
  const prepare = () => {
    vi.clearAllMocks();
    vi.mocked(requireProjectAccess).mockResolvedValue({ project: { id: 9, workspaceId: 3 } } as any);
    vi.mocked(createJob).mockResolvedValue(101);
    vi.mocked(recordAudit).mockResolvedValue(undefined as any);
    vi.mocked(getDb).mockResolvedValue({ insert: () => ({ values: async () => [{ insertId: 55 }] }) } as any);
  };

  it("queues a whitelisted action with parsed parameters and an auditable job", async () => {
    prepare();
    vi.mocked(invokeLLM).mockResolvedValue(toolCall("create_translation_job", '{"targetLanguage":"fr"}') as any);
    const result = await appRouter.createCaller(ctx).copilot.execute({ projectId: 9, command: "Translate this script to French" });
    expect(result).toMatchObject({ actionId: 55, jobId: 101, toolName: "create_translation_job", parameters: { targetLanguage: "fr" }, executionStatus: "queued" });
    expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ type: "translation", payload: expect.objectContaining({ tool: "create_translation_job" }) }));
  });

  it("requires approval for a publication plan rather than silently publishing", async () => {
    prepare();
    vi.mocked(invokeLLM).mockResolvedValue(toolCall("create_publication_plan", '{"platforms":["youtube"],"scheduleHint":"next week"}') as any);
    const result = await appRouter.createCaller(ctx).copilot.execute({ projectId: 9, command: "Plan a YouTube publication next week" });
    expect(result).toMatchObject({ toolName: "create_publication_plan", executionStatus: "awaiting_approval" });
    expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ type: "social_publish" }));
  });

  it("rejects non-executable, malformed, and non-whitelisted model tool output", async () => {
    prepare();
    const caller = appRouter.createCaller(ctx);
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: {} }] } as any);
    await expect(caller.copilot.execute({ projectId: 9, command: "Create something" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    vi.mocked(invokeLLM).mockResolvedValue(toolCall("create_translation_job", "not-json") as any);
    await expect(caller.copilot.execute({ projectId: 9, command: "Translate this" })).rejects.toThrow(/invalid action parameters/i);
    vi.mocked(invokeLLM).mockResolvedValue(toolCall("delete_everything", "{}") as any);
    await expect(caller.copilot.execute({ projectId: 9, command: "Delete everything" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
