import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerUiObserver } from "../src/extension-registration.js";

export default function uiObserverExtension(pi: ExtensionAPI) {
  registerUiObserver(pi as unknown as Parameters<typeof registerUiObserver>[0]);
  pi.on("session_shutdown", async () => {
    // Adapter resources are started lazily by the session manager in a later implementation step.
  });
}
