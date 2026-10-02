import { describe, expect, it } from "vitest";
import { runBounded } from "../src/process/runner.js";

describe("bounded process runner", () => {
  it("returns command output", async () => {
    const result = await runBounded(process.execPath, ["-e", "process.stdout.write('ok')"]);
    expect(result).toMatchObject({ code: 0, stdout: "ok", timedOut: false });
  });

  it("reports a timeout", async () => {
    const result = await runBounded(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], { timeoutMs: 20 });
    expect(result.timedOut).toBe(true);
    expect(result.code).toBeNull();
  });
});
