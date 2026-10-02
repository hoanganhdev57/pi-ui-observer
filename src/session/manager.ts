import type { AdapterMode } from "../types.js";
import { adapterKeyForMode, type AdapterRegistry, type ConnectOptions, type UiAdapter } from "../adapters/adapter.js";

export interface ActiveSession {
  adapter: string;
  connectionId: string;
  mode: AdapterMode;
}

export class UiSessionManager {
  private current: { adapter: UiAdapter; session: ActiveSession } | null = null;

  constructor(private readonly registry: AdapterRegistry) {}

  async connect(mode: AdapterMode, options: ConnectOptions): Promise<ActiveSession> {
    await this.disconnect();
    const adapter = this.registry.create(adapterKeyForMode(mode));
    try {
      const connection = await adapter.connect(options);
      this.current = { adapter, session: { adapter: adapter.name, connectionId: connection.id, mode } };
      return this.current.session;
    } catch (error) {
      await adapter.disconnect().catch(() => undefined);
      throw error;
    }
  }

  active(): ActiveSession | null {
    return this.current?.session ?? null;
  }

  adapter(): UiAdapter {
    if (!this.current) throw Object.assign(new Error("No UI adapter is connected"), { code: "NOT_CONNECTED" });
    return this.current.adapter;
  }

  async status(): Promise<Array<{ name: string; available: boolean; detail?: string }>> {
    const keys = ["playwright", "chrome-devtools", "browser-tools"] as const;
    return Promise.all(keys.filter((key) => this.registry.has(key)).map((key) => this.registry.create(key).status()));
  }

  async disconnect(): Promise<void> {
    if (!this.current) return;
    const active = this.current;
    this.current = null;
    await active.adapter.disconnect();
  }
}
