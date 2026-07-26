#!/usr/bin/env node
/**
 * Run the Rooibos suite headlessly via brs-cli (no Roku device required).
 * Captures Prairie coverage JSON from stdout for scripts/check-coverage.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rokuDeploy } from "roku-deploy";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "test-build");
const OUT_DIR = path.join(ROOT, "out");
const ZIP_NAME = "prairie-roku-tests.zip";
const RESULT_TIMEOUT_MS = 90_000;
const COVERAGE_DIR = path.join(ROOT, "coverage");

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function runTests(zipPath) {
  return new Promise((resolve) => {
    const brsCli = path.join(ROOT, "node_modules", ".bin", "brs-cli");
    const child = spawn(brsCli, [zipPath, "-c", "0"], { cwd: ROOT });

    let output = "";
    let settled = false;

    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve({ outcome, output });
    };

    const timer = setTimeout(() => {
      console.error(`\nNo RESULT line within ${RESULT_TIMEOUT_MS}ms — assuming hang/crash.`);
      finish("timeout");
    }, RESULT_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      const plain = stripAnsi(output);
      if (/\[Rooibos Result\]: PASS/.test(plain)) finish("success");
      else if (/\[Rooibos Result\]: FAIL/.test(plain)) finish("failure");
    });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", (err) => {
      console.error(err);
      finish("spawn-error");
    });
    child.on("exit", (code, signal) => {
      if (!settled) {
        console.error(
          `\nbrs-cli exited early (code=${code}, signal=${signal}) before RESULT line.`,
        );
        finish("crashed");
      }
    });
  });
}

function extractCoverage(output) {
  const plain = stripAnsi(output);
  const marker = "[PRAIRIE_COVERAGE]";
  const idx = plain.lastIndexOf(marker);
  if (idx < 0) return null;
  const after = plain.slice(idx + marker.length).trim();
  const line = after.split(/\r?\n/, 1)[0]?.trim();
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch (err) {
    console.warn("Failed to parse coverage JSON:", err.message);
    return null;
  }
}

async function main() {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(path.join(BUILD_DIR, "manifest"))) {
    console.error(`Missing ${BUILD_DIR}/manifest — run npm run build-tests first`);
    process.exit(1);
  }

  await rokuDeploy.zipPackage({
    stagingDir: BUILD_DIR,
    outDir: OUT_DIR,
    outFile: ZIP_NAME,
  });

  const zipPath = path.join(OUT_DIR, ZIP_NAME);
  const { outcome, output } = await runTests(zipPath);
  fs.writeFileSync(path.join(COVERAGE_DIR, "rooibos-output.txt"), stripAnsi(output));

  const coverage = extractCoverage(output);
  if (coverage) {
    fs.writeFileSync(path.join(COVERAGE_DIR, "hits.json"), JSON.stringify(coverage, null, 2));
  } else {
    console.warn("No [PRAIRIE_COVERAGE] payload found in test output.");
    fs.writeFileSync(path.join(COVERAGE_DIR, "hits.json"), "{}");
  }

  if (outcome !== "success") {
    console.error(`\nRooibos did not succeed (outcome: ${outcome}) — failing CI.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
