import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { redactSecrets } from "./policy/redaction.js";
import { collectAudit } from "./reports/collect.js";
import { writeArtifact } from "./reports/artifacts.js";
import type { UiSessionManager } from "./session/manager.js";

interface RegistrationApi {
  registerTool(definition: Record<string, unknown>): void;
  registerCommand(name: string, definition: Record<string, unknown>): void;
  registerMcpServer?(name: string, config: Record<string, unknown>): void;
  unregisterMcpServer?(name: string): void;
}

interface ToolContext {
  ui?: { confirm?: (title: string, message: string) => Promise<boolean>; notify?: (message: string, level: string) => void };
}

function result(value: unknown) {
  const safe = redactSecrets(value);
  const text = JSON.stringify(safe, null, 2);
  return { content: [{ type: "text", text: text.length > 60_000 ? text.slice(0, 60_000) + "\n[TRUNCATED]" : text }], details: { preview: text.slice(0, 4_000) } };
}

export function registerUiObserver(pi: RegistrationApi, manager?: UiSessionManager): void {
  let browserToolsConnected = false;
  const executeRead = async (operation: (session: UiSessionManager) => Promise<unknown>) => {
    if (!manager) throw new Error("UI session manager is not initialized");
    return result(await operation(manager));
  };

  const tools = [
    { name: "ui_current_page", description: "Read the current browser page.", parameters: Type.Object({}), execute: () => executeRead((s) => s.adapter().currentPage()) },
    { name: "ui_snapshot", description: "Read the accessibility and DOM snapshot.", parameters: Type.Object({}), execute: () => executeRead((s) => s.adapter().snapshot()) },
    { name: "ui_screenshot", description: "Capture a screenshot of the current UI.", parameters: Type.Object({ fullPage: Type.Optional(Type.Boolean()) }), execute: async (_id: string, params: { fullPage?: boolean }) => {
      if (!manager) return result({ error: "UI session manager is not initialized" });
      const screenshot = await manager.adapter().screenshot(params);
      if (!(screenshot.bytes instanceof Uint8Array)) return result({ error: "Adapter did not return PNG bytes" });
      const artifact = await writeArtifact(`capture-${randomUUID()}`, { kind: "screenshot", bytes: screenshot.bytes });
      return { content: [
        { type: "text", text: `Screenshot saved: ${artifact.path}` },
        { type: "image", mimeType: "image/png", data: Buffer.from(screenshot.bytes).toString("base64") },
      ], details: { path: artifact.path } };
    } },
    { name: "ui_console", description: "Read browser console entries.", parameters: Type.Object({}), execute: () => executeRead((s) => s.adapter().console()) },
    { name: "ui_network", description: "Read browser network activity.", parameters: Type.Object({}), execute: () => executeRead((s) => s.adapter().network()) },
    { name: "ui_styles", description: "Read computed styles and layout for an element.", parameters: Type.Object({ target: Type.String() }), execute: (_id: string, params: { target: string }) => executeRead((s) => s.adapter().styles(params.target)) },
    { name: "ui_audit", description: "Capture browser evidence and check responsive overflow.", parameters: Type.Object({}), execute: () => executeRead((s) => collectAudit(s.adapter(), { responsive: s.active()?.mode === "isolated" })) },
  ];
  for (const definition of tools) pi.registerTool({ ...definition, label: definition.name, risk: "read" });

  pi.registerCommand("ui", {
    description: "Connect to and inspect a browser UI",
    handler: async (args: string, ctx: ToolContext) => {
      if (!manager) return ctx.ui?.notify?.("UI session manager is not initialized.", "error");
      const [command = "status", mode = "isolated", url] = args.trim().split(/\s+/);
      try {
        if (command === "connect") {
          if (!["isolated", "chrome", "current"].includes(mode)) throw new Error("Use /ui connect isolated|chrome|current [url]");
          if (mode !== "isolated" && !(await ctx.ui?.confirm?.("Attach browser?", `Allow pi-ui-observer to inspect your ${mode} browser session?`))) {
            throw new Error("Browser attachment cancelled or UI confirmation unavailable");
          }
          if (mode === "current") {
            if (!pi.registerMcpServer) throw new Error("This Pi version does not support native MCP registration");
            if (browserToolsConnected) return ctx.ui?.notify?.("BrowserTools already registered. Use /mcp to check connection.", "info");
            pi.registerMcpServer("pi-ui-browser-tools", {
              command: process.platform === "win32" ? "cmd" : "npx",
              args: process.platform === "win32"
                ? ["/c", "npx", "-y", "@agentdeskai/browser-tools-mcp@2.0.2"]
                : ["-y", "@agentdeskai/browser-tools-mcp@2.0.2"],
              exposure: "deferred",
              description: "Inspect the explicitly attached Chrome DevTools tab with BrowserTools",
              toolExposure: { refreshBrowser: "hidden", getBrowserStorage: "hidden", wipeLogs: "hidden" },
            });
            browserToolsConnected = true;
            return ctx.ui?.notify?.("BrowserTools MCP registered. Open DevTools in Chrome and use /mcp to check the connection; browser tools are discoverable via tool_search.", "info");
          }
          await manager.connect(mode as "isolated" | "chrome", { url });
          return ctx.ui?.notify?.(`Connected to ${mode}.`, "info");
        }
        if (command === "disconnect") {
          await manager.disconnect();
          if (browserToolsConnected) { pi.unregisterMcpServer?.("pi-ui-browser-tools"); browserToolsConnected = false; }
          return ctx.ui?.notify?.("UI adapter disconnected.", "info");
        }
        if (command === "status") {
          const statuses = await manager.status();
          const message = `Active: ${manager.active()?.adapter ?? "none"}; BrowserTools MCP: ${browserToolsConnected ? "registered (check /mcp)" : "not connected"}; ${statuses.filter((s) => s.name !== "browser-tools").map((s) => `${s.name}: ${s.available ? "ready" : s.detail ?? "unavailable"}`).join("; ")}`;
          return ctx.ui?.notify?.(message, "info");
        }
        if (command === "inspect") {
          const page = await manager.adapter().currentPage();
          const snapshot = await manager.adapter().snapshot();
          return ctx.ui?.notify?.(`Page: ${page.title} (${page.url}); snapshot: ${JSON.stringify(snapshot).slice(0, 1000)}`, "info");
        }
        if (command === "audit") {
          const audit = await collectAudit(manager.adapter(), { responsive: manager.active()?.mode === "isolated" });
          return ctx.ui?.notify?.(`UI audit: ${audit.findings.map((finding) => `${finding.severity.toUpperCase()} ${finding.message}`).join("; ")}`, "info");
        }
        if (command === "screenshot") {
          const screenshot = await manager.adapter().screenshot();
          if (!(screenshot.bytes instanceof Uint8Array)) throw new Error("Adapter did not return image bytes");
          const artifact = await writeArtifact(`capture-${randomUUID()}`, { kind: "screenshot", bytes: screenshot.bytes });
          return ctx.ui?.notify?.(`Screenshot saved: ${artifact.path}`, "info");
        }
        return ctx.ui?.notify?.(`Unknown command: ${command}. Use status|connect|disconnect|inspect|screenshot|audit.`, "error");
      } catch (error) {
        return ctx.ui?.notify?.(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });
}
