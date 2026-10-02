export interface WatchPolicy {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  captureMode(): "reminder-only";
}

export function createWatchPolicy(): WatchPolicy {
  let enabled = false;
  return {
    enable() { enabled = true; },
    disable() { enabled = false; },
    isEnabled() { return enabled; },
    captureMode() { return "reminder-only"; },
  };
}
