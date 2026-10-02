---
name: ui-verification
description: Use when building, changing, or debugging a web UI; collect browser evidence before claiming visual correctness.
---

# UI Verification

Use the global `pi-ui-observer` tools for frontend work. Do not claim a UI is correct from source inspection alone when a browser session is available.

## Evidence workflow

1. Run `ui_current_page` and confirm the active adapter, URL, title, and viewport.
2. Run `ui_snapshot` to inspect visible roles, labels, text, and test IDs.
3. Run `ui_screenshot` and retain the artifact path.
4. Run `ui_console` and investigate errors before treating the UI as healthy.
5. Run `ui_network` and investigate failed requests.
6. Load the project's design brief or tokens when available.
7. Run `ui_audit` at the requested viewport matrix.
8. Report PASS, FAIL, and WARN findings with evidence artifact paths.

Default responsive viewports:

- 1280x720
- 768x900
- 414x896
- 375x812
- 320x700

Use read-only observation by default. Ask for approval before clicking, filling, uploading, deleting, submitting, or navigating outside an explicitly allowed host.
