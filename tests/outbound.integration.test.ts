import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

describe("isolated browser network policy", () => {
  it.skipIf(!existsSync(chromePath))("blocks non-allowlisted outbound requests from local pages", async () => {
    const server = createServer((_request, response) => {
      response.setHeader("Content-Type", "text/html");
      response.end("<script>fetch('https://example.com/private').catch(() => {})</script>");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fixture server did not bind");
    const adapter = new PlaywrightAdapter();
    try {
      await adapter.connect({ url: `http://127.0.0.1:${address.port}` });
      await expect.poll(async () => JSON.stringify(await adapter.network())).toContain("blocked");
      expect(JSON.stringify(await adapter.network())).toContain("example.com/private");
    } finally {
      await adapter.disconnect();
      server.close();
    }
  }, 30_000);
});
