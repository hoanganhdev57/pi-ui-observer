import type { AdapterMode } from "../types.js";

export interface ConnectOptions {
  url?: string;
  viewport?: { width: number; height: number };
  allowedHosts?: string[];
}

export interface PageInfo {
  url: string;
  title: string;
  viewport: { width: number; height: number };
}

export interface UiAdapter {
  readonly name: string;
  status(): Promise<{ name: string; available: boolean; detail?: string }>;
  connect(options: ConnectOptions): Promise<{ id: string }>;
  disconnect(): Promise<void>;
  currentPage(): Promise<PageInfo>;
  snapshot(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  screenshot(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  console(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  network(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  styles(target: string): Promise<Record<string, unknown>>;
  audit(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export type AdapterFactory = () => UiAdapter;
export type AdapterKey = "playwright" | "chrome-devtools" | "browser-tools";

export class AdapterRegistry {
  private readonly factories = new Map<AdapterKey, AdapterFactory>();

  register(key: AdapterKey, factory: AdapterFactory): void {
    this.factories.set(key, factory);
  }

  create(key: AdapterKey): UiAdapter {
    const factory = this.factories.get(key);
    if (!factory) throw Object.assign(new Error(`Adapter is not registered: ${key}`), { code: "ADAPTER_UNAVAILABLE" });
    return factory();
  }

  has(key: AdapterKey): boolean {
    return this.factories.has(key);
  }
}

export function adapterKeyForMode(mode: AdapterMode): AdapterKey {
  if (mode === "isolated") return "playwright";
  if (mode === "chrome") return "chrome-devtools";
  return "browser-tools";
}
