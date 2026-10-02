import { expect, it } from "vitest";
import { selectAllowedPage } from "../src/adapters/playwright-runtime.js";

it("selects a later localhost tab when the first tab is about:blank", () => {
  const pages = [{ url: () => "about:blank" }, { url: () => "http://127.0.0.1:3000/" }];
  expect(selectAllowedPage(pages)).toBe(pages[1]);
});

it("does not choose an unrelated localhost tab when an exact URL was requested", () => {
  const pages = [{ url: () => "http://127.0.0.1:3000/" }, { url: () => "http://127.0.0.1:4000/" }];
  expect(selectAllowedPage(pages, "http://127.0.0.1:4000/")).toBe(pages[1]);
  expect(selectAllowedPage(pages, "http://127.0.0.1:5000/")).toBeUndefined();
  expect(selectAllowedPage(pages, "http://127.0.0.1:4000")).toBe(pages[1]);
  expect(selectAllowedPage(pages, "http://127.0.0.1:4000/#section")).toBe(pages[1]);
});
