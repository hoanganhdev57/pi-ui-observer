import { describe, expect, it, vi } from "vitest";
import { createPlaywrightTransport } from "../src/adapters/playwright-runtime.js";

describe("runtime connection policy", () => {
  it("rejects off-host navigation before launching a browser", async () => {
    const transport = createPlaywrightTransport();
    await expect(transport.connect({ url: "https://example.com" })).rejects.toMatchObject({ code: "HOST_NOT_ALLOWED" });
  });

  it("rejects off-host CDP endpoints before connecting", async () => {
    const transport = createPlaywrightTransport({ cdpEndpoint: "http://example.com:9222" });
    await expect(transport.connect({})).rejects.toMatchObject({ code: "HOST_NOT_ALLOWED" });
  });

  it("reports a missing CDP endpoint as unavailable", async () => {
    const transport = createPlaywrightTransport({ cdpEndpoint: "http://127.0.0.1:1" });
    await expect(transport.status()).resolves.toMatchObject({ available: false });
  });
});
