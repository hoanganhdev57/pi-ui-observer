import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from "playwright-core";
import { defaultHostPolicy, isAllowedHost } from "../policy/hosts.js";
import type { ConnectOptions } from "./adapter.js";
import type { AdapterTransport } from "./common.js";

interface RuntimeOptions {
  cdpEndpoint?: string;
}

export function selectAllowedPage<T extends { url(): string }>(pages: T[], requestedUrl?: string, allowedHosts: string[] = []): T | undefined {
  const policy = { ...defaultHostPolicy, allowedHosts };
  const normalizedRequested = requestedUrl ? new URL(requestedUrl).href : undefined;
  return pages.find((candidate) => isAllowedHost(candidate.url(), policy) && (!normalizedRequested || new URL(candidate.url()).href === normalizedRequested));
}

export function createPlaywrightTransport(options: RuntimeOptions = {}): AdapterTransport {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  let isolatedFetchSession: CDPSession | undefined;
  let connectedAllowedHosts: string[] = [];
  const consoleEntries: Record<string, unknown>[] = [];
  const networkEntries: Record<string, unknown>[] = [];

  return {
    async status() {
      if (options.cdpEndpoint) {
        if (!isAllowedHost(options.cdpEndpoint, defaultHostPolicy)) return { available: false, detail: "CDP endpoint must be loopback" };
        try {
          const probe = new URL("/json/version", options.cdpEndpoint);
          const response = await fetch(probe, { signal: AbortSignal.timeout(1500) });
          return { available: response.ok, detail: response.ok ? `CDP ${options.cdpEndpoint}` : `CDP HTTP ${response.status}` };
        } catch {
          return { available: false, detail: `CDP endpoint unavailable at ${options.cdpEndpoint}` };
        }
      }
      const executablePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? await findChromiumExecutable();
      return executablePath ? { available: true, detail: executablePath } : { available: false, detail: "Set PI_UI_OBSERVER_CHROMIUM_PATH or install Chrome/Chromium." };
    },
    async connect(connectOptions: ConnectOptions) {
      connectedAllowedHosts = connectOptions.allowedHosts ?? [];
      const policy = { ...defaultHostPolicy, allowedHosts: connectedAllowedHosts };
      if (connectOptions.url && !isAllowedHost(connectOptions.url, policy)) {
        throw Object.assign(new Error("Page URL is not allowed by host policy"), { code: "HOST_NOT_ALLOWED" });
      }
      if (options.cdpEndpoint && !isAllowedHost(options.cdpEndpoint, defaultHostPolicy)) {
        throw Object.assign(new Error("CDP endpoint must be loopback"), { code: "HOST_NOT_ALLOWED" });
      }
      if (options.cdpEndpoint) {
        browser = await chromium.connectOverCDP(options.cdpEndpoint);
        const contexts = browser.contexts();
        page = selectAllowedPage(contexts.flatMap((existing) => existing.pages()), connectOptions.url, connectedAllowedHosts);
        if (!page && connectOptions.url) {
          context = contexts[0] ?? await browser.newContext();
          page = await context.newPage();
        }
        if (!page) {
          await browser.close();
          browser = undefined;
          throw Object.assign(new Error("No allowed Chrome tab is available; open a localhost tab or provide an allowed URL"), { code: "HOST_NOT_ALLOWED" });
        }
        context = page.context();
      } else {
        const executablePath = process.env.PI_UI_OBSERVER_CHROMIUM_PATH ?? await findChromiumExecutable();
        if (!executablePath) throw Object.assign(new Error("No Chrome/Chromium executable found"), { code: "ADAPTER_UNAVAILABLE" });
        browser = await chromium.launch({ headless: true, executablePath });
        context = await browser.newContext({ viewport: connectOptions.viewport, serviceWorkers: "block" });
        page = await context.newPage();
        isolatedFetchSession = await context.newCDPSession(page);
        isolatedFetchSession.on("Fetch.requestPaused", (event) => {
          const target = event.request.url;
          const allowed = isAllowedHost(target, policy) || /^(?:data|blob|about):/.test(target);
          if (!allowed) networkEntries.push({ url: target, method: event.request.method, blocked: true });
          const operation = allowed
            ? isolatedFetchSession?.send("Fetch.continueRequest", { requestId: event.requestId })
            : isolatedFetchSession?.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" });
          void operation?.catch((error: unknown) => consoleEntries.push({ level: "error", text: `Request interception failed: ${String(error)}` }));
        });
        await isolatedFetchSession.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
      }
      attachListeners(page);
      if (connectOptions.url && new URL(page.url()).href !== new URL(connectOptions.url).href) await page.goto(connectOptions.url, { waitUntil: "domcontentloaded" });
      return { id: `playwright-${Date.now()}` };
    },
    async disconnect() {
      if (browser) await browser.close();
      isolatedFetchSession = undefined;
      browser = undefined;
      context = undefined;
      page = undefined;
    },
    async call(method, params = {}) {
      if (!page) throw Object.assign(new Error("Playwright is not connected"), { code: "NOT_CONNECTED" });
      if (!isAllowedHost(page.url(), { ...defaultHostPolicy, allowedHosts: connectedAllowedHosts })) {
        throw Object.assign(new Error("Current page left the allowed hosts"), { code: "HOST_NOT_ALLOWED" });
      }
      if (method === "currentPage") return { url: page.url(), title: await page.title(), viewport: page.viewportSize() };
      if (method === "snapshot") {
        const [accessibilityTree, dom] = await Promise.all([
          page.ariaSnapshot(),
          page.evaluate(() => ({
            text: (document.body?.innerText ?? "").slice(0, 30_000),
            nodes: Array.from(document.querySelectorAll("button,a,input,select,textarea,[role]"), (element) => ({
              tag: element.tagName.toLowerCase(),
              role: element.getAttribute("role"),
              name: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 200),
              testId: element.getAttribute("data-testid"),
              visible: Boolean((element as HTMLElement).offsetWidth || (element as HTMLElement).offsetHeight),
            })).slice(0, 500),
          })),
        ]);
        return { accessibilityTree: accessibilityTree.slice(0, 30_000), ...dom };
      }
      if (method === "screenshot") return { kind: "screenshot", bytes: await page.screenshot({ fullPage: Boolean(params.fullPage) }) };
      if (method === "console") return { entries: [...consoleEntries] };
      if (method === "network") return { requests: [...networkEntries] };
      if (method === "styles") return page.evaluate((selector) => {
        const element = document.querySelector(String(selector));
        if (!element) return { found: false };
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return { found: true, display: style.display, visibility: style.visibility, overflow: style.overflow, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
      }, params.target ?? "body");
      if (method === "setViewport") {
        const width = Number(params.width);
        const height = Number(params.height);
        if (!Number.isInteger(width) || width < 240 || width > 3840 || !Number.isInteger(height) || height < 240 || height > 3840) throw new Error("Viewport must be integer pixels within 240..3840");
        await page.setViewportSize({ width, height });
        return { viewport: page.viewportSize() };
      }
      if (method === "audit") {
        const layout = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        }));
        return { console: [...consoleEntries], network: [...networkEntries], page: await page.title(), viewport: page.viewportSize(), ...layout };
      }
      throw new Error(`Unsupported Playwright method: ${method}`);
    },
  };

  function attachListeners(target: Page): void {
    target.on("console", (message) => consoleEntries.push({ level: message.type(), text: message.text() }));
    target.on("pageerror", (error) => consoleEntries.push({ level: "error", text: error.message }));
    target.on("requestfailed", (request) => networkEntries.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText }));
    target.on("response", (response) => { if (response.status() >= 400) networkEntries.push({ url: response.url(), status: response.status(), method: response.request().method() }); });
  }
}

async function findChromiumExecutable(): Promise<string | undefined> {
  const candidates = process.platform === "win32"
    ? [join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"), join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe"), join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe")]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  for (const candidate of candidates) {
    if (candidate && await access(candidate).then(() => true, () => false)) return candidate;
  }
  const homeCandidate = join(homedir(), ".cache", "ms-playwright");
  return await access(homeCandidate).then(() => undefined, () => undefined);
}
