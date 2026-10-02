import { describe, expect, it } from "vitest";
import { defaultHostPolicy, isAllowedHost } from "../src/policy/hosts.js";
import { requiresApproval } from "../src/policy/approval.js";

describe("observation policy", () => {
  it("allows localhost but rejects an external host by default", () => {
    expect(isAllowedHost("http://localhost:3000", defaultHostPolicy)).toBe(true);
    expect(isAllowedHost("http://127.0.0.1:5000", defaultHostPolicy)).toBe(true);
    expect(isAllowedHost("https://example.com", defaultHostPolicy)).toBe(false);
    expect(isAllowedHost("file:///C:/Users/Admin/private.txt", defaultHostPolicy)).toBe(false);
    expect(isAllowedHost("ftp://localhost/private", defaultHostPolicy)).toBe(false);
  });

  it("requires approval only for side-effecting actions", () => {
    expect(requiresApproval("read")).toBe(false);
    expect(requiresApproval("interaction")).toBe(true);
    expect(requiresApproval("destructive")).toBe(true);
  });
});
