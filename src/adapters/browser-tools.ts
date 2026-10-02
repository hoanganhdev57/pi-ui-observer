import { TransportAdapter, unavailableTransport, type AdapterTransport } from "./common.js";

export class BrowserToolsAdapter extends TransportAdapter {
  constructor(transport: AdapterTransport = unavailableTransport("BrowserTools connector is not configured")) {
    super("browser-tools", transport);
  }
}
