// Fails when a file of one of our registry items is missing from registry.json, so the CLI
// would not copy it. shadcn's own components arrive as registryDependencies and are skipped.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SHADCN = new Set([
  "button",
  "checkbox",
  "context-menu",
  "dialog",
  "input",
  "label",
  "popover",
]);
const registry = JSON.parse(readFileSync("registry.json", "utf8"));
const listed = new Set(registry.items.flatMap((item) => item.files.map((file) => file.path)));

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const ours = [
  ...files("src/lib/registry/lib"),
  ...files("src/lib/registry/ui").filter((path) => !SHADCN.has(path.split("/")[4])),
];
const missing = ours.filter((path) => !listed.has(path) && !path.endsWith("typing-check.ts"));

if (missing.length) {
  console.error(`Files missing from registry.json:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`registry.json lists all ${ours.length} registry files.`);
