// ui/dive.js — "Quick dive": 7 prompts, one answer each, 25 seconds per prompt.
import { h, mount, announce, copyText } from "./dom.js";
import { createDive, DIVE_PROMPTS, DIVE_SECONDS } from "../dive.js";
import { getSettings, recordDive } from "../storage.js";
import { playCorrect, playStrike, playGem } from "../sound.js";

function pickItems(ctx, packId) {
  const pool = [];
  for (const pack of ctx.packs) {
    if (packId !== "random" && pack.id !== packId) continue;
    for (const prompt of pack.prompts) pool.push({ pack, prompt });
  }
  for (let i = pool.length - 1; i > 0; i--) { // shuffle
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DIVE_PROMPTS);
}

export function render(main, ctx, params) {
  const packId = params[0];
  const items = pickItems(ctx, packId);
  if (!items.length) {
    mount(main, h("div", { class: "card" }, h("h2", {}, "Pack not found"), h("a", { class: "btn", href: "#/packs" }, "Choose a pack")));
    return;
  }
  const dive = createDive(items, { fuzzy: getSettings().fuzzyMode !== "off" });
  let timer = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; };

  const progress = h("div", { class: "strikes", "aria-hidden": "true" });
  const counter = h("span", { class: "hud-found" });
  const scoreEl = h("span", { class: "hud-score" });
  const label = h("p", { class: "casefile-label" });
  const promptText = h("h1", { class: "casefile-prompt" });
  const clock = h("div", { class: "party-timer", "aria-live": "off" });
  const bar = h("div", { class: "party-fuse", "aria-hidden": "true" }, h("div"));
  const feedback = h("p", { class: "feedback", role: "status" });
  const input = h("input", { class: "guess-input", type: "text", placeholder: "Type one answer…", "aria-label": "Your answer",
    autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "send", maxlength: "80" });
  const form = h("form", { class: "guess-row" }, input, h("button", { class: "btn btn-primary", type: "submit" }, "Dive"));
  const reveal = h("div", { class: "card party-turn", hidden: true });
  const asking = h("div", {}, h("div", { class: "card party-turn" }, clock, bar), form, feedback);

  const say = (text, kind = "") => { feedback.textContent = text; feedback.dataset.kind = kind; announce(text); };

  function drawHeader() {
    const s = dive.state;
    const item = dive.currentItem();
    counter.textContent = `Prompt ${s.current + 1} of ${items.length}`;
    scoreEl.textContent = String(dive.total());
    progress.replaceChildren(...items.map((_, i) => {
      const r = s.results[i];
      return h("span", { class: "strike-box", style: { color: "inherit", fontSize: ".9rem" } }, r ? (r.tier ? r.tier.icon : "⏱️") : (i === s.current ? "▼" : ""));
    }));
    label.textContent = `${item.pack.icon} ${item.pack.name} · Quick dive`;
    promptText.textContent = item.prompt.text;
  }

  function drawClock() {
    const t = Math.max(0, dive.state.timeLeft);
    clock.textContent = String(Math.ceil(t));
    bar.firstChild.style.transform = `scaleX(${t / dive.state.seconds})`;
  }

  function showReveal(result) {
    stop();
    asking.hidden = true;
    const last = dive.state.status === "over";
    const nextBtn = h("button", { class: "btn btn-primary", type: "button" }, last ? "See results" : "Next prompt");
    nextBtn.addEventListener("click", () => {
      if (last) return showEnd();
      dive.next();
      startPrompt();
    });
    mount(reveal,
      result.tier
        ? [h("div", { class: "who" }, `${result.tier.icon} ${result.tier.name}`),
           h("p", { class: "slip-name", style: { fontSize: "1.3rem", margin: "8px 0" } }, `“${result.answer}”`),
           h("p", { style: { fontWeight: 700 } }, `+${result.points} pts · depth ${result.depth}`),
           h("p", { class: "muted" }, result.tier.blurb)]
        : [h("div", { class: "who" }, "⏱️ Out of time"), h("p", { class: "muted" }, "No answer filed. 0 points.")],
      h("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "10px" } }, nextBtn));
    reveal.hidden = false;
    drawHeader();
    nextBtn.focus();
  }

  function startPrompt() {
    reveal.hidden = true;
    asking.hidden = false;
    say("");
    drawHeader();
    drawClock();
    input.value = "";
    input.focus();
    let last = performance.now();
    stop();
    timer = setInterval(() => {
      const now = performance.now();
      const ev = dive.tick((now - last) / 1000);
      last = now;
      drawClock();
      if (ev) showReveal(ev.result);
    }, 100);
  }

  function showEnd() {
    stop();
    const s = dive.state;
    const total = dive.total();
    const best = recordDive(total);
    const share = [`Tinfoil quick dive ${s.results.some((r) => r.isGem) ? "🛸" : ""}`.trim(), dive.squares(), `${total} pts`].join("\n");
    const copyBtn = h("button", { class: "btn btn-primary", type: "button" }, "Copy result");
    copyBtn.addEventListener("click", async () => { copyBtn.textContent = (await copyText(share)) ? "Copied!" : "Select the text to copy"; });
    const again = h("button", { class: "btn", type: "button" }, "Dive again");
    again.addEventListener("click", () => { cleanupAndRestart(); });
    mount(main,
      h("section", { class: "summary" },
        h("div", { class: "card pin" },
          h("div", { class: "summary-head" },
            h("p", { class: "casefile-label" }, "Quick dive"),
            h("h2", {}, "Dive complete"),
            h("span", { class: "stamp" }, total >= best ? "New best" : "Surfaced")),
          h("div", { class: "summary-score" }, String(total)),
          h("div", { class: "muted" }, `points · best ${best}`),
          h("pre", { class: "share-box" }, share),
          h("div", { class: "btn-row" }, copyBtn, again, h("a", { class: "btn btn-quiet", href: "#/packs" }, "Change pack"))),
        h("div", { class: "summary-section" },
          h("h3", {}, "Your dive"),
          h("ol", { class: "evidence" }, s.results.map((r, i) =>
            h("li", { class: "slip", dataset: { tier: r.tier ? r.tier.id : "mainstream" } },
              h("span", { class: "slip-name" }, r.answer || "Out of time"),
              h("span", { class: "slip-tier" }, `${items[i].prompt.text}${r.tier ? ` · ${r.tier.icon} ${r.tier.name}` : ""}`),
              h("span", { class: "slip-depth" }, String(r.points), h("small", {}, "pts"))))))));
  }

  function cleanupAndRestart() {
    stop();
    render(main, ctx, params);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    if (!text.trim()) return;
    input.value = "";
    const ev = dive.answer(text);
    if (ev.type === "found") {
      ev.result.isGem ? playGem() : playCorrect(ev.result.depth);
      showReveal(ev.result);
    } else if (ev.type === "wrong") {
      say(`“${ev.typed}” isn't on file. Try again — no penalty.`, "strike");
      playStrike();
    } else if (ev.type === "ambiguous") {
      say("Close to more than one answer. Type it more exactly.", "dup");
    }
  });

  mount(main,
    h("section", { class: "round" },
      h("div", { class: "hud" }, h("div", {}, scoreEl, h("small", {}, "pts")), counter, progress),
      h("div", { class: "card pin casefile round-prompt" }, label, promptText),
      asking,
      reveal,
      h("p", { class: "muted small" }, `${DIVE_PROMPTS} prompts · ${DIVE_SECONDS} seconds each · one answer per prompt · wrong guesses are free`)));
  startPrompt();
  activeStop = stop;
  // The router calls this when the player leaves; it stops whichever dive is running
  // (including one restarted with "Dive again").
  return () => activeStop && activeStop();
}

let activeStop = null;
