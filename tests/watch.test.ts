import { describe, expect, it } from "vitest";
import { createWatchPolicy } from "../src/watch.js";

describe("watch policy", () => {
  it("does not capture continuously in watch mode", () => {
    const watch = createWatchPolicy();
    watch.enable();
    expect(watch.captureMode()).toBe("reminder-only");
    expect(watch.isEnabled()).toBe(true);
  });
});
