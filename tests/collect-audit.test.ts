import { describe, expect, it } from "vitest";
import { collectAudit, DEFAULT_VIEWPORTS } from "../src/reports/collect.js";
import type { UiAdapter } from "../src/adapters/adapter.js";

it("does not claim a screenshot when adapter returns no image", async () => {
  const adapter = {
    currentPage: async () => ({ url: "http://127.0.0.1:3000", title: "Demo", viewport: { width: 1280, height: 720 } }),
    audit: async () => ({}),
    screenshot: async () => ({}),
    snapshot: async () => ({ nodes: [] }),
    console: async () => ({ entries: [] }),
    network: async () => ({ requests: [] }),
  } as unknown as UiAdapter;
  const report = await collectAudit(adapter, { persistScreenshots: false });
  expect(report.evidence.hasScreenshot).toBe(false);
});

it("audits five default widths and restores initial viewport", async () => {
  let viewport = { width: 1024, height: 768 };
  const adapter = {
    currentPage: async () => ({ url: "http://127.0.0.1:3000", title: "Demo", viewport }),
    setViewport: async (v: typeof viewport) => { viewport = v; return { viewport }; },
    audit: async () => ({ viewport, horizontalOverflow: viewport.width === 320 }),
    snapshot: async () => ({ nodes: [] }),
    screenshot: async () => ({ bytes: Buffer.from("fixture") }),
    console: async () => ({ entries: [] }),
    network: async () => ({ requests: [] }),
  } as unknown as UiAdapter;
  const audit = await collectAudit(adapter, { responsive: true, persistScreenshots: false });
  expect(audit.viewports.map((v) => v.width)).toEqual(DEFAULT_VIEWPORTS.map((v) => v.width));
  expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "fail", message: expect.stringContaining("320") }));
  expect(viewport).toEqual({ width: 1024, height: 768 });
});
