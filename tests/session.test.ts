import { describe, expect, it } from "vitest";
import { AdapterRegistry, type UiAdapter } from "../src/adapters/adapter.js";
import { UiSessionManager } from "../src/session/manager.js";

function fakeAdapter(name: string, available = true): UiAdapter {
  return {
    name,
    async status() { return { name, available }; },
    async connect() { if (!available) throw Object.assign(new Error("missing"), { code: "ADAPTER_UNAVAILABLE" }); return { id: name }; },
    async disconnect() {},
    async currentPage() { return { url: "http://localhost:3000", title: "Test", viewport: { width: 1, height: 1 } }; },
    async snapshot() { return { nodes: [] }; },
    async screenshot() { return { kind: "screenshot", path: "test.png" }; },
    async console() { return { entries: [] }; },
    async network() { return { requests: [] }; },
    async styles() { return { target: "body" }; },
    async audit() { return { findings: [] }; },
  };
}

describe("UI session manager", () => {
  it("selects isolated Playwright for isolated mode", async () => {
    const registry = new AdapterRegistry();
    registry.register("playwright", () => fakeAdapter("playwright"));
    const manager = new UiSessionManager(registry);
    await manager.connect("isolated", { url: "http://localhost:3000" });
    expect(manager.active()?.adapter).toBe("playwright");
  });

  it("reports adapter unavailable without claiming a connection", async () => {
    const registry = new AdapterRegistry();
    registry.register("browser-tools", () => fakeAdapter("browser-tools", false));
    const manager = new UiSessionManager(registry);
    await expect(manager.connect("current", {})).rejects.toMatchObject({ code: "ADAPTER_UNAVAILABLE" });
    expect(manager.active()).toBeNull();
  });
});
