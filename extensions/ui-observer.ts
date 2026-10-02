import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerUiObserver } from "../src/extension-registration.js";
import { createDefaultSessionManager } from "../src/session/default.js";

export default function uiObserverExtension(pi: ExtensionAPI) {
  const manager = createDefaultSessionManager();
  registerUiObserver(pi as unknown as Parameters<typeof registerUiObserver>[0], manager);
  pi.on("session_shutdown", async () => {
    await manager.disconnect();
  });
}
