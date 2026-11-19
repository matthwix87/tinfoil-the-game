// scoring.js — rarity tiers and points.
//
// Every answer has a "depth" from 0 to 100 (higher = more obscure).
// Depth decides the tier name, icon and colour, and the points you get.

// Tier table. `min` is the lowest depth that belongs to the tier.
// Colour is never the only signal: each tier also has a name and an icon.
export const TIERS = [
  { id: "mainstream", min: 0,   name: "Mainstream",  icon: "📺", square: "⬜", blurb: "Everybody knows this one." },
  { id: "rumor",      min: 20,  name: "Rumor",       icon: "🗣️", square: "🟦", blurb: "People have heard whispers." },
  { id: "coverup",    min: 45,  name: "Cover-up",    icon: "🕵️", square: "🟪", blurb: "You had to dig for that." },
  { id: "redacted",   min: 70,  name: "Redacted",    icon: "🗂️", square: "⬛", blurb: "Most files have this blacked out." },
  { id: "topsecret",  min: 90,  name: "Top Secret",  icon: "🔒", square: "🟥", blurb: "Almost nobody knows this." },
  { id: "gem",        min: 100, name: "Tinfoil Gem", icon: "🛸", square: "🛸", blurb: "The rarest answer. The truth is out there." },
];

/** Find the tier for a depth (0-100). */
export function tierFor(depth) {
  let found = TIERS[0];
  for (const t of TIERS) if (depth >= t.min) found = t;
  return found;
}

// Points rules (see docs/DECISIONS.md).
export const GEM_BONUS = 150;   // extra on top of the gem's 100 depth points
export const HINT_COST = 25;    // taking the hint costs this many points
export const SWEEP_BONUS = 100; // found every single answer

/**
 * Total score for a finished (or in-progress) round.
 * found: array of { depth, isGem }
 */
export function scoreRound({ found, hintUsed = false, sweep = false }) {
  let score = 0;
  for (const f of found) {
    score += f.depth;
    if (f.isGem) score += GEM_BONUS;
  }
  if (hintUsed) score -= HINT_COST;
  if (sweep) score += SWEEP_BONUS;
  return Math.max(0, score);
}
