// Run all logic tests in Node:   node tests/run-tests.js
// (Or open tests/match.test.html through the local server to run them in a browser.)
import { tests } from "./cases.js";

let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`  ok   ${t.name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${t.name}\n       ${err.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
