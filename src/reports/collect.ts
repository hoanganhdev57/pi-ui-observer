import type { UiAdapter } from "../adapters/adapter.js";
import { buildUiAudit, type UiAudit } from "./audit.js";
import { writeArtifact } from "./artifacts.js";

export const DEFAULT_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 768, height: 900 },
  { width: 414, height: 896 },
  { width: 375, height: 812 },
  { width: 320, height: 700 },
] as const;

export interface CollectedAudit extends UiAudit {
  viewports: Array<{ width: number; height: number; documentWidth?: number; horizontalOverflow: boolean; screenshot?: string }>;
}

export async function collectAudit(adapter: UiAdapter, options: { responsive?: boolean; persistScreenshots?: boolean } = {}): Promise<CollectedAudit> {
  const initial = await adapter.currentPage();
  const responsive = options.responsive ?? false;
  const sizes = responsive ? [...DEFAULT_VIEWPORTS] : [initial.viewport];
  const viewports: CollectedAudit["viewports"] = [];
  let capturedScreenshot = false;
  try {
    for (const size of sizes) {
      if (responsive) await adapter.setViewport(size);
      const measurement = await adapter.audit();
      const screenshot = await adapter.screenshot();
      let path: string | undefined;
      capturedScreenshot ||= screenshot.bytes instanceof Uint8Array;
      if (options.persistScreenshots !== false && screenshot.bytes instanceof Uint8Array) {
        path = (await writeArtifact(`audit-${Date.now()}-${size.width}x${size.height}`, { kind: "screenshot", bytes: screenshot.bytes })).path;
      }
      viewports.push({ width: size.width, height: size.height, documentWidth: typeof measurement.documentWidth === "number" ? measurement.documentWidth : undefined, horizontalOverflow: measurement.horizontalOverflow === true, screenshot: path });
    }
  } finally {
    if (responsive) await adapter.setViewport(initial.viewport);
  }
  const [snapshot, consoleReport, networkReport] = await Promise.all([adapter.snapshot(), adapter.console(), adapter.network()]);
  const report = buildUiAudit({ snapshot, screenshot: capturedScreenshot ? true : null, console: Array.isArray(consoleReport.entries) ? consoleReport.entries : [], network: Array.isArray(networkReport.requests) ? networkReport.requests : [] });
  for (const viewport of viewports) {
    if (viewport.horizontalOverflow) report.findings.push({ severity: "fail", message: `Horizontal overflow at ${viewport.width}px (document: ${viewport.documentWidth ?? "unknown"}px).`, evidence: viewport.screenshot ? [viewport.screenshot] : [] });
  }
  return { ...report, viewports };
}
