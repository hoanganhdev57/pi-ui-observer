import { describe, expect, it, vi } from "vitest";
import { collectAudit, DEFAULT_VIEWPORTS } from "../src/reports/collect.js";
import type { UiAdapter } from "../src/adapters/adapter.js";

it("keeps artifacts from consecutive audits distinct even in the same millisecond", async () => {
  const adapter = {
    currentPage: async () => ({ url: "http://127.0.0.1:3000", title: "Demo", viewport: { width: 1280, height: 720 } }),
    audit: async () => ({}), screenshot: async () => ({ bytes: Buffer.from("fixture") }),
    snapshot: async () => ({ nodes: [] }), console: async () => ({ entries: [] }), network: async () => ({ requests: [] }),
  } as unknown as UiAdapter;
  const clock = vi.spyOn(Date, "now").mockReturnValue(123);
  try {
    const first = await collectAudit(adapter);
    const second = await collectAudit(adapter);
    expect(first.viewports[0].screenshot).not.toBe(second.viewports[0].screenshot);
  } finally { clock.mockRestore(); }
});

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
