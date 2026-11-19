// ui/stats.js — "My Tinfoil": totals, streaks and per-pack records.
import { h, mount } from "./dom.js";
import { getStats, currentStreak } from "../storage.js";
import { todayKey } from "./daily.js";

export function render(main, ctx) {
  const s = getStats();
  const streak = currentStreak(todayKey());
  const avg = s.played ? Math.round(s.totalScore / s.played) : 0;
  const tile = (value, label) => h("div", { class: "card stat" }, h("div", { class: "stat-value" }, String(value)), h("div", { class: "stat-label" }, label));

  const rows = ctx.packs.map((p) => {
    const ps = s.packs[p.id] || { played: 0, best: 0, gems: 0, totalScore: 0 };
    return h("tr", {},
      h("td", {}, `${p.icon} ${p.name}`),
      h("td", { class: "num" }, String(ps.played)),
      h("td", { class: "num" }, String(ps.best)),
      h("td", { class: "num" }, String(ps.gems)));
  });

  mount(main,
    h("section", { class: "hero" }, h("h1", {}, "My Tinfoil"), h("p", {}, "Your file, kept on this device only.")),
    h("div", { class: "stat-grid" },
      tile(`${streak} 🔥`, "daily streak"),
      tile(s.daily.best, "best streak"),
      tile(s.played, "cases played"),
      tile(s.bestScore, "best score"),
      tile(avg, "average score"),
      tile(`${s.gems} 🛸`, "gems found"),
      tile(s.answersFound, "answers filed"),
      tile(s.deepest, "deepest answer"),
      tile(s.bestDive, "best quick dive")),
    h("div", { class: "card" },
      h("h3", { style: { marginBottom: "8px" } }, "By pack"),
      h("table", { class: "plain" },
        h("thead", {}, h("tr", {}, h("th", {}, "Pack"), h("th", { class: "num" }, "Played"), h("th", { class: "num" }, "Best"), h("th", { class: "num" }, "Gems"))),
        h("tbody", {}, rows))),
    s.played === 0 ? h("p", { class: "muted", style: { marginTop: "16px" } }, "No cases yet. ", h("a", { href: "#/daily" }, "Open today's file"), " to start your record.") : null);
}
