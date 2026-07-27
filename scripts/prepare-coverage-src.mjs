#!/usr/bin/env node
/**
 * Copy channel sources into .coverage-src and instrument logic modules so the
 * headless Rooibos run can emit a line-hit map for the 90% coverage gate.
 *
 * Include globs (keep in sync with scripts/check-coverage.mjs):
 *   source/lib/ (all .bs files, excluding .spec.bs and CoverageDump.bs)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, ".coverage-src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function shouldInstrument(relPosix) {
  if (!relPosix.startsWith("source/lib/")) return false;
  if (!relPosix.endsWith(".bs")) return false;
  if (relPosix.endsWith(".spec.bs")) return false;
  if (relPosix.endsWith("CoverageDump.bs")) return false;
  return true;
}

function isExecutableStatement(trimmed, aaDepth, inFunction) {
  if (!inFunction) return false;
  if (!trimmed) return false;
  if (trimmed.startsWith("'") || trimmed.startsWith("rem ")) return false;
  if (trimmed.startsWith("@")) return false;
  if (
    /^(namespace|end namespace|class|end class|function|end function|sub|end sub|import)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  if (trimmed === "{" || trimmed === "}" || trimmed === "[" || trimmed === "]") return false;
  if (/^(else|then)\b/i.test(trimmed)) return false;
  if (aaDepth > 0) return false;
  if (/^[A-Za-z_][\w]*\s*:/.test(trimmed)) return false;

  return (
    /^(return|if|else if|for|while|exit|print)\b/i.test(trimmed) ||
    /^[A-Za-z_][\w\.]*\s*=/.test(trimmed) ||
    /\w\s*\(.*\)\s*$/.test(trimmed)
  );
}

/** Strip BrightScript comments while preserving apostrophes inside "strings". */
function codeWithoutComments(line) {
  let out = "";
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      out += ch;
      if (ch === '"') {
        // BrightScript escapes quotes by doubling them.
        if (line[i + 1] === '"') {
          out += '"';
          i += 1;
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "'") break;
    if ((ch === "r" || ch === "R") && /^\s*rem\b/i.test(line.slice(i))) break;
    out += ch;
  }
  return out;
}

/** Count `{`/`[` nesting outside of string literals. */
function adjustAaDepth(code, depth) {
  let next = depth;
  let inString = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inString) {
      if (ch === '"') {
        if (code[i + 1] === '"') i += 1;
        else inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") next += 1;
    else if (ch === "}" || ch === "]") next = Math.max(0, next - 1);
  }
  return next;
}

function instrumentBs(source, relPosix) {
  const lines = source.split(/\r?\n/);
  const out = [];
  let aaDepth = 0;
  let inFunction = false;
  const executable = [];

  out.push(`' @coverage-file ${relPosix}`);
  // PrairieCovHit lives in source/lib/CoverageDump.bs (source scope). Component
  // scopes that import this file also import CoverageDump via MainScene prepare.

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const code = codeWithoutComments(line);
    const trimmed = code.trim();
    const originalLine = i + 1;
    const depthAtStart = aaDepth;

    if (/^(function|sub)\b/i.test(trimmed)) {
      inFunction = true;
    }

    if (isExecutableStatement(trimmed, depthAtStart, inFunction)) {
      executable.push(originalLine);
      out.push(`PrairieCovHit("${relPosix}", ${originalLine}) ' cov:${originalLine}`);
    }

    out.push(line);

    if (/^(end function|end sub)\b/i.test(trimmed)) {
      inFunction = false;
    }

    aaDepth = adjustAaDepth(code, aaDepth);
  }

  return { source: out.join("\n") + "\n", executable };
}

function copyTree() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(ROOT, "coverage"), { recursive: true });

  const files = walk(SRC);
  const meta = { files: {} };

  for (const full of files) {
    const rel = path.relative(SRC, full);
    const relPosix = rel.split(path.sep).join("/");
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (shouldInstrument(relPosix)) {
      const raw = fs.readFileSync(full, "utf8");
      const { source, executable } = instrumentBs(raw, relPosix);
      fs.writeFileSync(dest, source);
      meta.files[relPosix] = { executableLines: executable };
    } else {
      fs.copyFileSync(full, dest);
    }
  }

  // Component scopes that pull instrumented lib files need the coverage helper.
  function patchComponentScripts(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        patchComponentScripts(full);
        continue;
      }
      if (!entry.name.endsWith(".bs")) continue;
      const source = fs.readFileSync(full, "utf8");
      if (!source.includes("CoverageDump.bs")) {
        fs.writeFileSync(full, `import "pkg:/source/lib/CoverageDump.bs"\n` + source);
      }
    }
  }
  patchComponentScripts(path.join(OUT, "components"));

  // Rooibos_init creates RooibosScene; production MainScene would fight it under brs-cli.
  fs.writeFileSync(
    path.join(OUT, "source", "main.bs"),
    `' Test entrypoint - Rooibos plugin prepends Rooibos_init("RooibosScene").
sub main(_args as dynamic)
end sub
`,
  );

  // Force the headless-safe test manifest (file remap via bsconfig is unreliable across BSC versions).
  fs.copyFileSync(path.join(ROOT, "test.manifest"), path.join(OUT, "manifest"));

  const dumpPath = path.join(OUT, "source", "lib", "CoverageDump.bs");
  fs.writeFileSync(
    dumpPath,
    `sub PrairieCovHit(filePath as string, lineNumber as integer)
    root = GetGlobalAA()
    if root.prairieCoverage = invalid
        root.prairieCoverage = {}
    end if
    fileHits = root.prairieCoverage[filePath]
    if fileHits = invalid
        fileHits = {}
        root.prairieCoverage[filePath] = fileHits
    end if
    fileHits[lineNumber.toStr()] = true
end sub

function PrairieCoverageDumpJson() as string
    cov = GetGlobalAA().prairieCoverage
    if cov = invalid
        return "{}"
    end if
    return FormatJson(cov)
end function
`,
  );

  fs.writeFileSync(path.join(ROOT, "coverage", "inventory.json"), JSON.stringify(meta, null, 2));
  console.log(
    `Prepared coverage sources (${Object.keys(meta.files).length} instrumented) → ${OUT}`,
  );
}

copyTree();
