// daily.js — picks "today's prompt" from the date alone, no server needed.
//
// How it works:
//   1. Take every prompt from every pack and sort them by id (stable order).
//   2. Shuffle that list with a FIXED seed, so everyone gets the same shuffle.
//   3. Day 0 is LAUNCH_DATE. On day N you get prompt number N (wrapping round
//      when the list runs out), so prompts don't repeat until all are used.
//
// Note: adding or removing prompts changes the shuffle, which changes which
// prompt past dates show in the Archive. See docs/DECISIONS.md.

export const LAUNCH_DATE = "2026-11-01"; // Daily #1
const SHUFFLE_SEED = 20261101;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for a Date, using the player's local calendar day. */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days between two "YYYY-MM-DD" strings (b - a). Uses UTC so DST can't shift it. */
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** "YYYY-MM-DD" plus/minus some days. */
export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** Daily number shown to players: launch day is #1. */
export function dailyNumber(key) {
  return daysBetween(LAUNCH_DATE, key) + 1;
}

// Small seeded random-number generator (mulberry32). Same seed = same numbers.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the daily rotation from all packs.
 * Returns an array of { packId, prompt }.
 */
export function buildRotation(packs) {
  const all = [];
  for (const pack of packs) for (const prompt of pack.prompts) all.push({ packId: pack.id, prompt });
  all.sort((a, b) => (a.prompt.id < b.prompt.id ? -1 : a.prompt.id > b.prompt.id ? 1 : 0));
  const rand = mulberry32(SHUFFLE_SEED);
  for (let i = all.length - 1; i > 0; i--) {         // Fisher-Yates shuffle
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/** The prompt for a given date key, or null before launch. */
export function promptForDate(rotation, key) {
  const n = daysBetween(LAUNCH_DATE, key);
  if (n < 0 || rotation.length === 0) return null;
  return rotation[n % rotation.length];
}
