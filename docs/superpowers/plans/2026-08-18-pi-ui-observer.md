# pi-ui-observer Global Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a global Pi package that observes, audits, and safely debugs any web UI through screenshots, accessibility/DOM state, styles, console, and network evidence.

**Architecture:** Implement a global Pi extension and skill over a typed adapter boundary. The extension exposes read-only observation tools and approval-gated interaction tools; adapters isolate Playwright, Chrome DevTools, and BrowserTools process/transport details. Reports are normalized into one evidence model and written to bounded local artifacts.

**Tech Stack:** TypeScript, Node.js >=22.19, Pi Extension API, TypeBox, Playwright adapter/CLI, Chrome DevTools MCP/CLI, BrowserTools MCP connector, Vitest or Node test runner, GitHub Actions.

## Global Constraints

- Package name is `pi-ui-observer`.
- First distribution is a public GitHub repository with Pi package metadata and Git install support; npm publication and verified Pi package gallery listing are deferred.
- The package is global and must not contain Anime2x-specific selectors, routes, copy, or assumptions.
- V1 supports Playwright, Chrome DevTools, and BrowserTools adapters.
- Read-only observation is the default.
- Click, fill, select, upload, delete, submit, external navigation, and other side-effecting actions require explicit approval.
- Loopback binding and allowed-host restrictions are required by default.
- Cookies, authorization headers, JWTs, API keys, and similar secrets must be redacted.
- Isolated browser mode is the default.
- Default responsive viewports are 1280x720, 768x900, 414x896, 375x812, and 320x700.
- No npm publication occurs until an npm identity is available.
- Do not add telemetry.

---

## File map

- Create `package.json`: package identity, `pi` manifest, scripts, runtime dependencies, `pi-package` keyword.
- Create `extensions/ui-observer.ts`: Pi registration, commands, tool execution, lifecycle cleanup.
- Create `skills/ui-verification/SKILL.md`: global evidence-first UI verification workflow.
- Create `src/types.ts`: adapter, connection, evidence, policy, and report types.
- Create `src/policy/approval.ts`: read-only/side-effect policy and Pi confirmation bridge.
- Create `src/policy/redaction.ts`: secret/header/token redaction and bounded output.
- Create `src/policy/hosts.ts`: localhost/allowed-host validation.
- Create `src/process/runner.ts`: bounded child-process lifecycle, timeout, cancellation, and normalized errors.
- Create `src/adapters/adapter.ts`: `UiAdapter` interface and adapter registry.
- Create `src/adapters/playwright.ts`: isolated Playwright browser adapter.
- Create `src/adapters/chrome-devtools.ts`: Chrome DevTools adapter.
- Create `src/adapters/browser-tools.ts`: BrowserTools connector adapter.
- Create `src/session/manager.ts`: connection selection, current adapter, disconnect, and status.
- Create `src/reports/audit.ts`: combined UI audit and design-context report generation.
- Create `src/reports/artifacts.ts`: bounded artifact directory and manifest writer.
- Create `src/commands.ts`: `/ui` command parser and handlers.
- Create `tests/policy.test.ts`, `tests/redaction.test.ts`, `tests/runner.test.ts`, `tests/session.test.ts`, `tests/reports.test.ts`, `tests/extension.test.ts`.
- Create `README.md`, `SECURITY.md`, `LICENSE`, `CONTRIBUTING.md`.
- Create `.github/workflows/ci.yml` and release workflow after local CI is green.

---

### Task 1: Scaffold the global Pi package and resource manifest

**Files:**
- Create: `package.json`
- Create: `README.md`
- Create: `LICENSE`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `.gitignore`
- Test: `tests/manifest.test.ts`

**Interfaces:**
- Produces a package manifest with name `pi-ui-observer`, keyword `pi-package`, `pi.extensions`, and `pi.skills`.
- Requires Node `>=22.19.0`.
- Exposes scripts `test`, `typecheck`, `lint`, `package:check`, and `ci`.

- [ ] **Step 1: Write failing manifest tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

it("declares a global Pi package and resources", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.name).toBe("pi-ui-observer");
  expect(pkg.keywords).toContain("pi-package");
  expect(pkg.engines.node).toBe(">=22.19.0");
  expect(pkg.pi.extensions).toEqual(["extensions/ui-observer.ts"]);
  expect(pkg.pi.skills).toEqual(["skills"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/manifest.test.ts
```

Expected: FAIL because the package manifest does not exist.

- [ ] **Step 3: Create package metadata and documentation skeleton**

Use this manifest shape:

```json
{
  "name": "pi-ui-observer",
  "version": "0.1.0",
  "description": "Global Pi browser UI observation and evidence-first audit tools",
  "keywords": ["pi-package", "browser", "ui", "debugging", "mcp"],
  "engines": { "node": ">=22.19.0" },
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "package:check": "node scripts/check-package.mjs",
    "ci": "npm run typecheck && npm test && npm run package:check"
  },
  "dependencies": {},
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "typebox": "*"
  },
  "pi": {
    "extensions": ["extensions/ui-observer.ts"],
    "skills": ["skills"]
  }
}
```

Keep README focused on install, `/ui` commands, adapter prerequisites, artifact handling, and examples. SECURITY.md must explicitly warn that Pi extensions have full user permissions and browser observation can expose sensitive content.

- [ ] **Step 4: Run manifest tests and typecheck**

Run:

```bash
npm install
npm test -- tests/manifest.test.ts
npm run typecheck
```

Expected: manifest test PASS; typecheck may have no source files yet but must exit successfully.

- [ ] **Step 5: Commit the scaffold**

```bash
git add package.json README.md LICENSE SECURITY.md CONTRIBUTING.md .gitignore tests/manifest.test.ts
 git commit -m "chore: scaffold pi ui observer package"
```

---

### Task 2: Implement policy, redaction, and bounded process execution

**Files:**
- Create: `src/types.ts`
- Create: `src/policy/approval.ts`
- Create: `src/policy/redaction.ts`
- Create: `src/policy/hosts.ts`
- Create: `src/process/runner.ts`
- Test: `tests/policy.test.ts`
- Test: `tests/redaction.test.ts`
- Test: `tests/runner.test.ts`

**Interfaces:**
- Produces `ActionRisk = "read" | "interaction" | "destructive"`.
- Produces `isAllowedHost(url, policy): boolean`.
- Produces `redactSecrets(value): unknown`.
- Produces `runBounded(command, options): Promise<ProcessResult>`.
- Produces `requiresApproval(risk): boolean`, where only `read` returns false.

- [ ] **Step 1: Write failing policy and redaction tests**

```ts
it("allows localhost but rejects an external host by default", () => {
  expect(isAllowedHost("http://localhost:3000", defaultHostPolicy)).toBe(true);
  expect(isAllowedHost("http://127.0.0.1:5000", defaultHostPolicy)).toBe(true);
  expect(isAllowedHost("https://example.com", defaultHostPolicy)).toBe(false);
});

it("redacts secrets in headers and nested text", () => {
  const result = redactSecrets({
    headers: { Authorization: "Bearer secret", Cookie: "session=abc" },
    text: "token=abc123 jwt eyJabc.def.ghi",
  });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(JSON.stringify(result)).not.toContain("abc123");
});

it("requires approval only for side-effecting actions", () => {
  expect(requiresApproval("read")).toBe(false);
  expect(requiresApproval("interaction")).toBe(true);
  expect(requiresApproval("destructive")).toBe(true);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/policy.test.ts tests/redaction.test.ts tests/runner.test.ts
```

Expected: FAIL because policy/process modules do not exist.

- [ ] **Step 3: Implement policy and process modules**

Use URL parsing with explicit `localhost`, `127.0.0.1`, and configured host matching. Redact case-insensitive authorization/cookie/set-cookie/proxy-auth keys, common token key names, JWT-like strings, and secret environment values supplied by the adapter. Cap stdout/stderr and report truncation. Kill timed-out child processes and return structured `timeout`, `exit`, or `spawn` errors.

- [ ] **Step 4: Run policy/process tests**

Run:

```bash
npm test -- tests/policy.test.ts tests/redaction.test.ts tests/runner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit policy foundation**

```bash
git add src/types.ts src/policy src/process tests/policy.test.ts tests/redaction.test.ts tests/runner.test.ts
 git commit -m "feat: add safe ui observation policies"
```

---

### Task 3: Implement adapter interface, registry, and connection manager

**Files:**
- Create: `src/adapters/adapter.ts`
- Create: `src/session/manager.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- `UiAdapter` exposes `name`, `status`, `connect`, `currentPage`, `snapshot`, `screenshot`, `console`, `network`, `styles`, `audit`, and `disconnect`.
- `AdapterRegistry` registers `playwright`, `chrome`, and `current` adapter factories.
- `UiSessionManager.connect(mode, options)`, `.status()`, `.active()`, and `.disconnect()` are the extension-facing lifecycle API.

- [ ] **Step 1: Write failing session tests**

```ts
it("selects isolated Playwright for isolated mode", async () => {
  const manager = new UiSessionManager(testRegistry);
  await manager.connect("isolated", { url: "http://localhost:3000" });
  expect(manager.active()?.adapter).toBe("playwright");
});

it("reports adapter unavailable without claiming a connection", async () => {
  const manager = new UiSessionManager(unavailableRegistry);
  await expect(manager.connect("current", {})).rejects.toMatchObject({ code: "ADAPTER_UNAVAILABLE" });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/session.test.ts
```

Expected: FAIL because the adapter/session modules do not exist.

- [ ] **Step 3: Implement typed adapter lifecycle**

Normalize `isolated → playwright`, `chrome → chrome-devtools`, and `current → browser-tools`. Keep one active connection per Pi session. Store no cookies or page contents in persistent package state. On session shutdown, disconnect all adapter processes and close temporary browser profiles.

- [ ] **Step 4: Run session tests**

Run:

```bash
npm test -- tests/session.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit adapter boundary**

```bash
git add src/adapters/adapter.ts src/session/manager.ts tests/session.test.ts
 git commit -m "feat: add browser adapter session boundary"
```

---

### Task 4: Implement Playwright, Chrome DevTools, and BrowserTools adapters

**Files:**
- Create: `src/adapters/playwright.ts`
- Create: `src/adapters/chrome-devtools.ts`
- Create: `src/adapters/browser-tools.ts`
- Modify: `src/session/manager.ts`
- Test: `tests/adapters.test.ts`
- Test fixtures: `tests/fixtures/*`

**Interfaces:**
- Each adapter implements the Task 3 `UiAdapter` contract.
- Adapters return normalized `PageInfo`, `UiSnapshot`, `Artifact`, `ConsoleReport`, `NetworkReport`, `StyleReport`, and `UiAudit` objects.
- No adapter returns raw credentials, cookies, or unbounded logs.

- [ ] **Step 1: Write failing adapter contract tests with mocked runners**

```ts
it.each(["playwright", "chrome-devtools", "browser-tools"])('%s normalizes page state', async (name) => {
  const adapter = createAdapter(name, fakeTransport);
  await adapter.connect({ url: "http://localhost:3000" });
  await expect(adapter.currentPage()).resolves.toMatchObject({ url: "http://localhost:3000" });
  await expect(adapter.snapshot()).resolves.toHaveProperty("nodes");
});

it("returns a structured unavailable error when BrowserTools connector is absent", async () => {
  const adapter = createBrowserToolsAdapter(failingTransport);
  await expect(adapter.connect({})).rejects.toMatchObject({ code: "ADAPTER_UNAVAILABLE" });
});
```

- [ ] **Step 2: Run adapter tests to verify failure**

Run:

```bash
npm test -- tests/adapters.test.ts
```

Expected: FAIL because adapter implementations do not exist.

- [ ] **Step 3: Implement Playwright adapter**

Use an isolated temporary profile by default. Support navigation, viewport, accessibility snapshot, screenshot, console, network, computed styles, and bounded audit data. Enforce allowed hosts before navigation. Keep adapter-specific code behind the interface.

- [ ] **Step 4: Implement Chrome DevTools adapter**

Launch or connect to Chrome DevTools MCP/CLI through `runBounded`, normalize its structured output, pass `--no-usage-statistics` when supported, and report version/connection failures clearly. Do not expose raw MCP payloads without redaction and size limits.

- [ ] **Step 5: Implement BrowserTools adapter**

Connect to the local BrowserTools MCP connector, target the selected tab, normalize screenshots/console/network/audit results, and require explicit current-tab selection when more than one tab is available. Never silently choose a different tab.

- [ ] **Step 6: Run adapter contract tests**

Run:

```bash
npm test -- tests/adapters.test.ts
npm run typecheck
```

Expected: PASS for mocked adapters and no type errors.

- [ ] **Step 7: Commit adapters**

```bash
git add src/adapters src/session tests/adapters.test.ts tests/fixtures
 git commit -m "feat: add browser observation adapters"
```

---

### Task 5: Implement reports, design context, commands, and Pi extension

**Files:**
- Create: `src/reports/artifacts.ts`
- Create: `src/reports/audit.ts`
- Create: `src/commands.ts`
- Create: `extensions/ui-observer.ts`
- Create: `skills/ui-verification/SKILL.md`
- Test: `tests/reports.test.ts`
- Test: `tests/extension.test.ts`

**Interfaces:**
- `writeArtifact(runId, artifact): Promise<ArtifactRef>` writes bounded files and a manifest.
- `buildUiAudit(input): UiAudit` separates evidence, findings, and recommendations.
- Extension registers tools `ui_current_page`, `ui_snapshot`, `ui_screenshot`, `ui_console`, `ui_network`, `ui_styles`, `ui_audit`, and `ui_set_viewport`.
- Extension registers approval-gated interaction tools and `/ui` command handlers.

- [ ] **Step 1: Write failing report/extension tests**

```ts
it("writes a bounded artifact manifest", async () => {
  const result = await writeArtifact("run-1", { kind: "screenshot", bytes: pngBytes });
  expect(result.path).toContain(".ui-observer");
  expect(result.manifest).toMatchObject({ runId: "run-1", kind: "screenshot" });
});

it("marks missing browser evidence as a warning rather than a pass", () => {
  const audit = buildUiAudit({ snapshot: null, screenshot: null, console: [], network: [] });
  expect(audit.findings).toContainEqual(expect.objectContaining({ severity: "warn" }));
});

it("registers read-only tools and approval-gated interaction tools", () => {
  const pi = createFakeExtensionApi();
  registerUiObserver(pi);
  expect(pi.tools.get("ui_snapshot").risk).toBe("read");
  expect(pi.tools.get("ui_click").risk).toBe("interaction");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/reports.test.ts tests/extension.test.ts
```

Expected: FAIL because report/extension modules do not exist.

- [ ] **Step 3: Implement artifact and audit reporting**

Use `.ui-observer/runs/<timestamp>-<id>/` under the current project by default, with a configured output override. Store screenshots, snapshot JSON, console JSON, network JSON/HAR where available, styles, and `manifest.json`. Cap artifact count/size and include adapter, URL, viewport, and timestamp. Design context discovery checks explicit path first, then `.ui-design.md`, `docs/design.md`, `docs/superpowers/specs/*.md`, and `design-tokens.json`.

- [ ] **Step 4: Implement Pi extension tools and commands**

Use `pi.registerTool()` and TypeBox schemas. Read-only tools call the active session manager directly. Interaction tools call `ctx.ui.confirm()` with the target, URL, action, and risk before execution. Register `/ui status`, `/ui connect <mode>`, `/ui inspect`, `/ui screenshot`, `/ui audit`, `/ui watch`, and `/ui unwatch`. Register `session_shutdown` cleanup.

- [ ] **Step 5: Implement verification skill**

The skill must instruct Pi to:

1. Identify the active page and adapter.
2. Capture snapshot and screenshot.
3. Read console errors and failed network requests.
4. Compare against project design context.
5. Check required responsive viewports.
6. Fix or report findings with artifact evidence.
7. Never claim UI completion from source inspection alone when browser evidence is available.

- [ ] **Step 6: Run report/extension tests**

Run:

```bash
npm test -- tests/reports.test.ts tests/extension.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the Pi extension and skill**

```bash
git add src/reports src/commands.ts extensions skills tests/reports.test.ts tests/extension.test.ts
 git commit -m "feat: add global pi ui observation tools"
```

---

### Task 6: Add watch policy, documentation, CI, and package checks

**Files:**
- Modify: `extensions/ui-observer.ts`
- Modify: `src/commands.ts`
- Create: `scripts/check-package.mjs`
- Create: `.github/workflows/ci.yml`
- Test: `tests/watch.test.ts`
- Modify: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`

**Interfaces:**
- `/ui watch` enables session-level frontend-change reminders; `/ui unwatch` disables them.
- `check-package.mjs` validates package manifest, resource paths, README install instructions, and absence of npm publication claims.
- CI runs install, typecheck, tests, and package checks on Windows and Ubuntu where practical.

- [ ] **Step 1: Write failing watch/package checks**

```ts
it("does not capture continuously in watch mode", () => {
  const watch = createWatchPolicy();
  watch.enable();
  expect(watch.captureMode()).toBe("reminder-only");
});
```

The package check must fail if the manifest points at missing extension/skill paths or if package name/keyword/Node engine is wrong.

- [ ] **Step 2: Run checks to verify failure**

Run:

```bash
npm test -- tests/watch.test.ts
npm run package:check
```

Expected: watch test/package check fail until implemented.

- [ ] **Step 3: Implement watch and package validation**

Use Pi frontend-related events only to set a reminder/status; do not start background browser capture from the extension factory. Start resources on `session_start` or an explicit command, and close them on `session_shutdown`. Keep watch state session-scoped.

- [ ] **Step 4: Document installation and activation**

README must include:

```text
pi install git:github.com/hoanganhdev57/pi-ui-observer
/ui status
/ui connect isolated
/ui audit
```

Document Playwright/Chrome DevTools/BrowserTools prerequisites separately, explain current-tab privacy, redaction, artifact locations, approval behavior, and npm deferral.

- [ ] **Step 5: Add CI and run all checks**

Run:

```bash
npm run ci
```

Expected: typecheck, tests, and package check pass. CI must run the same command on push and pull request.

- [ ] **Step 6: Commit release readiness**

```bash
git add extensions src/commands.ts scripts tests/watch.test.ts README.md SECURITY.md CONTRIBUTING.md .github/workflows/ci.yml
 git commit -m "chore: add package checks and ci"
```

---

### Task 7: Validate GitHub installation and publish a GitHub release

**Files:**
- Modify: `README.md` only if installation validation finds inaccurate instructions.
- Create: release tag and GitHub release metadata outside the source tree.

**Interfaces:**
- Produces a public GitHub repository with a tagged package release.
- Produces a clean `pi install git:<owner>/pi-ui-observer` smoke-test result.
- Does not publish npm.

- [ ] **Step 1: Run final local verification**

Run:

```bash
npm run ci
git diff --check
git status --short
```

Expected: all checks pass and no uncommitted source changes remain.

- [ ] **Step 2: Create the GitHub repository**

Use the authenticated GitHub account already available in the environment. Create a public repository named `pi-ui-observer`, set the local remote, and push `main`:

```bash
gh repo create hoanganhdev57/pi-ui-observer --public --source=. --remote=origin --push
```

Use the actual authenticated owner returned by `gh auth status`; do not invent an owner or force-push over an existing repository.

- [ ] **Step 3: Validate clean GitHub installation**

From a temporary directory with an isolated Pi settings context, run:

```bash
pi install git:github.com/hoanganhdev57/pi-ui-observer@v0.1.0
pi list
```

Start Pi in a disposable project and verify `/ui status` is registered. Do not inspect or modify the user’s unrelated global settings without approval.

- [ ] **Step 4: Tag and publish the release**

```bash
git tag -a v0.1.0 -m "Release pi-ui-observer v0.1.0"
git push origin main v0.1.0
gh release create v0.1.0 --title "pi-ui-observer v0.1.0" --generate-notes
```

- [ ] **Step 5: Record Pi gallery deferral**

The Pi package documentation only confirms `pi-package` gallery eligibility for npm packages. Document GitHub installation as the available source and state that gallery listing will be checked after npm publication. Do not claim gallery visibility from a GitHub-only release.

- [ ] **Step 6: Final release verification**

Run:

```bash
git status --short
git log -5 --oneline
gh release view v0.1.0
```

Expected: clean source tree, tagged release visible, and installation path documented. npm remains unpublished by design.
