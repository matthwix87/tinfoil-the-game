// dive.js — rules for "Quick dive" mode. No screen code.
//
// This mode copies the shape of the original daily-dive game (observed in
// docs/RESEARCH.md): several prompts in a row, ONE answer per prompt, a
// countdown per prompt, and wrong guesses cost nothing except time.
//
//   - DIVE_PROMPTS prompts, DIVE_SECONDS seconds each.
//   - Type one valid answer -> you score its depth (the gem scores 100 + bonus).
//   - Wrong guesses: "not on file, try again" — no penalty.
//   - Time runs out with no answer -> 0 points for that prompt.

import { matchGuess, buildIndex } from "./match.js";
import { tierFor, GEM_BONUS, TIERS } from "./scoring.js";

export const DIVE_PROMPTS = 7;
export const DIVE_SECONDS = 25;

/** prompts: array of { pack, prompt }. options.fuzzy: true/false. */
export function createDive(items, options = {}) {
  const fuzzy = options.fuzzy !== false;
  const state = {
    items,
    current: 0,
    timeLeft: options.seconds ?? DIVE_SECONDS,
    seconds: options.seconds ?? DIVE_SECONDS,
    results: [],          // one per prompt: { promptId, answer|null, depth, points, tier|null, isGem }
    status: "answering",  // "answering" | "revealed" | "over"
  };
  let index = buildIndex(items[0].prompt);

  function finishPrompt(result) {
    state.results.push(result);
    state.status = state.current >= items.length - 1 ? "over" : "revealed";
    return result;
  }

  /** The player typed an answer. */
  function answer(text) {
    if (state.status !== "answering") return { type: "ignored" };
    const prompt = items[state.current].prompt;
    const m = matchGuess(prompt, text, { fuzzy, index });
    if (m.kind === "empty") return { type: "empty" };
    if (m.kind === "ambiguous") return { type: "ambiguous" };
    if (m.kind === "none") return { type: "wrong", typed: text };
    const a = prompt.answers[m.index];
    const isGem = a.name === prompt.gem;
    const depth = isGem ? 100 : a.depth;
    return {
      type: "found",
      result: finishPrompt({ promptId: prompt.id, answer: a.name, typed: text, depth, isGem, tier: tierFor(depth), points: depth + (isGem ? GEM_BONUS : 0) }),
    };
  }

  /** Advance the clock. Returns a "timeout" result when time runs out. */
  function tick(seconds) {
    if (state.status !== "answering") return null;
    state.timeLeft -= seconds;
    if (state.timeLeft > 0) return null;
    state.timeLeft = 0;
    const prompt = items[state.current].prompt;
    return { type: "timeout", result: finishPrompt({ promptId: prompt.id, answer: null, depth: 0, isGem: false, tier: null, points: 0 }) };
  }

  /** Move on to the next prompt after a reveal. */
  function next() {
    if (state.status !== "revealed") return false;
    state.current += 1;
    state.timeLeft = state.seconds;
    state.status = "answering";
    index = buildIndex(items[state.current].prompt);
    return true;
  }

  const total = () => state.results.reduce((n, r) => n + r.points, 0);
  const squares = () => {
    const byId = Object.fromEntries(TIERS.map((t) => [t.id, t.square]));
    return state.results.map((r) => (r.tier ? byId[r.tier.id] : "⏱️")).join("");
  };

  return { state, answer, tick, next, total, squares, currentItem: () => items[state.current] };
}
