# Security Policy

## Scope

`pi-ui-observer` is a Pi extension with the permissions of the local Pi process. It can inspect browser screenshots, accessibility/DOM state, computed styles, console output, and network metadata. A connected current browser tab may contain sensitive information.

## Safe defaults

- Observation is read-only by default.
- Isolated browser sessions are preferred.
- Connections are loopback-only by default.
- Hosts are allowlisted; localhost is the default.
- Cookies, authorization headers, tokens, and similar secrets are redacted.
- Interactions and destructive operations require explicit approval.
- No telemetry is added by this package.
- Isolated mode blocks new document navigations and popups after the initial allowlisted page; this is a containment policy, not a general-purpose browser workflow.

Do not connect the package to a personal browser profile when an isolated profile is sufficient. Review every adapter and MCP server before installation.

## Reporting a vulnerability

Please open a private security report through the repository's GitHub security reporting flow. Do not include real cookies, tokens, private page content, or credentials in an issue.
