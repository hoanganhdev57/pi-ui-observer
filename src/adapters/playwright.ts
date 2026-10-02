import { TransportAdapter, type AdapterTransport } from "./common.js";
import { createPlaywrightTransport } from "./playwright-runtime.js";

export class PlaywrightAdapter extends TransportAdapter {
  constructor(transport: AdapterTransport = createPlaywrightTransport()) {
    super("playwright", transport);
  }
}
