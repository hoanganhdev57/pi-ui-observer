import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

describe("direct Playwright runtime", () => {
  it.skipIf(!existsSync(chromePath))("captures page, snapshot, screenshot, console, and network evidence", async () => {
    const server = createServer((_request, response) => {
      response.setHeader("Content-Type", "text/html");
      response.end("<button aria-label='Start'>Start</button><script>console.error('fixture-error')</script>");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fixture server did not bind");
    const adapter = new PlaywrightAdapter();
    try {
      await adapter.connect({ url: `http://127.0.0.1:${address.port}` });
      const page = await adapter.currentPage();
      const snapshot = await adapter.snapshot();
      const screenshot = await adapter.screenshot();
      const consoleReport = await adapter.console();
      expect(page.url).toContain("127.0.0.1");
      expect(JSON.stringify(snapshot)).toContain("Start");
      expect(snapshot).toHaveProperty("accessibilityTree");
      expect(screenshot).toHaveProperty("bytes");
      expect(JSON.stringify(consoleReport)).toContain("fixture-error");
    } finally {
      await adapter.disconnect();
      server.close();
    }
  }, 30_000);
});

