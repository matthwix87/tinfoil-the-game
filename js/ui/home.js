// ui/home.js — the front page: today's case file, then the pack folders.
import { h, mount } from "./dom.js";
import { todayKey, dailyFor } from "./daily.js";
import { getDailyResult, currentStreak } from "../storage.js";
import { packCard, randomCard } from "./packs.js";

export function render(main, ctx) {
  const today = todayKey();
  const daily = dailyFor(ctx, today);
  const result = getDailyResult(today);
  const streak = currentStreak(today);

  const caseFile = daily
    ? h("article", { class: "card pin casefile" },
        h("span", { class: "stamp" }, result ? "Filed" : "Classified"),
        h("p", { class: "casefile-label" }, `Today's file #${daily.num}`, h("br"), `${daily.pack.icon} ${daily.pack.name}`),
        h("p", { class: "casefile-prompt" }, daily.prompt.text),
        result
          ? h("p", {}, `You scored ${result.score}${result.gemFound ? " and found the gem 🛸" : ""}. Streak: ${streak} 🔥`)
          : h("p", { class: "muted" }, streak ? `Streak: ${streak} 🔥 — keep it going.` : "One attempt. Three strikes. Dig deep."),
        h("div", { class: "btn-row" },
          h("a", { class: "btn btn-primary", href: "#/daily" }, result ? "See my result" : "Open today's file"),
          h("a", { class: "btn btn-quiet", href: "#/archive" }, "Archive")))
    : null;

  mount(main,
    h("section", { class: "hero" },
      h("h1", {}, "Tinfoil"),
      h("p", {}, "Name the answers nobody else knows. The more obscure the answer, the higher your paranoia level.")),
    caseFile,
    h("div", { class: "section-head" }, h("h2", {}, "Unlimited"), h("a", { href: "#/packs" }, "All packs")),
    h("div", { class: "pack-grid" }, randomCard(ctx), ...ctx.packs.map((p) => packCard(p))),
    h("nav", { class: "footer-links", "aria-label": "More" },
      h("a", { href: "#/faq" }, "How to play"),
      h("a", { href: "#/dive/random" }, "Quick dive (7 × 25s)"),
      h("a", { href: "#/party" }, "Party mode (pass the phone)"),
      h("a", { href: "#/stats" }, "My stats"),
      h("a", { href: "#/settings" }, "Settings")));
}
