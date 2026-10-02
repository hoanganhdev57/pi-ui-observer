# pi-ui-observer

Global Pi tools for inspecting and verifying web UIs with browser evidence.

## Status

This package is under active development and **not released**. GitHub installation will be available after the runtime and security gates pass. npm publication is deferred; Pi's package gallery documents `pi-package` discovery for npm packages, so a GitHub-only repository is not assumed to appear there.

## Planned installation

```bash
pi install git:github.com/hoanganhdev57/pi-ui-observer
```

After installation, start Pi in any web project and use:

```text
/ui status
/ui connect isolated
/ui inspect
/ui audit
```

The package is being developed with direct isolated Playwright and loopback Chrome CDP modes. `/ui connect current` requires explicit approval and registers BrowserTools MCP 2.0.2 through Pi's native MCP client; it requires the BrowserTools Chrome extension and an open DevTools tab. Its tools are exposed through Pi's MCP tool discovery, not the `ui_*` adapter. Read-only observation is the default; browser interactions are not yet implemented. Do not use this development snapshot as a security boundary for sensitive production sessions.

## Security

Read [SECURITY.md](SECURITY.md) before connecting an existing browser tab. Browser observation can expose page content, console data, network metadata, and sensitive application state. The package is designed for loopback connections, isolated profiles, redacted output, and explicit approval for side effects.

## Development

Requirements: Node.js >= 22.19.

```bash
npm install
npm run ci
```
