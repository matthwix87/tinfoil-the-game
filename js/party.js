// party.js — rules for Party mode (pass-the-phone hot potato). No screen code.
//
// Rules (taken from how the "Puffer Party" style of game is described):
//   - A hidden fuse is lit with a random length of 10–30 seconds.
//   - The player holding the phone must type a valid answer nobody has used yet.
//   - A valid answer passes the phone. The next player keeps whatever time
//     is left on the fuse — but if less than 8 seconds were left, it is
//     topped back up to 8 seconds.
//   - Wrong or repeated answers just waste time.
//   - When the fuse hits zero it pops: the holder is out, and a new fuse
//     (new random length) is lit for the next round.
//   - Last player standing wins.

import { matchGuess, buildIndex } from "./match.js";

export const FUSE_MIN = 10;
export const FUSE_MAX = 30;
export const PASS_FLOOR = 8;

export function randomFuse(rand = Math.random) {
  return FUSE_MIN + rand() * (FUSE_MAX - FUSE_MIN);
}

export function createParty({ players, rand = Math.random }) {
  const state = {
    players: players.map((name) => ({ name, out: false })),
    current: 0,
    fuse: randomFuse(rand), // seconds left (hidden from players)
    prompt: null,
    index: null,
    used: new Set(),        // answer indexes already said this round
    status: "ready",        // "ready" | "burning" | "popped" | "won"
    lastOut: null,
    round: 1,
  };

  const alive = () => state.players.filter((p) => !p.out);

  function nextAlive(from) {
    const n = state.players.length;
    for (let step = 1; step <= n; step++) {
      const i = (from + step) % n;
      if (!state.players[i].out) return i;
    }
    return from;
  }

  /** Load a prompt for the current round (clears used answers). */
  function setPrompt(prompt) {
    state.prompt = prompt;
    state.index = buildIndex(prompt);
    state.used = new Set();
  }

  /** Light the fuse and start the round. */
  function start() {
    if (state.status === "ready") state.status = "burning";
  }

  /** Advance time. Returns { type: "pop", name } when the fuse runs out. */
  function tick(seconds) {
    if (state.status !== "burning") return null;
    state.fuse -= seconds;
    if (state.fuse > 0) return null;
    const loser = state.players[state.current];
    loser.out = true;
    state.lastOut = loser.name;
    if (alive().length <= 1) {
      state.status = "won";
      return { type: "pop", name: loser.name, winner: alive()[0]?.name || null };
    }
    state.status = "popped";
    return { type: "pop", name: loser.name, winner: null };
  }

  /** After a pop: new fuse, next player, new round (caller sets a new prompt). */
  function nextRound() {
    if (state.status !== "popped") return;
    state.current = nextAlive(state.current);
    state.fuse = randomFuse(rand);
    state.round += 1;
    state.status = "ready";
  }

  /** The holder typed something. */
  function guess(text) {
    if (state.status !== "burning") return { type: "ignored" };
    const m = matchGuess(state.prompt, text, { index: state.index });
    if (m.kind === "empty") return { type: "empty" };
    if (m.kind === "none" || m.kind === "ambiguous") return { type: "wrong", typed: text };
    if (state.used.has(m.index)) return { type: "used", name: state.prompt.answers[m.index].name };
    state.used.add(m.index);
    const from = state.players[state.current].name;
    if (state.fuse < PASS_FLOOR) state.fuse = PASS_FLOOR;
    state.current = nextAlive(state.current);
    const exhausted = state.used.size >= state.prompt.answers.length;
    return { type: "pass", name: state.prompt.answers[m.index].name, from, to: state.players[state.current].name, exhausted };
  }

  return { state, setPrompt, start, tick, nextRound, guess, alive, holder: () => state.players[state.current] };
}
