// ui/unlimited.js — Unlimited mode: play prompts from a pack back to back.
import { h, mount } from "./dom.js";
import { mountRound, renderSummary } from "./round.js";
import { getSettings, recordRound } from "../storage.js";

// Remember recently played prompts (this visit only) to avoid repeats.
const recent = [];

function pickPrompt(ctx, packId) {
  const pool = [];
  for (const pack of ctx.packs) {
    if (packId !== "random" && pack.id !== packId) continue;
    for (const prompt of pack.prompts) pool.push({ pack, prompt });
  }
  if (!pool.length) return null;
  // Prefer prompts not seen recently; fall back to the whole pool.
  const fresh = pool.filter((x) => !recent.includes(x.prompt.id));
  const choices = fresh.length ? fresh : pool;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  recent.push(pick.prompt.id);
  if (recent.length > Math.max(3, Math.floor(pool.length * 0.75))) recent.shift();
  return pick;
}

export function render(main, ctx, params) {
  const packId = params[0];
  const pick = pickPrompt(ctx, packId);
  if (!pick) {
    mount(main, h("div", { class: "card" }, h("h2", {}, "Pack not found"),
      h("p", {}, `There's no pack called “${packId}”.`), h("a", { class: "btn", href: "#/packs" }, "Choose a pack")));
    return;
  }
  const settings = getSettings();
  const { pack, prompt } = pick;
  const label = packId === "random" ? "Unlimited · any pack" : "Unlimited";

  mountRound(main, {
    pack, prompt, label,
    maxStrikes: settings.strikes,
    fuzzyMode: settings.fuzzyMode,
    hints: settings.hints,
    onFinish(summary, { visible }) {
      recordRound(pack.id, summary);
      if (!visible) return; // player already moved on; don't draw over their new screen
      const next = h("button", { class: "btn btn-primary", type: "button" }, "Next case");
      next.addEventListener("click", () => render(main, ctx, params));
      renderSummary(main, {
        pack, prompt, summary, label,
        actions: [next, h("a", { class: "btn btn-quiet", href: "#/packs" }, "Change pack")],
      });
      next.focus();
    },
  });
}
