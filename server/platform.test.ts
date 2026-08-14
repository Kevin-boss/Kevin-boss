import { describe, expect, it } from "vitest";

const roles = ["owner", "admin", "editor", "reviewer", "viewer", "client"] as const;
const editableRoles = new Set(["owner", "admin", "editor"]);
const reviewableRoles = new Set(["owner", "admin", "editor", "reviewer", "client"]);

describe("platform authorization model", () => {
  it("permits only edit-capable roles to mutate production content", () => {
    expect(roles.filter(role => editableRoles.has(role))).toEqual(["owner", "admin", "editor"]);
    expect(editableRoles.has("reviewer")).toBe(false);
    expect(editableRoles.has("client")).toBe(false);
  });

  it("allows review-capable client roles to participate in approvals without edit rights", () => {
    expect(reviewableRoles.has("client")).toBe(true);
    expect(editableRoles.has("client")).toBe(false);
  });
});
