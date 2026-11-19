// ui/archive.js — every past Daily, newest first. Tap one to play (or see) it.
import { h, mount, prettyDate } from "./dom.js";
import { todayKey, dailyFor } from "./daily.js";
import { addDays, daysBetween, LAUNCH_DATE } from "../daily.js";
import { getDailyResults } from "../storage.js";

export function render(main, ctx) {
  const today = todayKey();
  const results = getDailyResults();
  const count = daysBetween(LAUNCH_DATE, today); // days before today
  const items = [];
  for (let i = 1; i <= count; i++) {
    const key = addDays(today, -i);
    const daily = dailyFor(ctx, key);
    if (!daily) continue;
    const r = results[key];
    items.push(h("li", {},
      h("a", { class: "card", href: `#/archive/${key}` },
        h("span", {},
          h("span", { class: "date" }, `#${daily.num} · ${prettyDate(key)}`), h("br"),
          h("span", { class: "muted small" }, `${daily.pack.icon} ${daily.prompt.text}`)),
        h("span", { class: "small", style: { whiteSpace: "nowrap" } }, r ? `${r.score} pts${r.gemFound ? " 🛸" : ""}` : "Unopened"))));
  }

  mount(main,
    h("section", { class: "hero" },
      h("h1", {}, "Archive"),
      h("p", {}, "Every past Daily. Playing old files counts for your stats but not your streak.")),
    h("p", {}, h("a", { class: "btn", href: "#/daily" }, "Today's file")),
    items.length
      ? h("ol", { class: "archive-list" }, items)
      : h("p", { class: "muted" }, "No past files yet — the archive fills up one day at a time."));
}
