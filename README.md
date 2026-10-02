# pi-ui-observer

A global Pi package for evidence-first web UI inspection. Capture a real screenshot and accessibility snapshot, inspect console/network failures and computed layout, and check responsive horizontal overflow without adding code to each web app.

## Install and start

Requires Pi with extension and MCP support, Node.js >=22.19, and Chrome/Chromium (or a compatible installed browser). Install once at **user scope**:

```bash
pi install npm:pi-ui-observer@0.1.0
# Alternatively: pi install git:github.com/hoanganhdev57/pi-ui-observer@v0.1.0
```

Start Pi in any project and start that project's dev server separately. Then:

```text
/ui status
/ui connect isolated http://127.0.0.1:3000
/ui inspect
/ui screenshot
/ui audit
/ui disconnect
```

Pi also exposes `ui_current_page`, `ui_snapshot`, `ui_screenshot`, `ui_styles`, `ui_console`, `ui_network`, and `ui_audit` as model-callable tools. `ui_screenshot` returns an image to Pi plus a local artifact path. `/ui audit` takes screenshots at 1280, 768, 414, 375, and 320 CSS-pixel widths in isolated mode, flags horizontal overflow and console/network errors, and restores the original viewport. Screenshots are stored in the system temporary directory under `pi-ui-observer/runs/` and may contain private page data; remove them when no longer needed.

These checks collect **evidence**, not an automatic design verdict. Ask Pi to compare the screenshots and semantic snapshot with your project's design specification. The included `ui-verification` skill describes that workflow. A screenshot alone never produces a visual PASS.

## Browser modes

| Mode | How to use it | What it observes |
| --- | --- | --- |
| Isolated (default) | `/ui connect isolated http://127.0.0.1:3000` | Headless Chrome/Chromium with a fresh temporary profile and no personal cookies. `PI_UI_OBSERVER_CHROMIUM_PATH` overrides executable discovery. |
| Chrome CDP | Start a **separate** Chrome profile with `--remote-debugging-port=9222 --user-data-dir=<temporary-profile>`, then `/ui connect chrome` and approve attachment. | An attached Chrome tab on an allowed host. Default endpoint is `http://127.0.0.1:9222`; `PI_UI_OBSERVER_CDP_ENDPOINT` may specify another loopback endpoint. Responsive resizing is not automatic in this mode. |
| Current tab | Install the [BrowserTools 2.x Chrome extension](https://github.com/AgentDeskAI/browser-tools-mcp), open DevTools on the desired tab, run `/ui connect current` and approve attachment. | Pi registers pinned BrowserTools MCP 2.0.2 on demand. Use `/mcp` to check its connection and `tool_search` to find its tools. These are **MCP tools**, not the `ui_*` adapter. |

BrowserTools can see data in your actual Chrome session. Do not attach a personal tab unless you intend to share its contents with Pi. The first `/ui connect current` may download the pinned MCP server through `npx`; review the dependency before connecting. `/ui disconnect` unregisters it.

## Security defaults and limitations

- Page navigation from `/ui connect` is limited to `localhost` and `127.0.0.1` by default. Isolated mode blocks outbound HTTP requests to other hosts. This can block third-party assets or APIs; blocked requests are reported in the audit.
- Chrome CDP and current-tab connections require user confirmation. A CDP endpoint must be loopback, and an attached tab outside the allowlist is rejected by the `ui_*` adapter.
- Network/console text is redacted for common token patterns before reaching the model. This is best-effort: screenshots, page text, URLs, and third-party MCP tools can still expose sensitive material.
- This **read-only v0.1** does not provide working click/fill/upload tools, automatic watch mode, native WebView2 capture, or a machine-verified design comparison. Interaction and watch mode are reserved for later releases.
- The package itself adds no telemetry. Third-party browser components may have independent privacy policies.

Read [SECURITY.md](SECURITY.md) before connecting a real browser session. Pi packages and MCP servers execute with your user permissions.

## Development

```bash
npm ci
npm run ci
npm pack --dry-run
```

The repository's tests include a real local Chrome integration test when a Chrome executable is detected. Tests skip browser integration when none is installed. `pi-package` makes the npm distribution eligible for Pi's package gallery; gallery indexing may take time and must be checked separately from successful npm publication.
