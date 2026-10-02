import type { ConnectOptions, UiAdapter } from "./adapter.js";

export interface AdapterTransport {
  status(): Promise<{ available: boolean; detail?: string }>;
  connect(options: ConnectOptions): Promise<{ id: string }>;
  disconnect(): Promise<void>;
  call(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export class TransportAdapter implements UiAdapter {
  constructor(public readonly name: string, protected readonly transport: AdapterTransport) {}

  async status() {
    const result = await this.transport.status();
    return { name: this.name, ...result };
  }

  async connect(options: ConnectOptions) {
    const status = await this.status();
    if (!status.available) {
      throw Object.assign(new Error(status.detail ?? `${this.name} is unavailable`), { code: "ADAPTER_UNAVAILABLE" });
    }
    return this.transport.connect(options);
  }

  disconnect() { return this.transport.disconnect(); }
  currentPage() { return this.transport.call("currentPage") as unknown as ReturnType<UiAdapter["currentPage"]>; }
  snapshot(options?: Record<string, unknown>) { return this.transport.call("snapshot", options); }
  screenshot(options?: Record<string, unknown>) { return this.transport.call("screenshot", options); }
  console(options?: Record<string, unknown>) { return this.transport.call("console", options); }
  network(options?: Record<string, unknown>) { return this.transport.call("network", options); }
  styles(target: string) { return this.transport.call("styles", { target }); }
  audit(options?: Record<string, unknown>) { return this.transport.call("audit", options); }
}

export function unavailableTransport(detail: string): AdapterTransport {
  return {
    async status() { return { available: false, detail }; },
    async connect() { throw Object.assign(new Error(detail), { code: "ADAPTER_UNAVAILABLE" }); },
    async disconnect() {},
    async call() { throw Object.assign(new Error(detail), { code: "ADAPTER_UNAVAILABLE" }); },
  };
}
