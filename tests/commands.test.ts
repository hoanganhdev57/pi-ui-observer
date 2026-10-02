import { describe, expect, it, vi } from "vitest";
import { registerUiObserver } from "../src/extension-registration.js";
import { AdapterRegistry, type UiAdapter } from "../src/adapters/adapter.js";
import { UiSessionManager } from "../src/session/manager.js";

function setup() {
  const commands = new Map<string, { handler(args: string, ctx: unknown): Promise<void> }>();
  const tools = new Map<string, { execute(...args: unknown[]): Promise<{ content: Array<{ type: string; text?: string }> }> }>();
  const registerMcpServer = vi.fn();
  const unregisterMcpServer = vi.fn();
  const adapter: UiAdapter = {
    name: "playwright",
    status: async () => ({ name: "playwright", available: true }),
    connect: async () => ({ id: "fixture" }),
    disconnect: async () => {},
    currentPage: async () => ({ url: "http://127.0.0.1:3000", title: "Fixture", viewport: { width: 1280, height: 720 } }),
    snapshot: async () => ({ nodes: [] }),
    screenshot: async () => ({ bytes: Buffer.from("fake") }),
    console: async () => ({ entries: [] }),
    network: async () => ({ requests: [] }),
    styles: async () => ({ found: true }),
    setViewport: async (viewport) => ({ viewport }),
    audit: async () => ({ findings: [] }),
  };
  const registry = new AdapterRegistry();
  registry.register("playwright", () => adapter);
  const manager = new UiSessionManager(registry);
  registerUiObserver({ registerTool(tool) { tools.set(String(tool.name), tool as never); }, registerCommand(name, command) { commands.set(name, command as never); }, registerMcpServer, unregisterMcpServer }, manager);
  const notify = vi.fn();
  const confirm = vi.fn().mockResolvedValue(true);
  const ctx = { ui: { notify, confirm } };
  return { handler: commands.get("ui")!.handler, tools, manager, registerMcpServer, unregisterMcpServer, notify, confirm, ctx };
}

describe("/ui commands", () => {
  it("connects isolated browser without attached-session approval", async () => {
    const f = setup();
    await f.handler("connect isolated http://127.0.0.1:3000", f.ctx);
    expect(f.manager.active()?.adapter).toBe("playwright");
    expect(f.confirm).not.toHaveBeenCalled();
  });

  it("exposes a responsive audit rather than a one-page capture", async () => {
    const f = setup();
    await f.handler("connect isolated http://127.0.0.1:3000", f.ctx);
    const response = await f.tools.get("ui_audit")!.execute();
    expect(response.content[0].text).toContain("viewports");
    expect(response.content[0].text).toContain("320");
  });

  it("requires explicit approval before registering current-tab MCP", async () => {
    const f = setup();
    f.confirm.mockResolvedValue(false);
    await f.handler("connect current", f.ctx);
    expect(f.registerMcpServer).not.toHaveBeenCalled();
    f.confirm.mockResolvedValue(true);
    await f.handler("connect current", f.ctx);
    expect(f.registerMcpServer).toHaveBeenCalledWith("pi-ui-browser-tools", expect.objectContaining({ exposure: "deferred" }));
    await f.handler("disconnect", f.ctx);
    expect(f.unregisterMcpServer).toHaveBeenCalledWith("pi-ui-browser-tools");
  });
});
