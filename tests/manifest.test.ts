import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("package manifest", () => {
  it("declares a global Pi package and resources", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("pi-ui-observer");
    expect(pkg.keywords).toContain("pi-package");
    expect(pkg.engines.node).toBe(">=22.19.0");
    expect(pkg.pi.extensions).toEqual(["extensions/ui-observer.ts"]);
    expect(pkg.pi.skills).toEqual(["skills"]);
  });
});
