// tools/validate.js — checks every pack listed in data/packs/index.json.
// Run from the project folder:   node tools/validate.js
// (No Node? Open dev/validate.html through the local server instead.)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validatePack } from "../js/validate-pack.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = join(root, "data", "packs");
const index = JSON.parse(readFileSync(join(packsDir, "index.json"), "utf8"));

const seen = new Set();
let errorCount = 0;
let warnCount = 0;
let promptCount = 0;
let answerCount = 0;

for (const file of index.packs) {
  let pack;
  try {
    pack = JSON.parse(readFileSync(join(packsDir, file), "utf8"));
  } catch (err) {
    console.log(`ERROR  ${file}: could not read/parse JSON — ${err.message}`);
    errorCount++;
    continue;
  }
  const { errors, warnings } = validatePack(pack, seen);
  promptCount += pack.prompts?.length || 0;
  answerCount += (pack.prompts || []).reduce((n, p) => n + (p.answers?.length || 0), 0);
  console.log(`\n${file}: ${pack.prompts?.length || 0} prompts, ${errors.length} errors, ${warnings.length} warnings`);
  errors.forEach((e) => console.log(`  ERROR ${e}`));
  warnings.forEach((w) => console.log(`  warn  ${w}`));
  errorCount += errors.length;
  warnCount += warnings.length;
}

console.log(`\nTotal: ${index.packs.length} packs, ${promptCount} prompts, ${answerCount} answers, ${errorCount} errors, ${warnCount} warnings`);
process.exit(errorCount ? 1 : 0);
