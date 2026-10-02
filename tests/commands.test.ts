import { describe, expect, it, vi } from "vitest";
import { registerUiObserver } from "../src/extension-registration.js";
import { AdapterRegistry, type UiAdapter } from "../src/adapters/adapter.js";
import { UiSessionManager } from "../src/session/manager.js";

function setup() {
  const commands = new Map<string, { handler(args: string, ctx: unknown): Promise<void> }>();
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
    audit: async () => ({ findings: [] }),
  };
  const registry = new AdapterRegistry();
  registry.register("playwright", () => adapter);
  const manager = new UiSessionManager(registry);
  registerUiObserver({ registerTool() {}, registerCommand(name, command) { commands.set(name, command as never); }, registerMcpServer, unregisterMcpServer }, manager);
  const notify = vi.fn();
  const confirm = vi.fn().mockResolvedValue(true);
  const ctx = { ui: { notify, confirm } };
  return { handler: commands.get("ui")!.handler, manager, registerMcpServer, unregisterMcpServer, notify, confirm, ctx };
}

describe("/ui commands", () => {
  it("connects isolated browser without attached-session approval", async () => {
    const f = setup();
    await f.handler("connect isolated http://127.0.0.1:3000", f.ctx);
    expect(f.manager.active()?.adapter).toBe("playwright");
    expect(f.confirm).not.toHaveBeenCalled();
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
