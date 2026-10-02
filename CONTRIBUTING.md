# Contributing

Run the full local checks before submitting changes:

```bash
npm install
npm run ci
```

Keep adapter-specific code behind the `UiAdapter` interface. Do not add application-specific selectors or telemetry. New browser capabilities must preserve read-only defaults, host restrictions, secret redaction, bounded output, and approval for side effects.
