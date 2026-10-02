import { TransportAdapter, type AdapterTransport } from "./common.js";
import { createPlaywrightTransport } from "./playwright-runtime.js";

export class ChromeDevToolsAdapter extends TransportAdapter {
  constructor(transport: AdapterTransport = createPlaywrightTransport({ cdpEndpoint: process.env.PI_UI_OBSERVER_CDP_ENDPOINT ?? "http://127.0.0.1:9222" })) {
    super("chrome-devtools", transport);
  }
}
