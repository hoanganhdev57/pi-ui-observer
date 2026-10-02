import { BrowserToolsAdapter } from "../adapters/browser-tools.js";
import { ChromeDevToolsAdapter } from "../adapters/chrome-devtools.js";
import { AdapterRegistry } from "../adapters/adapter.js";
import { PlaywrightAdapter } from "../adapters/playwright.js";
import { UiSessionManager } from "./manager.js";

export function createDefaultSessionManager(): UiSessionManager {
  const registry = new AdapterRegistry();
  registry.register("playwright", () => new PlaywrightAdapter());
  registry.register("chrome-devtools", () => new ChromeDevToolsAdapter());
  registry.register("browser-tools", () => new BrowserToolsAdapter());
  return new UiSessionManager(registry);
}
