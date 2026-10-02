import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { expect, it } from "vitest";
import { ChromeDevToolsAdapter } from "../src/adapters/chrome-devtools.js";
import { createPlaywrightTransport } from "../src/adapters/playwright-runtime.js";

const chromePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

it.skipIf(!existsSync(chromePath) || process.env.PI_UI_OBSERVER_RUN_CDP_E2E !== "1")("attaches to the existing approved CDP tab, not about:blank", async () => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const probeAddress = probe.address();
  if (!probeAddress || typeof probeAddress === "string") throw new Error("no probe port");
  const cdpPort = probeAddress.port;
  probe.close();

  const app = createServer((_req, res) => { res.setHeader("Content-Type", "text/html"); res.end("<title>Approved</title><main>Existing tab</main>"); });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const appAddress = app.address();
  if (!appAddress || typeof appAddress === "string") throw new Error("no app port");
  const url = `http://127.0.0.1:${appAddress.port}`;
  const endpoint = `http://127.0.0.1:${cdpPort}`;
  const profile = await mkdtemp(join(tmpdir(), "pi-ui-cdp-profile-"));
  const child = spawn(chromePath, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
  const adapter = new ChromeDevToolsAdapter(createPlaywrightTransport({ cdpEndpoint: endpoint }));
  try {
    let ready = false;
    for (let i = 0; i < 50 && !ready; i++) {
      ready = await fetch(`${endpoint}/json/version`).then((response) => response.ok, () => false);
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("Chrome CDP did not become available");
    const setupBrowser = await chromium.connectOverCDP(endpoint);
    const setupContext = setupBrowser.contexts()[0];
    const existing = await setupContext.newPage();
    await existing.goto(url);
    await setupBrowser.close();

    await adapter.connect({ url });
    expect((await adapter.currentPage()).title).toBe("Approved");
    expect((await adapter.snapshot()).accessibilityTree).toContain("Existing tab");
  } finally {
    await adapter.disconnect();
    child.kill();
    app.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => undefined);
  }
}, 30_000);
