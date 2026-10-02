export interface AuditInput {
  snapshot: unknown;
  screenshot: unknown;
  console: unknown[];
  network: unknown[];
  designContext?: string;
}

export interface AuditFinding {
  severity: "pass" | "warn" | "fail";
  message: string;
  evidence?: string[];
}

export interface UiAudit {
  findings: AuditFinding[];
  evidence: { hasSnapshot: boolean; hasScreenshot: boolean; consoleEntries: number; networkEntries: number };
  designContext?: string;
}

export function buildUiAudit(input: AuditInput): UiAudit {
  const findings: AuditFinding[] = [];
  const evidence = {
    hasSnapshot: input.snapshot !== null,
    hasScreenshot: input.screenshot !== null,
    consoleEntries: input.console.length,
    networkEntries: input.network.length,
  };
  if (!evidence.hasSnapshot || !evidence.hasScreenshot) {
    findings.push({ severity: "warn", message: "Browser evidence is incomplete; visual correctness cannot be confirmed." });
  } else {
    findings.push({ severity: "warn", message: "Screenshot and UI snapshot captured; review the image against the design before claiming visual correctness.", evidence: ["screenshot", "snapshot"] });
  }
  const consoleErrors = input.console.filter((entry) => typeof entry === "object" && entry !== null && "level" in entry && (entry as { level?: string }).level === "error");
  if (consoleErrors.length) findings.push({ severity: "fail", message: `${consoleErrors.length} console error(s) observed.`, evidence: ["console"] });
  const failedRequests = input.network.filter((entry) => typeof entry === "object" && entry !== null && "status" in entry && Number((entry as { status?: unknown }).status) >= 400);
  if (failedRequests.length) findings.push({ severity: "fail", message: `${failedRequests.length} HTTP error response(s) observed.`, evidence: ["network"] });
  const transportFailures = input.network.filter((entry) => typeof entry === "object" && entry !== null && "failure" in entry && Boolean((entry as { failure?: unknown }).failure));
  if (transportFailures.length) findings.push({ severity: "fail", message: `${transportFailures.length} network transport failure(s) observed.`, evidence: ["network"] });
  const blockedRequests = input.network.filter((entry) => typeof entry === "object" && entry !== null && "blocked" in entry && (entry as { blocked?: unknown }).blocked === true);
  if (blockedRequests.length) findings.push({ severity: "warn", message: `${blockedRequests.length} blocked outbound request(s) observed.`, evidence: ["network"] });
  return { findings, evidence, designContext: input.designContext };
}
