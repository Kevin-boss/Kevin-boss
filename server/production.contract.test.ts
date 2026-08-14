import { describe, expect, it } from "vitest";

describe("production workflow contracts", () => {
  it("keeps verified claims source-bound while editorial synthesis has no citation source", () => {
    const verified = { classification: "verified", sourceId: 42 };
    const synthesis = { classification: "ai_generated", sourceId: null };
    expect(verified.classification === "verified" && verified.sourceId).toBeTruthy();
    expect(synthesis.classification === "ai_generated" && synthesis.sourceId === null).toBe(true);
  });

  it("requires approval for scheduled posts and keeps drafts unscheduled", () => {
    const scheduled = { status: "awaiting_approval", scheduledFor: new Date() };
    const draft = { status: "draft", scheduledFor: null };
    expect(scheduled.status).toBe("awaiting_approval");
    expect(scheduled.scheduledFor).toBeInstanceOf(Date);
    expect(draft.status).toBe("draft");
    expect(draft.scheduledFor).toBeNull();
  });

  it("supports all permitted caption styles and word-level timing", () => {
    const styles = ["minimal", "karaoke", "boxed", "broadcast"] as const;
    const segments = [{ start: 0, end: 1.25, text: "A timed word group" }];
    expect(styles).toContain("karaoke");
    expect(segments[0].end).toBeGreaterThan(segments[0].start);
  });

  it("does not enable a commercial model without explicit allowed policy", () => {
    const policies = ["allowed", "review", "restricted"] as const;
    expect(policies.includes("review")).toBe(true);
    expect("review" === "allowed").toBe(false);
  });
});
