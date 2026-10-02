import { Type } from "typebox";

interface RegistrationApi {
  registerTool(definition: Record<string, unknown>): void;
  registerCommand(name: string, definition: Record<string, unknown>): void;
}

const emptyParameters = Type.Object({});

function tool(name: string, description: string, risk: "read" | "interaction" | "destructive" = "read") {
  return {
    name,
    label: name,
    description,
    parameters: emptyParameters,
    risk,
    async execute() {
      return { content: [{ type: "text", text: `${name} is registered; connect a UI adapter to execute it.` }], details: { risk } };
    },
  };
}

export function registerUiObserver(pi: RegistrationApi): void {
  for (const definition of [
    tool("ui_current_page", "Read the current browser page."),
    tool("ui_snapshot", "Read the accessibility and DOM snapshot."),
    tool("ui_screenshot", "Capture a screenshot of the current UI."),
    tool("ui_console", "Read browser console entries."),
    tool("ui_network", "Read browser network activity."),
    tool("ui_styles", "Read computed styles and layout for an element."),
    tool("ui_audit", "Run a UI evidence audit."),
    tool("ui_set_viewport", "Set the browser viewport."),
    tool("ui_click", "Click a UI element after user approval.", "interaction"),
    tool("ui_fill", "Fill a UI field after user approval.", "interaction"),
    tool("ui_upload", "Upload a file after user approval.", "destructive"),
  ]) pi.registerTool(definition);

  pi.registerCommand("ui", {
    description: "Connect to and inspect a browser UI",
    handler: async (args: string, ctx: { ui?: { notify?: (message: string, level: string) => void } }) => {
      ctx.ui?.notify?.(`/ui ${args || "status"}: use the registered UI observer tools.`, "info");
    },
  });
}
