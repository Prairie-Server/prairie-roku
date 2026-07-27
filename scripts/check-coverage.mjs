#!/usr/bin/env node
/**
 * Enforce 90% line coverage on logic modules (mirrors prairie-smarttv gate).
 *
 * Scoped files: source/lib/ (all .bs files except specs and CoverageDump.bs)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THRESHOLD = 90;
const inventoryPath = path.join(ROOT, "coverage", "inventory.json");
const hitsPath = path.join(ROOT, "coverage", "hits.json");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function asHitSet(fileHits) {
  if (!fileHits || typeof fileHits !== "object") return new Set();
  const set = new Set();
  for (const [key, value] of Object.entries(fileHits)) {
    if (value) set.add(String(key));
  }
  return set;
}

function main() {
  if (!fs.existsSync(inventoryPath) || !fs.existsSync(hitsPath)) {
    console.error(
      "Missing coverage/inventory.json or coverage/hits.json — run test:coverage first.",
    );
    process.exit(1);
  }

  const inventory = loadJson(inventoryPath);
  const hits = loadJson(hitsPath);

  let total = 0;
  let covered = 0;
  const perFile = [];

  for (const [file, info] of Object.entries(inventory.files ?? {})) {
    const lines = info.executableLines ?? [];
    const hitSet = asHitSet(hits[file]);
    let fileCovered = 0;
    for (const line of lines) {
      total += 1;
      if (hitSet.has(String(line))) {
        covered += 1;
        fileCovered += 1;
      }
    }
    const pct = lines.length === 0 ? 100 : (fileCovered / lines.length) * 100;
    perFile.push({ file, lines: lines.length, covered: fileCovered, pct });
  }

  if (total === 0) {
    console.error("Coverage inventory contains no executable lines.");
    process.exit(1);
  }

  const percent = (covered / total) * 100;
  const summary = {
    total,
    covered,
    percent: Number(percent.toFixed(2)),
    threshold: THRESHOLD,
    files: perFile,
  };
  fs.writeFileSync(path.join(ROOT, "coverage", "summary.json"), JSON.stringify(summary, null, 2));

  console.log("Coverage (logic modules: source/lib/**):");
  for (const row of perFile) {
    console.log(`  ${row.file}: ${row.covered}/${row.lines} lines (${row.pct.toFixed(1)}%)`);
  }
  console.log(`  TOTAL: ${covered}/${total} lines (${percent.toFixed(1)}%)`);
  console.log(`  Threshold: ${THRESHOLD}%`);

  if (percent + 1e-9 < THRESHOLD) {
    console.error(`\nCoverage ${percent.toFixed(1)}% is below the ${THRESHOLD}% gate.`);
    process.exit(1);
  }
  console.log("\nCoverage gate passed.");
}

main();
