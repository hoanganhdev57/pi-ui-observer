import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const required = ["extensions/ui-observer.ts", "skills"];
const failures = [];
if (pkg.name !== "pi-ui-observer") failures.push("package name must be pi-ui-observer");
if (!pkg.keywords?.includes("pi-package")) failures.push("package must include pi-package keyword");
if (pkg.engines?.node !== ">=22.19.0") failures.push("Node engine must be >=22.19.0");
for (const path of required) if (!existsSync(resolve(root, path))) failures.push(`missing Pi resource: ${path}`);
if (!/npm publication is deferred/i.test(readFileSync(resolve(root, "README.md"), "utf8"))) failures.push("README must document npm deferral");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("package metadata and Pi resources are valid");
