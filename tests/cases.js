// tests/cases.js — the actual test cases. Shared by:
//   - tests/run-tests.js      (run with Node:  node tests/run-tests.js)
//   - tests/match.test.html   (open in the browser via the local server)
//
// Each test is { name, fn } and fn throws if something is wrong.

import { normalize, editDistance, allowedEdits, matchGuess } from "../js/match.js";
import { createRound, logToSquares } from "../js/game.js";
import { tierFor, scoreRound, GEM_BONUS, HINT_COST } from "../js/scoring.js";
import { buildRotation, promptForDate, dailyNumber, addDays, daysBetween } from "../js/daily.js";
import { validatePack } from "../js/validate-pack.js";
import { createParty, randomFuse, PASS_FLOOR } from "../js/party.js";
import { createDive } from "../js/dive.js";

function eq(actual, expected, msg = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e} but got ${a}`);
}
function ok(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

// A small fake prompt used by most tests.
const PROMPT = {
  id: "test-prompt",
  text: "Name a test thing",
  gem: "Golden Freddy",
  notAnswers: ["Australia"],
  answers: [
    { name: "Freddy Fazbear", aliases: ["Freddy", "Fazbear"], depth: 5 },
    { name: "Bonnie", aliases: [], depth: 10 },
    { name: "Chica", aliases: [], depth: 8 },
    { name: "Foxy", aliases: [], depth: 9 },
    { name: "Golden Freddy", aliases: ["Fredbear's ghost"], depth: 60 },
    { name: "Côte d'Ivoire", aliases: ["Ivory Coast"], depth: 40 },
    { name: "Mr. Mime", aliases: [], depth: 30 },
    { name: "Io", aliases: [], depth: 50 },
    { name: "Austria", aliases: [], depth: 20 },
    { name: "Zambia", aliases: [], depth: 30 },
    { name: "Gambia", aliases: [], depth: 30 },
    { name: "Kangchenjunga", aliases: [], depth: 70 },
  ],
};
const idx = (name) => PROMPT.answers.findIndex((a) => a.name === name);

export const tests = [
  // ---------- normalize ----------
  { name: "normalize: case", fn: () => eq(normalize("FrEdDy"), "freddy") },
  { name: "normalize: accents", fn: () => eq(normalize("Côte d'Ivoire"), "cotedivoire") },
  { name: "normalize: punctuation & spaces", fn: () => eq(normalize("  Mr. Mime! "), "mrmime") },
  { name: "normalize: ampersand", fn: () => eq(normalize("Trinidad & Tobago"), "trinidadandtobago") },
  { name: "normalize: Pokémon é", fn: () => eq(normalize("Pokémon"), "pokemon") },
  { name: "normalize: leading 'the' ignored", fn: () => { eq(normalize("The Gambia"), "gambia"); eq(normalize("Theodore"), "theodore"); } },
  { name: "normalize: non-string", fn: () => eq(normalize(undefined), "") },

  // ---------- edit distance & limits ----------
  { name: "editDistance basics", fn: () => { eq(editDistance("kitten", "sitting"), 3); eq(editDistance("chica", "chika"), 1); eq(editDistance("", "abc"), 3); eq(editDistance("bonnei", "bonnie"), 1); } },
  { name: "allowedEdits by length", fn: () => { eq(allowedEdits(3), 0); eq(allowedEdits(4), 0); eq(allowedEdits(5), 1); eq(allowedEdits(8), 1); eq(allowedEdits(9), 2); } },

  // ---------- matchGuess ----------
  { name: "match: exact name, different case", fn: () => eq(matchGuess(PROMPT, "bonnie"), { kind: "exact", index: idx("Bonnie") }) },
  { name: "match: accents not needed", fn: () => eq(matchGuess(PROMPT, "cote divoire"), { kind: "exact", index: idx("Côte d'Ivoire") }) },
  { name: "match: punctuation not needed", fn: () => eq(matchGuess(PROMPT, "mr mime"), { kind: "exact", index: idx("Mr. Mime") }) },
  { name: "match: alias hit", fn: () => eq(matchGuess(PROMPT, "Ivory Coast"), { kind: "exact", index: idx("Côte d'Ivoire") }) },
  { name: "match: alias hit (short alias)", fn: () => eq(matchGuess(PROMPT, "freddy"), { kind: "exact", index: idx("Freddy Fazbear") }) },
  { name: "match: 1 typo on 6-letter word", fn: () => eq(matchGuess(PROMPT, "Bonnei").kind, "fuzzy") },
  { name: "match: 1 typo hits the right answer", fn: () => eq(matchGuess(PROMPT, "Bonie").index, idx("Bonnie")) },
  { name: "match: 2 typos on 6-letter word rejected", fn: () => eq(matchGuess(PROMPT, "Bonnaa").kind, "none") },
  { name: "match: 2 typos on long word accepted", fn: () => eq(matchGuess(PROMPT, "Kanchenjunge"), { kind: "fuzzy", index: idx("Kangchenjunga"), distance: 2 }) },
  { name: "match: short word never fuzzy (Io)", fn: () => eq(matchGuess(PROMPT, "Ia").kind, "none") },
  { name: "match: 4-letter word never fuzzy (Foxy)", fn: () => eq(matchGuess(PROMPT, "Foxx").kind, "none") },
  { name: "match: short guess can't fuzzy onto long answer", fn: () => eq(matchGuess(PROMPT, "Chic").kind, "none") },
  { name: "match: Australia does not match Austria", fn: () => eq(matchGuess(PROMPT, "Australia").kind, "none") },
  { name: "match: Austraia (typo) still matches Austria", fn: () => eq(matchGuess(PROMPT, "Austira").index, idx("Austria")) },
  { name: "match: tie between Gambia/Zambia is ambiguous", fn: () => eq(matchGuess(PROMPT, "Bambia").kind, "ambiguous") },
  { name: "match: exact beats fuzzy (Gambia)", fn: () => eq(matchGuess(PROMPT, "Gambia"), { kind: "exact", index: idx("Gambia") }) },
  { name: "match: fuzzy can be switched off", fn: () => eq(matchGuess(PROMPT, "Bonie", { fuzzy: false }).kind, "none") },
  { name: "match: empty input", fn: () => eq(matchGuess(PROMPT, "  ").kind, "empty") },
  { name: "match: notAnswers never fuzzy", fn: () => {
      const p = { ...PROMPT, notAnswers: ["Bonnia"] };
      eq(matchGuess(p, "Bonnia").kind, "none");
    } },

  // ---------- tiers & scoring ----------
  { name: "tiers: boundaries", fn: () => {
      eq(tierFor(0).id, "mainstream"); eq(tierFor(19).id, "mainstream"); eq(tierFor(20).id, "rumor");
      eq(tierFor(44).id, "rumor"); eq(tierFor(45).id, "coverup"); eq(tierFor(69).id, "coverup");
      eq(tierFor(70).id, "redacted"); eq(tierFor(89).id, "redacted"); eq(tierFor(90).id, "topsecret");
      eq(tierFor(99).id, "topsecret"); eq(tierFor(100).id, "gem");
    } },
  { name: "scoring: sum + gem bonus - hint", fn: () => {
      eq(scoreRound({ found: [{ depth: 10 }, { depth: 100, isGem: true }] }), 110 + GEM_BONUS);
      eq(scoreRound({ found: [{ depth: 50 }], hintUsed: true }), 50 - HINT_COST);
      eq(scoreRound({ found: [{ depth: 5 }], hintUsed: true }), 0); // never negative
    } },

  // ---------- game round ----------
  { name: "round: correct answer is found with its depth", fn: () => {
      const r = createRound(PROMPT);
      const ev = r.submit("Chica");
      eq(ev.type, "correct"); eq(ev.entry.depth, 8); eq(r.state.found.length, 1);
    } },
  { name: "round: duplicate rejected without strike", fn: () => {
      const r = createRound(PROMPT);
      r.submit("Freddy Fazbear");
      const ev = r.submit("freddy"); // alias of the same answer
      eq(ev.type, "duplicate"); eq(r.state.strikes, 0); eq(r.state.found.length, 1);
    } },
  { name: "round: wrong answer is a strike; 3 strikes ends", fn: () => {
      const r = createRound(PROMPT);
      eq(r.submit("Springtrap").type, "strike");
      r.submit("Mangle");
      eq(r.state.status, "playing");
      r.submit("Puppet");
      eq(r.state.status, "over"); eq(r.state.endReason, "strikes");
      eq(r.submit("Bonnie").type, "over");
    } },
  { name: "round: custom strike count", fn: () => {
      const r = createRound(PROMPT, { maxStrikes: 1 });
      r.submit("nope"); eq(r.state.status, "over");
    } },
  { name: "round: gem is worth 100 + bonus regardless of file depth", fn: () => {
      const r = createRound(PROMPT);
      const ev = r.submit("Golden Freddy");
      eq(ev.entry.depth, 100); eq(ev.entry.isGem, true); eq(ev.entry.tier.id, "gem");
      eq(r.currentScore, 100 + GEM_BONUS);
    } },
  { name: "round: fuzzy auto-accept", fn: () => {
      const r = createRound(PROMPT, { fuzzyMode: "auto" });
      eq(r.submit("Bonie").type, "fuzzy-correct");
    } },
  { name: "round: fuzzy ask mode -> confirm yes", fn: () => {
      const r = createRound(PROMPT, { fuzzyMode: "ask" });
      const ev = r.submit("Bonie");
      eq(ev.type, "confirm"); eq(ev.name, "Bonnie");
      eq(r.submit("Chica").type, "waiting");
      eq(r.resolvePending(true).type, "fuzzy-correct");
      eq(r.state.found.length, 1);
    } },
  { name: "round: fuzzy ask mode -> confirm no costs nothing", fn: () => {
      const r = createRound(PROMPT, { fuzzyMode: "ask" });
      r.submit("Bonie");
      eq(r.resolvePending(false).type, "dismissed");
      eq(r.state.strikes, 0); eq(r.state.found.length, 0); eq(r.state.status, "playing");
    } },
  { name: "round: fuzzy off means typo is a strike", fn: () => {
      const r = createRound(PROMPT, { fuzzyMode: "off" });
      eq(r.submit("Bonie").type, "strike");
    } },
  { name: "round: ambiguous typo is not a strike", fn: () => {
      const r = createRound(PROMPT);
      eq(r.submit("Bambia").type, "ambiguous"); eq(r.state.strikes, 0);
    } },
  { name: "round: hint gives gem's first letter and costs points", fn: () => {
      const r = createRound(PROMPT);
      r.submit("Kangchenjunga");
      eq(r.takeHint().letter, "G");
      eq(r.currentScore, 70 - HINT_COST);
    } },
  { name: "round: finding everything ends with sweep", fn: () => {
      const r = createRound(PROMPT);
      PROMPT.answers.forEach((a) => r.submit(a.name));
      eq(r.state.endReason, "sweep");
      eq(r.summary().missed.length, 0);
    } },
  { name: "round: summary + share squares", fn: () => {
      const r = createRound(PROMPT);
      r.submit("Freddy"); r.submit("xyz"); r.submit("Golden Freddy");
      r.giveUp();
      const s = r.summary();
      eq(s.endReason, "gaveup"); eq(s.gemFound, true); eq(s.found.length, 2);
      eq(logToSquares(s.log), "⬜❌🛸");
      ok(s.missed[0].depth >= s.missed[s.missed.length - 1].depth, "missed sorted deepest first");
    } },

  // ---------- daily ----------
  { name: "daily: date helpers", fn: () => {
      eq(daysBetween("2026-11-01", "2026-11-19"), 18); eq(addDays("2026-12-31", 1), "2027-01-01");
      eq(addDays("2026-03-01", -1), "2026-02-28"); eq(dailyNumber("2026-11-01"), 1);
    } },
  { name: "daily: same date -> same prompt, next date -> different prompt", fn: () => {
      const packs = [{ id: "a", prompts: Array.from({ length: 30 }, (_, i) => ({ id: "p" + i })) }];
      const rot = buildRotation(packs);
      const rot2 = buildRotation(JSON.parse(JSON.stringify(packs)));
      eq(promptForDate(rot, "2026-11-19").prompt.id, promptForDate(rot2, "2026-11-19").prompt.id);
      ok(promptForDate(rot, "2026-11-19").prompt.id !== promptForDate(rot, "2026-11-20").prompt.id, "should differ");
      eq(promptForDate(rot, "2026-10-01"), null); // before launch
      // no repeats within one full cycle
      const seen = new Set();
      for (let i = 0; i < 30; i++) seen.add(promptForDate(rot, addDays("2026-11-01", i)).prompt.id);
      eq(seen.size, 30);
    } },
  { name: "daily: pack order in the file doesn't matter", fn: () => {
      const a = { id: "a", prompts: [{ id: "x1" }, { id: "x2" }, { id: "x3" }] };
      const b = { id: "b", prompts: [{ id: "y1" }, { id: "y2" }] };
      eq(buildRotation([a, b]).map((r) => r.prompt.id), buildRotation([b, a]).map((r) => r.prompt.id));
    } },

  // ---------- party mode ----------
  { name: "party: fuse is 10-30s", fn: () => {
      eq(randomFuse(() => 0), 10); eq(randomFuse(() => 0.999999) < 30, true);
    } },
  { name: "party: valid answer passes, keeps time if >= 8s", fn: () => {
      const p = createParty({ players: ["A", "B", "C"], rand: () => 0.5 }); // 20s fuse
      p.setPrompt(PROMPT); p.start();
      p.tick(5); // 15s left
      const ev = p.guess("Chica");
      eq(ev.type, "pass"); eq(ev.to, "B"); ok(Math.abs(p.state.fuse - 15) < 1e-9, "kept 15s");
    } },
  { name: "party: pass with < 8s resets to 8", fn: () => {
      const p = createParty({ players: ["A", "B"], rand: () => 0 }); // 10s fuse
      p.setPrompt(PROMPT); p.start();
      p.tick(7); // 3s left
      p.guess("Bonnie");
      eq(p.state.fuse, PASS_FLOOR);
    } },
  { name: "party: used and wrong answers don't pass", fn: () => {
      const p = createParty({ players: ["A", "B"], rand: () => 0 });
      p.setPrompt(PROMPT); p.start();
      p.guess("Chica"); // A -> B
      eq(p.guess("chica").type, "used"); eq(p.holder().name, "B");
      eq(p.guess("Springtrap").type, "wrong"); eq(p.holder().name, "B");
    } },
  { name: "party: pop eliminates holder, new fuse, last one wins", fn: () => {
      const p = createParty({ players: ["A", "B", "C"], rand: () => 0 });
      p.setPrompt(PROMPT); p.start();
      const pop = p.tick(10);
      eq(pop.name, "A"); eq(p.state.status, "popped");
      p.nextRound(); eq(p.holder().name, "B"); eq(p.state.fuse, 10); eq(p.state.status, "ready");
      p.start(); p.guess("Chica"); // B -> C (skips nobody)
      eq(p.holder().name, "C");
      const pop2 = p.tick(11);
      eq(pop2.winner, "B"); eq(p.state.status, "won");
    } },

  // ---------- quick dive ----------
  { name: "dive: one answer per prompt, wrong guesses free, timeout scores 0", fn: () => {
      const P2 = { ...PROMPT, id: "p2" };
      const d = createDive([{ prompt: PROMPT }, { prompt: P2 }], { seconds: 25 });
      eq(d.answer("nonsense").type, "wrong"); eq(d.state.status, "answering");
      const ev = d.answer("Golden Freddy");
      eq(ev.type, "found"); eq(ev.result.points, 100 + GEM_BONUS); eq(d.state.status, "revealed");
      eq(d.answer("Chica").type, "ignored"); // already answered this prompt
      d.next();
      eq(d.tick(10), null);
      const t = d.tick(20);
      eq(t.type, "timeout"); eq(t.result.points, 0); eq(d.state.status, "over");
      eq(d.total(), 100 + GEM_BONUS); eq(d.squares(), "🛸⏱️");
    } },

  // ---------- validator ----------
  { name: "validator: catches bad gem, clash, too few answers", fn: () => {
      const bad = { id: "bad", name: "Bad", prompts: [{ id: "b1", text: "t", gem: "Nope",
        answers: [{ name: "A1", depth: 5, aliases: ["x"] }, { name: "B1", depth: 5, aliases: ["X"] }] }] };
      const { errors } = validatePack(bad);
      ok(errors.some((e) => e.includes("gem")), "gem error");
      ok(errors.some((e) => e.includes("clashes")), "clash error");
      ok(errors.some((e) => e.includes("at least")), "count error");
    } },
];
