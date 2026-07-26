#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rokuDeploy } from "roku-deploy";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stagingDir = path.join(ROOT, "dist");
const outDir = path.join(ROOT, "out");
const outFile = "prairie-roku.zip";

if (!fs.existsSync(path.join(stagingDir, "manifest"))) {
  console.error("dist/manifest missing — run npm run build first");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
await rokuDeploy.zipPackage({
  stagingDir,
  outDir,
  outFile,
});
console.log(`Wrote ${path.join(outDir, outFile)}`);
