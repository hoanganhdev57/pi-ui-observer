import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeArtifact } from "../src/reports/artifacts.js";
import { buildUiAudit } from "../src/reports/audit.js";

describe("UI evidence reports", () => {
  it("writes a bounded artifact manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "ui-observer-"));
    const result = await writeArtifact("run-1", { kind: "screenshot", bytes: Buffer.from("png") }, root);
    expect(result.path).toContain("run-1");
    expect(JSON.parse(await readFile(result.manifestPath, "utf8"))).toMatchObject({ runId: "run-1", kind: "screenshot" });
  });

  it("marks missing browser evidence as a warning rather than a pass", () => {
    const audit = buildUiAudit({ snapshot: null, screenshot: null, console: [], network: [] });
    expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "warn" }));
  });
});
