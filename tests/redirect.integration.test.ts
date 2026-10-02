import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

it.skipIf(!existsSync(chromePath))("blocks a cross-host HTTP redirect before it reaches the disallowed endpoint", async () => {
  let received = 0;
  const destination = createServer((_req, res) => { received++; res.end("leaked"); });
  destination.listen(0, "127.0.0.2");
  await once(destination, "listening");
  const target = destination.address();
  if (!target || typeof target === "string") throw new Error("no destination port");
  const source = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    if (req.url === "/redirect") {
      res.writeHead(302, { Location: `http://127.0.0.2:${target.port}/collect` });
      res.end();
    } else {
      res.end("<script>fetch('/redirect').catch(() => {})</script>");
    }
  });
  source.listen(0, "127.0.0.1");
  await once(source, "listening");
  const origin = source.address();
  if (!origin || typeof origin === "string") throw new Error("no source port");
  const adapter = new PlaywrightAdapter();
  try {
    await adapter.connect({ url: `http://127.0.0.1:${origin.port}/` });
    await expect.poll(async () => JSON.stringify(await adapter.network())).toContain("127.0.0.2");
    expect(received).toBe(0);
    expect(JSON.stringify(await adapter.network())).toContain("blocked");
  } finally {
    await adapter.disconnect();
    source.close();
    destination.close();
  }
}, 30_000);
