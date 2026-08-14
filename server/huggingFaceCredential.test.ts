import { describe, expect, it } from "vitest";

describe("Hugging Face credential", () => {
  it("authenticates to the official account endpoint", async () => {
    const token = process.env.HF_TOKEN;
    expect(token, "HF_TOKEN must be configured before public provider calls are enabled.").toBeTruthy();
    const response = await fetch("https://huggingface.co/api/whoami-v2", { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    expect(response.status, "HF_TOKEN must be a valid Hugging Face token.").toBe(200);
    const identity = await response.json() as { name?: unknown };
    expect(typeof identity.name).toBe("string");
  }, 20_000);
});
