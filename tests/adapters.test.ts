import { describe, expect, it } from "vitest";
import { BrowserToolsAdapter } from "../src/adapters/browser-tools.js";
import { ChromeDevToolsAdapter } from "../src/adapters/chrome-devtools.js";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";

function transport() {
  return {
    async status() { return { available: true }; },
    async connect() { return { id: "test" }; },
    async disconnect() {},
    async call(method: string) {
      if (method === "currentPage") return { url: "http://localhost:3000", title: "Test", viewport: { width: 1280, height: 720 } };
      if (method === "snapshot") return { nodes: [{ role: "button", name: "Start" }] };
      return { entries: [], requests: [], findings: [] };
    },
  };
}

describe("browser adapters", () => {
  it.each([
    ["playwright", () => new PlaywrightAdapter(transport())],
    ["chrome-devtools", () => new ChromeDevToolsAdapter(transport())],
    ["browser-tools", () => new BrowserToolsAdapter(transport())],
  ])("%s normalizes page state", async (_name, create) => {
    const adapter = create();
    await adapter.connect({ url: "http://localhost:3000" });
    await expect(adapter.currentPage()).resolves.toMatchObject({ url: "http://localhost:3000" });
    await expect(adapter.snapshot()).resolves.toHaveProperty("nodes");
  });

  it("returns a structured unavailable error when a connector is absent", async () => {
    const adapter = new BrowserToolsAdapter({
      async status() { return { available: false, detail: "connector missing" }; },
      async connect() { throw Object.assign(new Error("connector missing"), { code: "ADAPTER_UNAVAILABLE" }); },
      async disconnect() {},
      async call() { return {}; },
    });
    await expect(adapter.connect({})).rejects.toMatchObject({ code: "ADAPTER_UNAVAILABLE" });
  });
});
