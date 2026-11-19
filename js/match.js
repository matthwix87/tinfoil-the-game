// match.js — turns whatever the player typed into "which answer did they mean?"
//
// Three steps, cheapest first:
//   1. normalize()  — lowercase, strip accents, punctuation and spaces,
//                     so "Mr. Mime", "mr mime" and "MRMIME" all look the same.
//   2. exact match  — against every answer name AND every alias.
//   3. fuzzy match  — allow small typos (edit distance), but only for longer
//                     words, so short guesses like "Io" never match by accident.
//
// This file has no DOM code, so it can be tested in Node (see tests/).

/**
 * Make a string comparable: "Côte d'Ivoire" -> "cotedivoire".
 * - accents removed (é -> e)
 * - a leading "the " is ignored
 * - "&" becomes "and"
 * - everything that is not a letter or digit is dropped (spaces too)
 */
export function normalize(text) {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFD")                 // split "é" into "e" + accent mark
    .replace(/[̀-ͯ]/g, "")  // ...then delete the accent marks
    .toLowerCase()
    .replace(/^\s*the\s+/, "")        // "The Gambia" = "Gambia", "The Puppet" = "Puppet"
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");       // keep only a-z and 0-9
}

/**
 * Edit distance: how many single-letter edits turn string a into string b.
 * An edit is insert, delete, replace, or swapping two neighbouring letters
 * ("bonnei" -> "bonnie" is 1 edit). "chica" -> "chika" = 1.
 * (Technically: "optimal string alignment" distance.)
 */
export function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // d[i][j] = distance between the first i letters of a and first j of b
  const d = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // swapped letters
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * How many typos we forgive, based on word length (normalized letters).
 *   under 5 letters -> 0 (no fuzzy at all; the plan says never for < 4,
 *                         and we also keep 4-letter words strict, see DECISIONS.md)
 *   5 to 8 letters  -> 1
 *   9+ letters      -> 2
 */
export function allowedEdits(length) {
  if (length < 5) return 0;
  if (length <= 8) return 1;
  return 2;
}

/**
 * Build a lookup list for one prompt: every name and alias, normalized.
 * Each entry remembers which answer (by index) it belongs to.
 */
export function buildIndex(prompt) {
  const entries = [];
  prompt.answers.forEach((answer, index) => {
    const names = [answer.name, ...(answer.aliases || [])];
    for (const n of names) {
      const key = normalize(n);
      if (key) entries.push({ key, index });
    }
  });
  // Known wrong answers (e.g. "Australia" for a list of landlocked countries)
  // are stored so they are never fuzzy-matched onto a real answer.
  const blocked = new Set((prompt.notAnswers || []).map(normalize).filter(Boolean));
  return { entries, blocked };
}

/**
 * Work out what a guess means.
 * Returns one of:
 *   { kind: "empty" }                          nothing typed
 *   { kind: "exact", index }                   name or alias matched exactly
 *   { kind: "fuzzy", index, distance }         close enough (a typo)
 *   { kind: "ambiguous", indexes }             equally close to 2+ answers
 *   { kind: "none" }                           not an answer
 *
 * `index` is the position of the answer in prompt.answers.
 * options.fuzzy = false turns typo-tolerance off entirely.
 */
export function matchGuess(prompt, guess, options = {}) {
  const fuzzy = options.fuzzy !== false;
  const index = options.index || buildIndex(prompt);
  const key = normalize(guess);
  if (!key) return { kind: "empty" };

  // 1. Exact match on name or alias.
  const exact = index.entries.find((e) => e.key === key);
  if (exact) return { kind: "exact", index: exact.index };

  // A guess the pack author listed as a known wrong answer: never fuzzy it.
  if (!fuzzy || index.blocked.has(key)) return { kind: "none" };

  // 2. Fuzzy match. The typo allowance uses the SHORTER of the two words,
  //    which keeps e.g. "Austria" (7) from matching "Australia" (9).
  let best = Infinity;
  let bestIndexes = new Set();
  for (const e of index.entries) {
    const limit = allowedEdits(Math.min(e.key.length, key.length));
    if (limit === 0) continue;
    if (Math.abs(e.key.length - key.length) > limit) continue; // quick skip
    const d = editDistance(key, e.key);
    if (d > limit) continue;
    if (d < best) {
      best = d;
      bestIndexes = new Set([e.index]);
    } else if (d === best) {
      bestIndexes.add(e.index);
    }
  }
  if (bestIndexes.size === 1) {
    return { kind: "fuzzy", index: [...bestIndexes][0], distance: best };
  }
  if (bestIndexes.size > 1) return { kind: "ambiguous", indexes: [...bestIndexes] };
  return { kind: "none" };
}
