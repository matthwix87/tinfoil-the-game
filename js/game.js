// game.js — the rules of one round, with no screen code in it.
//
// A round is one prompt ("Name a Pokémon type"). The player types guesses:
//   - a valid, new answer  -> it is "found", shows its depth & tier
//   - an answer already found -> rejected, no penalty
//   - anything else        -> a strike; at maxStrikes the round ends
//   - finding every answer also ends the round (a "sweep")
//
// The screen (js/ui/round.js) calls these functions and draws the results.

import { matchGuess, buildIndex } from "./match.js";
import { tierFor, scoreRound, TIERS } from "./scoring.js";

/**
 * Create a new round.
 * options:
 *   maxStrikes  number of wrong guesses allowed (default 3)
 *   fuzzyMode   "auto"  = typos are accepted straight away
 *               "ask"   = typos ask "Did you mean X?" first
 *               "off"   = exact spelling only (aliases still work)
 *   hints       true/false — whether the hint button is allowed
 */
export function createRound(prompt, options = {}) {
  const maxStrikes = options.maxStrikes ?? 3;
  const fuzzyMode = options.fuzzyMode ?? "auto";
  const hintsAllowed = options.hints !== false;
  const index = buildIndex(prompt);
  const gemIndex = prompt.answers.findIndex((a) => a.name === prompt.gem);

  const state = {
    prompt,
    maxStrikes,
    strikes: 0,
    found: [],          // answers found, in the order found
    foundSet: new Set(),
    log: [],            // every event, for the share string: "found"/"strike"
    status: "playing",  // "playing" | "confirm" | "over"
    endReason: null,    // "strikes" | "sweep" | "gaveup"
    pending: null,      // a fuzzy suggestion waiting for yes/no
    hintUsed: false,
  };

  // Depth of an answer; the gem is always 100 no matter what the file says.
  function depthOf(i) {
    return i === gemIndex ? 100 : prompt.answers[i].depth;
  }

  function accept(i, typed, viaFuzzy) {
    const answer = prompt.answers[i];
    const depth = depthOf(i);
    const entry = {
      index: i,
      name: answer.name,
      typed,
      depth,
      isGem: i === gemIndex,
      tier: tierFor(depth),
      viaFuzzy,
    };
    state.found.push(entry);
    state.foundSet.add(i);
    state.log.push({ type: "found", tier: entry.tier.id });
    if (state.foundSet.size === prompt.answers.length) end("sweep");
    return { type: viaFuzzy ? "fuzzy-correct" : "correct", entry };
  }

  function strike(typed) {
    state.strikes += 1;
    state.log.push({ type: "strike", typed });
    if (state.strikes >= maxStrikes) end("strikes");
    return { type: "strike", typed, strikes: state.strikes };
  }

  function end(reason) {
    state.status = "over";
    state.endReason = reason;
    state.pending = null;
  }

  /** The player pressed Enter. Returns an event object describing what happened. */
  function submit(text) {
    if (state.status === "over") return { type: "over" };
    if (state.status === "confirm") return { type: "waiting" }; // answer the question first
    const typed = String(text || "").trim();
    const m = matchGuess(prompt, typed, { fuzzy: fuzzyMode !== "off", index });

    if (m.kind === "empty") return { type: "empty" };
    if (m.kind === "ambiguous") return { type: "ambiguous", typed };
    if (m.kind === "none") return strike(typed);

    // exact or fuzzy: is it already found?
    if (state.foundSet.has(m.index)) {
      return { type: "duplicate", name: prompt.answers[m.index].name, typed };
    }
    if (m.kind === "fuzzy" && fuzzyMode === "ask") {
      state.status = "confirm";
      state.pending = { index: m.index, typed };
      return { type: "confirm", name: prompt.answers[m.index].name, typed };
    }
    return accept(m.index, typed, m.kind === "fuzzy");
  }

  /** Answer to "Did you mean X?". Saying no costs nothing (see DECISIONS.md). */
  function resolvePending(yes) {
    if (state.status !== "confirm" || !state.pending) return { type: "none" };
    const { index: i, typed } = state.pending;
    state.pending = null;
    state.status = "playing";
    if (yes) return accept(i, typed, true);
    return { type: "dismissed", typed };
  }

  /** Reveal the first letter of the gem (once per round, costs points). */
  function takeHint() {
    if (!hintsAllowed || state.status === "over") return null;
    if (gemIndex < 0 || state.foundSet.has(gemIndex)) return null;
    state.hintUsed = true;
    const name = prompt.answers[gemIndex].name;
    return { letter: name.trim().charAt(0).toUpperCase(), length: name.length };
  }

  function giveUp() {
    if (state.status !== "over") end("gaveup");
  }

  /** Everything the end-of-round screen needs. */
  function summary() {
    const missed = prompt.answers
      .map((a, i) => ({ name: a.name, depth: depthOf(i), isGem: i === gemIndex, tier: tierFor(depthOf(i)) }))
      .filter((_, i) => !state.foundSet.has(i))
      .sort((a, b) => b.depth - a.depth);
    const sweep = state.endReason === "sweep";
    return {
      promptId: prompt.id,
      promptText: prompt.text,
      score: scoreRound({ found: state.found, hintUsed: state.hintUsed, sweep }),
      found: state.found.slice(),
      missed,
      total: prompt.answers.length,
      gemFound: state.found.some((f) => f.isGem),
      gemName: gemIndex >= 0 ? prompt.answers[gemIndex].name : null,
      strikes: state.strikes,
      maxStrikes,
      endReason: state.endReason,
      hintUsed: state.hintUsed,
      deepest: state.found.reduce((m, f) => Math.max(m, f.depth), 0),
      log: state.log.slice(),
    };
  }

  return {
    state,
    submit,
    resolvePending,
    takeHint,
    giveUp,
    summary,
    get currentScore() {
      return scoreRound({ found: state.found, hintUsed: state.hintUsed, sweep: state.endReason === "sweep" });
    },
  };
}

/** Turn a round's event log into emoji squares for sharing. */
export function logToSquares(log) {
  const byId = Object.fromEntries(TIERS.map((t) => [t.id, t.square]));
  return log.map((e) => (e.type === "strike" ? "❌" : byId[e.tier] || "⬜")).join("");
}
