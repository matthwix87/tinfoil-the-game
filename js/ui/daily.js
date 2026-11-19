// ui/daily.js — the Daily case (and Archive replays of past days).
//
// Rules:
//   - Everyone gets the same prompt on the same date (see js/daily.js).
//   - One attempt per date. Your guesses are saved as you go, so reloading
//     the page resumes the round instead of restarting it.
//   - Only playing TODAY's daily counts for your streak.
//   - The Daily always uses 3 strikes so results are comparable.

import { h, mount, prettyDate } from "./dom.js";
import { mountRound, renderSummary } from "./round.js";
import { logToSquares } from "../game.js";
import { tierFor } from "../scoring.js";
import { buildRotation, promptForDate, dateKey, dailyNumber, LAUNCH_DATE } from "../daily.js";
import { getSettings, getDailyResult, saveDailyResult, recordRound, load, save, currentStreak } from "../storage.js";

export const DAILY_STRIKES = 3;

/** Today's date key. For testing you can add ?today=2026-12-01 to the address. */
export function todayKey() {
  const override = new URLSearchParams(location.search).get("today");
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return dateKey(new Date());
}

export function rotationOf(ctx) {
  if (!ctx.rotation) ctx.rotation = buildRotation(ctx.packs);
  return ctx.rotation;
}

export function dailyFor(ctx, key) {
  const item = promptForDate(rotationOf(ctx), key);
  if (!item) return null;
  const pack = ctx.packs.find((p) => p.id === item.packId);
  return { pack, prompt: item.prompt, num: dailyNumber(key) };
}

export function shareTextFor(num, pack, prompt, summary, squares) {
  return [
    `Tinfoil #${num} ${summary.gemFound ? "🛸" : ""}`.trim(),
    `${pack.icon || ""} ${prompt.text}`.trim(),
    squares,
    `${summary.score} pts · ${summary.found.length}/${summary.total} found · deepest ${summary.deepest}`,
  ].join("\n");
}

/** Turn a saved result back into the summary shape renderSummary expects. */
function storedToSummary(stored, prompt) {
  const foundNames = new Set(stored.found.map((f) => f.name));
  const missed = prompt.answers
    .filter((a) => !foundNames.has(a.name))
    .map((a) => {
      const isGem = a.name === prompt.gem;
      const depth = isGem ? 100 : a.depth;
      return { name: a.name, depth, isGem, tier: tierFor(depth) };
    })
    .sort((a, b) => b.depth - a.depth);
  return { ...stored, missed, total: prompt.answers.length };
}

export function render(main, ctx, params) {
  const today = todayKey();
  const key = params[0] || today;
  const isToday = key === today;

  if (key > today) {
    mount(main, h("div", { class: "card" }, h("h2", {}, "That file is sealed"),
      h("p", {}, "You can't open a Daily from the future."), h("a", { class: "btn", href: "#/daily" }, "Open today's Daily")));
    return;
  }
  const daily = dailyFor(ctx, key);
  if (!daily) {
    mount(main, h("div", { class: "card" }, h("h2", {}, "No Daily for that date"),
      h("p", {}, `Dailies start on ${prettyDate(LAUNCH_DATE)}.`), h("a", { class: "btn", href: "#/archive" }, "Browse the archive")));
    return;
  }
  const { pack, prompt, num } = daily;
  const label = isToday ? `Daily #${num}` : `Archive #${num}`;
  const actions = () => [
    isToday ? h("a", { class: "btn", href: "#/archive" }, "Play past days") : h("a", { class: "btn", href: "#/archive" }, "Back to archive"),
    h("a", { class: "btn btn-quiet", href: "#/play/random" }, "Play Unlimited"),
  ];

  // Already played this date? Show the saved result instead of a new round.
  const stored = getDailyResult(key);
  if (stored) {
    const summary = storedToSummary(stored, prompt);
    renderSummary(main, {
      pack, prompt, summary, label,
      shareText: shareTextFor(num, pack, prompt, summary, stored.squares),
      actions: [
        h("p", { class: "muted small", style: { width: "100%", margin: "4px 0 0" } },
          isToday ? `One attempt per day. Streak: ${currentStreak(today)} 🔥. Next file at midnight.` : `You played this on ${prettyDate(stored.playedOn || key)}.`),
        ...actions(),
      ],
    });
    return;
  }

  // In-progress actions for this date (so a reload resumes, not restarts).
  const progressKey = `progress:${key}`;
  const progress = load(progressKey, []);
  const settings = getSettings();

  mountRound(main, {
    pack, prompt, label,
    maxStrikes: DAILY_STRIKES,
    fuzzyMode: settings.fuzzyMode,
    hints: settings.hints,
    replay: progress,
    onAction(action) {
      progress.push(action);
      save(progressKey, progress);
    },
    onFinish(summary, { visible }) {
      const squares = logToSquares(summary.log);
      const result = {
        num,
        promptId: prompt.id,
        packId: pack.id,
        score: summary.score,
        squares,
        found: summary.found.map((f) => ({ name: f.name, depth: f.depth, isGem: f.isGem })),
        gemFound: summary.gemFound,
        gemName: summary.gemName,
        strikes: summary.strikes,
        deepest: summary.deepest,
        endReason: summary.endReason,
        hintUsed: summary.hintUsed,
        playedOn: today,
      };
      const isNew = !getDailyResult(key);
      saveDailyResult(key, result, isToday);
      if (isNew) recordRound(pack.id, summary);
      save(progressKey, []); // finished: no need to keep the in-progress log
      if (visible) render(main, ctx, params); // re-draw as the saved result
    },
  });
}
