import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/policy/redaction.js";

describe("secret redaction", () => {
  it("redacts secrets in headers and nested text", () => {
    const result = redactSecrets({
      headers: { Authorization: "Bearer secret", Cookie: "session=abc" },
      text: "token=abc123 jwt eyJabc.def.ghi",
    });
    const output = JSON.stringify(result);
    expect(output).not.toContain("secret");
    expect(output).not.toContain("session=abc");
    expect(output).not.toContain("abc123");
  });

  it("redacts configured environment values", () => {
    expect(redactSecrets("prefix PRIVATE suffix", ["PRIVATE"])).toBe("prefix [REDACTED] suffix");
  });
});
