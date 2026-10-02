import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

it.skipIf(!existsSync(chromePath))("allows the initial URL when it contains a fragment", async () => {
  const server = createServer((_req, res) => { res.setHeader("Content-Type", "text/html"); res.end("<main>section</main>"); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const adapter = new PlaywrightAdapter();
  try {
    await adapter.connect({ url: `http://127.0.0.1:${address.port}/#section` });
    expect((await adapter.currentPage()).url).toContain("#section");
    expect(JSON.stringify(await adapter.network())).not.toContain("New document navigation is disabled");
  } finally { await adapter.disconnect(); server.close(); }
}, 30_000);
