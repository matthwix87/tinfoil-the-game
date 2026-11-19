// ui/packs.js — the pack picker (also provides the folder cards for Home).
import { h, mount } from "./dom.js";
import { getStats } from "../storage.js";

export function packCard(pack) {
  const s = getStats().packs[pack.id];
  return h("a", { class: "card pack", href: `#/play/${pack.id}` },
    h("span", { class: "pack-icon", "aria-hidden": "true" }, pack.icon || "🗂️"),
    h("span", { class: "pack-name" }, pack.name),
    h("span", { class: "pack-meta" }, `${pack.prompts.length} files${s ? ` · best ${s.best}` : ""}`));
}

export function randomCard(ctx) {
  const total = ctx.packs.reduce((n, p) => n + p.prompts.length, 0);
  return h("a", { class: "card pack", href: "#/play/random" },
    h("span", { class: "pack-icon", "aria-hidden": "true" }, "🎲"),
    h("span", { class: "pack-name" }, "Any pack"),
    h("span", { class: "pack-meta" }, `${total} files, shuffled`));
}

export function render(main, ctx) {
  mount(main,
    h("section", { class: "hero" },
      h("h1", {}, "Packs"),
      h("p", {}, "Pick a pack and play cases back to back. Unlimited mode — no daily limit.")),
    h("div", { class: "pack-grid" }, randomCard(ctx), ...ctx.packs.map((p) => packCard(p))),
    h("div", { class: "card", style: { marginBottom: "22px" } },
      h("h3", {}, "Quick dive"),
      h("p", {}, "A faster mode: 7 prompts in a row, 25 seconds each, one answer per prompt. Wrong guesses are free — only the clock can beat you."),
      h("div", { class: "btn-row" },
        h("a", { class: "btn btn-primary btn-small", href: "#/dive/random" }, "🎲 Any pack"),
        ctx.packs.map((p) => h("a", { class: "btn btn-small", href: `#/dive/${p.id}` }, `${p.icon} ${p.name}`)))),
    h("div", { class: "card" },
      h("h3", {}, "Make your own pack"),
      h("p", {}, "Packs are plain text files in the data/packs folder. Copy data/TEMPLATE.json, fill it in, and add the file name to data/packs/index.json."),
      h("p", { class: "muted small" }, "Step-by-step guide: docs/ADDING_QUESTIONS.md")));
}
