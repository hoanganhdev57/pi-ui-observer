import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

describe("responsive layout evidence", () => {
  it.skipIf(!existsSync(chromePath))("detects overflow at a 320px viewport", async () => {
    const server = createServer((_req, res) => { res.setHeader("Content-Type", "text/html"); res.end("<style>body{margin:0}.wide{width:600px;height:20px}</style><div class='wide'>wide</div>"); });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no server port");
    const adapter = new PlaywrightAdapter();
    try {
      await adapter.connect({ url: `http://127.0.0.1:${address.port}` });
      await adapter.setViewport({ width: 320, height: 700 });
      const audit = await adapter.audit();
      expect(audit).toMatchObject({ viewport: { width: 320, height: 700 }, horizontalOverflow: true });
    } finally { await adapter.disconnect(); server.close(); }
  }, 30_000);
});
