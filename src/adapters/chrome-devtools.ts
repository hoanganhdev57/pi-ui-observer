import { TransportAdapter, unavailableTransport, type AdapterTransport } from "./common.js";

export class ChromeDevToolsAdapter extends TransportAdapter {
  constructor(transport: AdapterTransport = unavailableTransport("Chrome DevTools connector is not configured")) {
    super("chrome-devtools", transport);
  }
}
