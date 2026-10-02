---
name: ui-verification
description: Use when building, changing, or debugging a web UI; collect browser evidence before claiming visual correctness.
---

# UI Verification

Use the global `pi-ui-observer` tools for frontend work. Start or connect through `/ui connect isolated http://127.0.0.1:<port>`; for an approved current Chrome tab, use `/ui connect current` and discover BrowserTools MCP tools instead of `ui_*`. Do not claim a UI is correct from source inspection alone when a browser session is available.

## Evidence workflow

1. Run `ui_current_page` and confirm the active adapter, URL, title, and viewport.
2. Run `ui_snapshot` to inspect visible roles, labels, text, and test IDs.
3. Run `ui_screenshot` and retain the artifact path.
4. Run `ui_console` and investigate errors before treating the UI as healthy.
5. Run `ui_network` and investigate failed requests.
6. Load the project's design brief or tokens when available.
7. Run `ui_audit`; isolated mode captures the default viewport matrix and reports horizontal overflow. For Chrome CDP or current-tab MCP, verify viewports manually or in a separate isolated session.
8. Report PASS, FAIL, and WARN findings with evidence artifact paths.

Default responsive viewports:

- 1280x720
- 768x900
- 414x896
- 375x812
- 320x700

Version 0.1 exposes only read-only observation tools; it has no click/fill/upload workflow. Do not use bash, raw CDP, or a third-party MCP action tool to bypass the user's browser-attachment consent or allowed-host policy. Treat BrowserTools page, storage, and network content as sensitive.
