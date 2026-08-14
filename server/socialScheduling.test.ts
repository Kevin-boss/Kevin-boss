import { describe, expect, it } from "vitest";
import { toUtcHeartbeatCron } from "./socialScheduling";

describe("social scheduling", () => {
  it("converts a scheduled instant to the supported six-field UTC callback expression", () => {
    expect(toUtcHeartbeatCron(new Date("2026-10-03T14:05:00.000Z"))).toBe("0 5 14 3 10 *");
  });
});
