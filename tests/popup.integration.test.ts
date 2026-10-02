import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { PlaywrightAdapter } from "../src/adapters/playwright.js";
import { createPlaywrightTransport } from "../src/adapters/playwright-runtime.js";
import type { Page } from "playwright-core";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

it.skipIf(!existsSync(chromePath)).each(["direct", "redirect", "about-blank"])("blocks a %s popup to a non-allowlisted host", async (scenario) => {
  let received = 0;
  const destination = createServer((_req, res) => { received++; res.end("leaked"); });
  destination.listen(0, "127.0.0.2");
  await once(destination, "listening");
  const target = destination.address();
  if (!target || typeof target === "string") throw new Error("no destination port");
  const source = createServer((req, res) => {
    if (req.url === "/redirect") {
      res.writeHead(302, { Location: `http://127.0.0.2:${target.port}/popup` });
      res.end();
      return;
    }
    res.setHeader("Content-Type", "text/html");
    const popup = scenario === "redirect" ? "/redirect" : `http://127.0.0.2:${target.port}/popup`;
    const action = scenario === "about-blank" ? "window.open('about:blank')" : `window.open('${popup}')`;
    res.end(`<button onclick="${action}">Open popup</button>`);
  });
  source.listen(0, "127.0.0.1");
  await once(source, "listening");
  const origin = source.address();
  if (!origin || typeof origin === "string") throw new Error("no source port");
  let page: Page | undefined;
  const adapter = new PlaywrightAdapter(createPlaywrightTransport({ onPage: (current) => { page = current; } }));
  try {
    await adapter.connect({ url: `http://127.0.0.1:${origin.port}/` });
    const popupPromise = page!.waitForEvent("popup", { timeout: 1500 }).catch(() => undefined);
    await page!.getByRole("button", { name: "Open popup" }).click();
    await popupPromise;
    await expect.poll(async () => JSON.stringify(await adapter.network())).toContain("blocked");
    expect(received).toBe(0);
    expect(JSON.stringify(await adapter.network())).toContain("blocked");
  } finally {
    await adapter.disconnect();
    source.close();
    destination.close();
  }
}, 30_000);
