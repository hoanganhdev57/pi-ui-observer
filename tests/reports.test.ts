import { mkdtemp, readFile, stat } from "node:fs/promises";
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
    expect(result.path).toMatch(/screenshot\.png$/);
    expect(JSON.parse(await readFile(result.manifestPath, "utf8"))).toMatchObject({ runId: "run-1", kind: "screenshot" });
  });

  it("marks missing browser evidence as a warning rather than a pass", () => {
    const audit = buildUiAudit({ snapshot: null, screenshot: null, console: [], network: [] });
    expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "warn" }));
  });

  it("stores default artifacts outside the project workspace", async () => {
    const output = await writeArtifact(`default-${Date.now()}`, { kind: "screenshot", bytes: Buffer.from("png") });
    expect(output.path).toContain(join(tmpdir(), "pi-ui-observer-"));
    if (process.platform !== "win32") {
      expect((await stat(output.path)).mode & 0o077).toBe(0);
      expect((await stat(join(output.path, ".."))).mode & 0o077).toBe(0);
    }
  });

  it("reports failed transport requests without HTTP status", () => {
    const audit = buildUiAudit({ snapshot: {}, screenshot: {}, console: [], network: [{ url: "http://127.0.0.1/api", failure: "net::ERR_CONNECTION_REFUSED" }] });
    expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "fail", message: expect.stringContaining("transport") }));
  });

  it("reports blocked or failed browser requests", () => {
    const audit = buildUiAudit({ snapshot: {}, screenshot: {}, console: [], network: [{ url: "https://example.com", blocked: true }] });
    expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "warn", message: expect.stringContaining("blocked") }));
  });

  it("never equates capture with visual correctness", () => {
    const audit = buildUiAudit({ snapshot: { nodes: [] }, screenshot: { bytes: Buffer.from("png") }, console: [], network: [] });
    expect(audit.findings).not.toContainEqual(expect.objectContaining({ severity: "pass" }));
    expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "warn", message: expect.stringContaining("review") }));
  });
});
