// ui/round.js — draws one round and wires up the guess box.
// Used by Unlimited mode and the Daily (and the Archive).
//
// The rules live in js/game.js; this file only shows what happened.

import { h, mount, announce, copyText } from "./dom.js";
import { createRound } from "../game.js";
import { TIERS, tierFor, HINT_COST } from "../scoring.js";
import { playCorrect, playStrike, playGem } from "../sound.js";

/**
 * Start a round inside `container`.
 * opts:
 *   pack, prompt          the question
 *   label                 small text above the prompt, e.g. "Daily #19"
 *   maxStrikes, fuzzyMode, hints   game settings
 *   replay                list of recorded actions to re-apply (Daily resume)
 *   onAction(action)      called with each player action, so it can be saved
 *   onFinish(summary, { visible })  called once when the round ends;
 *                         visible = false if the player already left the screen
 */
export function mountRound(container, opts) {
  const { pack, prompt } = opts;
  const round = createRound(prompt, {
    maxStrikes: opts.maxStrikes,
    fuzzyMode: opts.fuzzyMode,
    hints: opts.hints,
  });
  let finished = false;
  let hintText = null;

  // Re-apply saved actions (used when a Daily is reloaded half-way through).
  for (const a of opts.replay || []) {
    if (a.g != null) round.submit(a.g);
    else if (a.c != null) round.resolvePending(a.c);
    else if (a.h) hintText = hintLine(round.takeHint());
    else if (a.q) round.giveUp();
  }

  // ---- Build the screen ----
  const scoreEl = h("span", { class: "hud-score" });
  const strikesEl = h("div", { class: "strikes", role: "img" });
  const foundEl = h("span", { class: "hud-found" });
  const needle = h("div", { class: "gauge-needle" });
  const fill = h("div", { class: "gauge-fill" });
  const readout = h("div", { class: "gauge-readout" }, "0");
  const gauge = h("div", { class: "gauge", "aria-label": "Paranoia level: depth of your latest answer" },
    readout,
    h("div", { class: "gauge-track" },
      TIERS.map((t) => h("div", { class: "gauge-band", dataset: { tier: t.id }, title: t.name })),
      fill, needle),
    h("div", { class: "gauge-caption" }, "paranoia", h("br"), "level"));
  const list = h("ol", { class: "evidence", "aria-label": "Answers found" });
  const feedback = h("p", { class: "feedback", role: "status" });
  const input = h("input", {
    class: "guess-input", type: "text", name: "guess",
    placeholder: "Type an answer…", "aria-label": "Your answer",
    autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false",
    enterkeyhint: "send", maxlength: "80",
  });
  const guessBtn = h("button", { class: "btn btn-primary", type: "submit" }, "File it");
  const confirmBox = h("div", { class: "confirm-box", hidden: true });
  const hintBtn = h("button", { class: "btn btn-quiet btn-small", type: "button" }, `Hint (−${HINT_COST})`);
  const quitBtn = h("button", { class: "btn btn-quiet btn-small", type: "button" }, "Close case");
  const form = h("form", { class: "guess-bar", autocomplete: "off" },
    h("div", { class: "guess-row" }, input, guessBtn),
    confirmBox,
    feedback,
    h("div", { class: "round-tools" }, hintBtn, quitBtn));

  const screen = h("section", { class: "round", "aria-label": "Round" },
    h("div", { class: "card pin casefile round-prompt" },
      h("p", { class: "casefile-label" }, h("span", {}, `${pack.icon || "🗂️"} ${pack.name}`), h("span", {}, opts.label || "")),
      h("h1", { class: "casefile-prompt" }, prompt.text)),
    h("div", { class: "hud" },
      h("div", {}, scoreEl, h("small", {}, "pts")),
      foundEl,
      strikesEl),
    h("div", { class: "round-body" }, gauge, list),
    form);
  mount(container, screen);

  // ---- Drawing helpers ----
  function slip(entry) {
    return h("li", { class: "slip", dataset: { tier: entry.tier.id } },
      h("span", { class: "slip-name" }, entry.name),
      h("span", { class: "slip-tier" }, `${entry.tier.icon} ${entry.tier.name}`),
      h("span", { class: "slip-depth", "aria-label": `depth ${entry.depth}` }, String(entry.depth), h("small", {}, "depth")));
  }

  function drawHud() {
    const s = round.state;
    scoreEl.textContent = String(round.currentScore);
    foundEl.textContent = `${s.found.length} / ${prompt.answers.length} found`;
    strikesEl.replaceChildren(...Array.from({ length: s.maxStrikes }, (_, i) =>
      h("span", { class: "strike-box" + (i < s.strikes ? " used" : "") })));
    strikesEl.setAttribute("aria-label", `${s.strikes} of ${s.maxStrikes} strikes used`);
    const latest = s.found[s.found.length - 1];
    const deepest = s.found.reduce((m, f) => Math.max(m, f.depth), 0);
    needle.style.bottom = `${latest ? latest.depth : 0}%`;
    fill.style.height = `${deepest}%`;
    readout.textContent = String(latest ? latest.depth : 0);
    // One hint per round; pointless once the gem is found.
    hintBtn.disabled = s.hintUsed || s.found.some((f) => f.isGem) || s.status === "over";
    hintBtn.hidden = opts.hints === false;
  }

  function drawAll() {
    const found = round.state.found;
    if (found.length === 0) list.replaceChildren(h("li", { class: "evidence-empty" }, "No evidence filed yet."));
    else list.replaceChildren(...found.slice().reverse().map(slip));
    drawHud();
    if (hintText) say(hintText, "hint");
  }

  function say(text, kind = "") {
    feedback.textContent = text;
    feedback.dataset.kind = kind;
    announce(text);
  }

  function hintLine(hint) {
    return hint ? `Hint: the gem starts with “${hint.letter}” (${hint.length} characters).` : null;
  }

  function addSlip(entry) {
    list.querySelector(".evidence-empty")?.remove();
    list.prepend(slip(entry));
    gauge.classList.remove("pulse");
    void gauge.offsetWidth; // restart the animation
    gauge.classList.add("pulse");
  }

  function gemFlourish() {
    const stamp = h("div", { class: "stamp gem-stamp", "aria-hidden": "true" }, "🛸 Tinfoil gem");
    document.body.append(stamp);
    setTimeout(() => stamp.remove(), 1700);
  }

  function shake() {
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
  }

  function record(action) {
    if (opts.onAction) opts.onAction(action);
  }

  // ---- Handling results ----
  function handle(ev) {
    switch (ev.type) {
      case "correct":
      case "fuzzy-correct": {
        const e = ev.entry;
        addSlip(e);
        const typo = ev.type === "fuzzy-correct" && e.typed ? ` (read “${e.typed}” as ${e.name})` : "";
        if (e.isGem) {
          say(`🛸 TINFOIL GEM! ${e.name} — +${e.depth} and a bonus${typo}`, "gem");
          gemFlourish();
          playGem();
        } else {
          say(`+${e.depth} · ${e.tier.icon} ${e.tier.name}: ${e.name}${typo}`, "ok");
          playCorrect(e.depth);
        }
        break;
      }
      case "duplicate":
        say(`Already on file: ${ev.name}. No strike.`, "dup");
        break;
      case "ambiguous":
        say("That's close to more than one answer. Type it more exactly — no strike.", "dup");
        break;
      case "strike":
        say(`“${ev.typed}” isn't on file. Strike ${ev.strikes} of ${round.state.maxStrikes}.`, "strike");
        shake();
        playStrike();
        break;
      case "confirm":
        showConfirm(ev);
        break;
      case "dismissed":
        say("OK, not filed. No strike.", "dup");
        break;
      default:
        break;
    }
    drawHud();
    if (round.state.status === "over") finish();
  }

  function showConfirm(ev) {
    say(`Did you mean ${ev.name}?`, "confirm");
    const yes = h("button", { class: "btn btn-primary btn-small", type: "button" }, `Yes, ${ev.name}`);
    const no = h("button", { class: "btn btn-small", type: "button" }, "No");
    const choose = (answer) => {
      confirmBox.hidden = true;
      confirmBox.replaceChildren();
      input.disabled = false;
      guessBtn.disabled = false;
      record({ c: answer });
      handle(round.resolvePending(answer));
      input.focus();
    };
    yes.addEventListener("click", () => choose(true));
    no.addEventListener("click", () => choose(false));
    confirmBox.replaceChildren(yes, no);
    confirmBox.hidden = false;
    input.disabled = true;
    guessBtn.disabled = true;
    yes.focus();
  }

  function finish() {
    if (finished) return;
    finished = true;
    input.disabled = true;
    guessBtn.disabled = true;
    const summary = round.summary();
    // Short pause so the last result can be seen before the summary.
    // If the player has already left this screen, the result is still saved,
    // but `visible: false` tells the caller not to draw over the new screen.
    const delay = resumedFinished ? 0 : 900;
    setTimeout(() => opts.onFinish && opts.onFinish(summary, { visible: screen.isConnected }), delay);
  }

  // ---- Events ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (finished) return;
    const text = input.value;
    if (!text.trim()) return;
    input.value = "";
    record({ g: text });
    handle(round.submit(text));
    if (!finished) input.focus();
  });

  hintBtn.addEventListener("click", () => {
    const hint = round.takeHint();
    if (!hint) return;
    record({ h: 1 });
    hintText = hintLine(hint);
    say(hintText, "hint");
    drawHud();
    input.focus();
  });

  let quitArmed = null;
  quitBtn.addEventListener("click", () => {
    if (!quitArmed) {
      quitBtn.textContent = "Tap again to close";
      quitArmed = setTimeout(() => { quitBtn.textContent = "Close case"; quitArmed = null; }, 3000);
      return;
    }
    clearTimeout(quitArmed);
    record({ q: 1 });
    round.giveUp();
    finish();
  });

  drawAll();
  const resumedFinished = round.state.status === "over"; // replay already ended it
  if (resumedFinished) finish();
  else setTimeout(() => input.focus(), 50);

  return { round };
}

/**
 * The end-of-round report.
 * summary: from game.js summary() (or a saved Daily result, same shape)
 * shareText: optional emoji result to copy
 * actions: extra buttons (e.g. "Next case")
 */
export function renderSummary(container, { pack, prompt, summary, label, shareText, actions = [] }) {
  const stampText =
    summary.gemFound ? "Gem found" :
    summary.endReason === "sweep" ? "All filed" :
    summary.endReason === "strikes" ? "Struck out" : "Case closed";

  const facts = [
    `${summary.found.length} / ${summary.total} found`,
    `deepest ${summary.deepest}`,
    `${summary.strikes} strike${summary.strikes === 1 ? "" : "s"}`,
  ];
  if (summary.hintUsed) facts.push("hint used");

  const copyBtn = shareText ? h("button", { class: "btn btn-primary", type: "button" }, "Copy result") : null;
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(shareText);
      copyBtn.textContent = ok ? "Copied!" : "Select the text above to copy";
      announce(ok ? "Result copied" : "Copy failed");
    });
  }

  // Found answers, deepest first
  const found = summary.found.slice().sort((a, b) => b.depth - a.depth);
  const foundList = found.length
    ? h("ol", { class: "evidence" }, found.map((f) => {
        const tier = tierFor(f.isGem ? 100 : f.depth);
        return h("li", { class: "slip", dataset: { tier: tier.id } },
          h("span", { class: "slip-name" }, f.name),
          h("span", { class: "slip-tier" }, `${tier.icon} ${tier.name}`),
          h("span", { class: "slip-depth" }, String(f.depth), h("small", {}, "depth")));
      }))
    : h("p", { class: "muted" }, "Nothing filed this time.");

  // Missed answers start "redacted" (blacked out) — tap to reveal.
  const missedList = h("ul", { class: "redacted-list" },
    summary.missed.map((m) =>
      h("li", { class: m.isGem ? "is-gem" : "" },
        h("span", { class: "bar" }, h("span", { class: "bar-text" }, m.isGem ? `🛸 ${m.name}` : m.name)),
        h("span", { class: "muted small" }, `${tierFor(m.depth).icon} ${m.depth}`))));
  const revealBtn = h("button", { class: "btn btn-small", type: "button" }, "Declassify");
  revealBtn.addEventListener("click", () => {
    missedList.classList.add("revealed");
    revealBtn.remove();
  });

  mount(container,
    h("section", { class: "summary" },
      h("div", { class: "card pin" },
        h("div", { class: "summary-head" },
          h("div", {},
            h("p", { class: "casefile-label" }, `${pack.icon || "🗂️"} ${pack.name}${label ? " · " + label : ""}`),
            h("h2", {}, prompt.text)),
          h("span", { class: "stamp" }, stampText)),
        h("div", { class: "summary-score" }, String(summary.score)),
        h("div", { class: "muted" }, "points"),
        h("p", { class: "summary-facts" }, facts.join("  ·  ")),
        summary.gemFound
          ? h("p", {}, `You found the gem: `, h("strong", {}, summary.gemName), ".")
          : h("p", {}, "The gem is still out there. Declassify the files below to see it."),
        shareText ? h("pre", { class: "share-box" }, shareText) : null,
        h("div", { class: "btn-row" }, copyBtn, ...actions)),
      h("div", { class: "summary-section" }, h("h3", {}, "Your evidence"), foundList),
      summary.missed.length
        ? h("div", { class: "summary-section" },
            h("div", { class: "section-head" }, h("h3", {}, `Still classified (${summary.missed.length})`), revealBtn),
            missedList)
        : null));
  container.querySelector("h2")?.focus?.();
}
