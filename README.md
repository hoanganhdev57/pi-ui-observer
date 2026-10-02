# pi-ui-observer

Global Pi tools for inspecting and verifying web UIs with browser evidence.

## Status

This package is under active development. The first release targets GitHub and the Pi package gallery. npm publication is deferred.

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

The package will support isolated Playwright sessions, Chrome DevTools runtime inspection, and the current-tab BrowserTools connector. Read-only observation is the default; browser interactions require approval.

## Security

Read [SECURITY.md](SECURITY.md) before connecting an existing browser tab. Browser observation can expose page content, console data, network metadata, and sensitive application state. The package is designed for loopback connections, isolated profiles, redacted output, and explicit approval for side effects.

## Development

Requirements: Node.js >= 22.19.

```bash
npm install
npm run ci
```
