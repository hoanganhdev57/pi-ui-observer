# pi-ui-observer Global Package

**Status:** Design approved by user; implementation not started.

## Goal

Build a global Pi package that lets Pi inspect and verify any web UI through screenshots, accessibility/DOM snapshots, computed layout, console output, network activity, and responsive audits. The package must be independent of Anime2x and installable once for all Pi projects.

## Distribution

- Package name: `pi-ui-observer`.
- First distribution: public GitHub repository and Pi package gallery metadata.
- npm publication is deferred until the user can register/publish an npm package.
- Intended install form: `pi install git:<github-owner>/pi-ui-observer`.
- Package manifest includes the `pi-package` keyword and Pi resource entries.
- Repository target: `E:/Work/pi-ui-observer`.

## User experience

After installation, Pi loads the extension and skill globally in every trusted project. The user can use:

```text
/ui status
/ui connect isolated
/ui connect chrome
/ui connect current
/ui inspect
/ui screenshot
/ui audit
/ui watch
/ui unwatch
```

Prompt-driven use is also supported: a user can ask Pi to verify a UI, and the global skill instructs the agent to use the observer tools before making completion claims.

## Scope

### Included in v1

- Global Pi extension with typed read-only UI tools.
- Global `ui-verification` skill.
- Playwright adapter for isolated/local browser sessions.
- Chrome DevTools adapter for runtime console, network, screenshot, and performance inspection.
- BrowserTools adapter for the current Chrome tab through its extension.
- Adapter status, connection lifecycle, screenshots, accessibility snapshots, console reports, network reports, computed-style/layout inspection, and responsive audits.
- Design-aware checks using a project design document, design tokens, or explicit user intent.
- Read-only by default with redaction and host restrictions.
- Explicit approval for interactions with side effects.
- Local artifacts/reports under an ignored `.ui-observer/` directory or configured output directory.
- GitHub README, security policy, contribution guidance, license, package metadata, tests, and release tags.

### Deferred

- npm publication.
- Native WebView2 adapter.
- Unattended destructive workflows.
- Cloud browser requirement.
- Framework-specific component introspection.

## Architecture

```text
Pi global package
├── Global extension
│   ├── tools
│   ├── /ui commands
│   ├── policy/approval
│   └── adapter lifecycle
├── Global ui-verification skill
├── Adapter interface
│   ├── PlaywrightAdapter
│   ├── ChromeDevToolsAdapter
│   └── BrowserToolsAdapter
├── Process/transport management
├── Report/artifact writer
└── Design-aware audit formatter
```

The extension must not contain Anime2x-specific selectors, routes, copy, or assumptions. Project-specific behavior comes from the current page, user prompt, design files, and generic attributes such as `data-testid`.

## Adapter interface

Each adapter implements:

```ts
interface UiAdapter {
  name: string;
  status(): Promise<AdapterStatus>;
  connect(options: ConnectOptions): Promise<Connection>;
  currentPage(): Promise<PageInfo>;
  snapshot(options?: SnapshotOptions): Promise<UiSnapshot>;
  screenshot(options?: ScreenshotOptions): Promise<Artifact>;
  console(options?: ConsoleOptions): Promise<ConsoleReport>;
  network(options?: NetworkOptions): Promise<NetworkReport>;
  styles(target: ElementTarget): Promise<StyleReport>;
  audit(options?: AuditOptions): Promise<UiAudit>;
  disconnect(): Promise<void>;
}
```

Adapters may invoke installed CLI/MCP servers through controlled local processes. The package owns lifecycle, timeout, output-size limits, redaction, and structured error handling. Adapter failures are reported by name and do not silently masquerade as a successful audit.

## Tools and commands

### Read-only tools

- `ui_current_page`: URL, title, tab/session ID, viewport, adapter.
- `ui_snapshot`: accessibility tree, visible text, roles, labels, test IDs, optional boxes.
- `ui_screenshot`: viewport/full-page screenshot with artifact path.
- `ui_console`: filtered console entries and errors.
- `ui_network`: filtered requests, status, timing, and redacted metadata.
- `ui_styles`: computed style, visibility, box, overflow, and target identity.
- `ui_audit`: combined UI, accessibility, responsive, console, and network report.
- `ui_set_viewport`: change isolated/current viewport subject to policy.

### Interaction tools

`ui_navigate`, `ui_reload`, `ui_click`, `ui_fill`, `ui_select`, `ui_hover`, `ui_press`, `ui_drag`, and `ui_upload` are approval-gated. Navigation is restricted by allowed-host policy by default. Upload, delete, submit, and external navigation always require explicit confirmation.

## Connection modes

- `isolated`: Playwright-managed temporary profile; default and safest mode.
- `chrome`: Chrome DevTools-managed browser session for runtime inspection.
- `current`: BrowserTools-managed current Chrome tab and DevTools extension session.

All connections are loopback-only by default. The package must expose clear status when a required browser, extension, server, or port is unavailable.

## Design-aware verification

`ui_audit` may load design context from, in order:

1. An explicit user-provided design path.
2. Conventional project files such as `.ui-design.md`, `docs/design.md`, `docs/superpowers/specs/*.md`, or `design-tokens.json`.
3. The current task/prompt when no design file exists.

The report separates observed evidence from interpretation:

```text
PASS/FAIL/WARN
Finding
Evidence: screenshot, snapshot, console, network, or style artifact
Suggested next action
```

The package must never claim visual correctness from source inspection alone when a browser observation is available.

## Watch behavior

`/ui watch` enables a session-level reminder when frontend files are modified or when a frontend task is detected. It does not capture continuously. Before an agent claims a UI task complete, the skill recommends a fresh audit at configured viewports. `/ui unwatch` disables the reminder.

Default responsive viewports:

- 1280 × 720
- 768 × 900
- 414 × 896
- 375 × 812
- 320 × 700

## Security and privacy

- Read-only observation is the default.
- Loopback binding and allowed-host restrictions are required by default.
- Cookies, authorization headers, JWTs, API keys, and similar secrets are redacted.
- Full storage/cookie access is never exposed implicitly.
- Browser profile mode is explicit; isolated mode is the default.
- Output size and retention are bounded.
- Side-effect tools require approval.
- README and SECURITY.md must document that extensions run with full Pi/user permissions and that browser observation can expose sensitive content.
- No telemetry is added by this package; third-party adapter telemetry is documented and configurable where supported.

## Package structure

```text
pi-ui-observer/
├── package.json
├── README.md
├── LICENSE
├── SECURITY.md
├── extensions/ui-observer.ts
├── skills/ui-verification/SKILL.md
├── src/adapters/
├── src/policy/
├── src/reports/
├── src/process/
├── tests/
├── docs/
└── .github/workflows/
```

`package.json` must declare `keywords: ["pi-package"]` and load the extension and skill through the `pi` manifest. Runtime dependencies are declared in `dependencies`; Pi peer packages are not bundled.

## Testing and acceptance

- Unit-test policy, redaction, host allowlist, artifact limits, adapter selection, and report formatting.
- Test extension registration and command/tool schemas.
- Test adapter failure, timeout, unavailable-browser, malformed-output, and disconnect paths.
- Test read-only tools do not require approval and interaction tools do.
- Test design-aware report generation with generic fixtures, not Anime2x-specific fixtures.
- Test viewport matrix and no-horizontal-overflow checks.
- Run package tests, type checks, package resource discovery, and a clean install smoke test.
- Validate installation using `pi install` from the GitHub repository in a temporary/global test settings context.
- Validate Pi gallery metadata requirements before publishing a release tag.
- Do not publish npm until an npm identity is available.

## Release process

1. Create public GitHub repository.
2. Add package, docs, tests, CI, and security policy.
3. Run local package and Pi resource checks.
4. Push repository and create a version tag/release.
5. Confirm Pi package gallery discovers the `pi-package` metadata.
6. Install from GitHub in a clean Pi environment.
7. Publish npm later without changing the package resource contract.
