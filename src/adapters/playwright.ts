import { TransportAdapter, unavailableTransport, type AdapterTransport } from "./common.js";

export class PlaywrightAdapter extends TransportAdapter {
  constructor(transport: AdapterTransport = unavailableTransport("Playwright connector is not configured")) {
    super("playwright", transport);
  }
}
