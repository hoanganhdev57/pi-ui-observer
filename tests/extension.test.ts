import { describe, expect, it } from "vitest";
import { registerUiObserver } from "../src/extension-registration.js";

function createFakeExtensionApi() {
  const tools = new Map<string, { risk: string }>();
  const commands = new Map<string, unknown>();
  return {
    tools,
    commands,
    registerTool(definition: { name: string; risk?: string }) { tools.set(definition.name, { risk: definition.risk ?? "read" }); },
    registerCommand(name: string, definition: unknown) { commands.set(name, definition); },
  };
}

describe("Pi extension registration", () => {
  it("registers read-only tools and approval-gated interaction tools", () => {
    const pi = createFakeExtensionApi();
    registerUiObserver(pi as never);
    expect(pi.tools.get("ui_snapshot")?.risk).toBe("read");
    expect(pi.tools.get("ui_click")?.risk).toBe("interaction");
    expect(pi.commands.has("ui")).toBe(true);
  });
});
