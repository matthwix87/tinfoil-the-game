// storage.js — saves settings, stats and daily results in the browser.
//
// Uses localStorage, which can be missing or blocked (private windows,
// strict privacy settings). Every read/write is wrapped in try/catch so the
// game still works — it just won't remember anything in that case.

import { addDays } from "./daily.js";

const PREFIX = "tinfoil:";
const memory = {}; // fallback store for when localStorage is unavailable

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return key in memory ? memory[key] : fallback;
    return JSON.parse(raw);
  } catch {
    return key in memory ? memory[key] : fallback;
  }
}

export function save(key, value) {
  memory[key] = value;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep the in-memory copy only */
  }
}

export function clearAll() {
  for (const k of Object.keys(memory)) delete memory[k];
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* nothing to clear */
  }
}

// ---------- Settings ----------
export const DEFAULT_SETTINGS = {
  theme: "system",   // "system" | "light" | "dark"
  fuzzyMode: "auto", // "auto" | "ask" | "off"
  sound: false,      // off by default
  strikes: 3,        // Unlimited mode only; the Daily is always 3
  hints: true,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load("settings", {}) };
}

export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  save("settings", next);
  return next;
}

// ---------- Stats ----------
function emptyStats() {
  return {
    played: 0,
    totalScore: 0,
    bestScore: 0,
    gems: 0,
    answersFound: 0,
    deepest: 0,
    dives: 0,     // Quick dives finished
    bestDive: 0,
    packs: {}, // packId -> { played, best, gems, totalScore }
    daily: { current: 0, best: 0, lastDate: null, played: 0 },
  };
}

export function getStats() {
  const s = { ...emptyStats(), ...load("stats", {}) };
  s.daily = { ...emptyStats().daily, ...(s.daily || {}) };
  return s;
}

/** Record a finished round (any mode). */
export function recordRound(packId, summary) {
  const s = getStats();
  s.played += 1;
  s.totalScore += summary.score;
  s.bestScore = Math.max(s.bestScore, summary.score);
  s.answersFound += summary.found.length;
  s.deepest = Math.max(s.deepest, summary.deepest);
  if (summary.gemFound) s.gems += 1;
  const p = s.packs[packId] || { played: 0, best: 0, gems: 0, totalScore: 0 };
  p.played += 1;
  p.totalScore += summary.score;
  p.best = Math.max(p.best, summary.score);
  if (summary.gemFound) p.gems += 1;
  s.packs[packId] = p;
  save("stats", s);
  return s;
}

/** Record a finished Quick dive. Returns the best dive score so far. */
export function recordDive(total) {
  const s = getStats();
  s.dives = (s.dives || 0) + 1;
  s.bestDive = Math.max(s.bestDive || 0, total);
  save("stats", s);
  return s.bestDive;
}

/** The streak as it should be shown today (0 if the player missed a day). */
export function currentStreak(today) {
  const d = getStats().daily;
  if (!d.lastDate) return 0;
  if (d.lastDate === today || d.lastDate === addDays(today, -1)) return d.current;
  return 0;
}

// ---------- Daily results ----------
export function getDailyResults() {
  return load("daily", {});
}

export function getDailyResult(key) {
  return getDailyResults()[key] || null;
}

/**
 * Save a daily result. Only TODAY's daily counts towards the streak;
 * archive replays are saved but don't change it.
 */
export function saveDailyResult(key, result, isToday) {
  const all = getDailyResults();
  if (all[key]) return all[key]; // one attempt per date
  all[key] = result;
  save("daily", all);
  if (isToday) {
    const s = getStats();
    const yesterday = addDays(key, -1);
    s.daily.current = s.daily.lastDate === yesterday ? s.daily.current + 1 : 1;
    s.daily.best = Math.max(s.daily.best, s.daily.current);
    s.daily.lastDate = key;
    s.daily.played += 1;
    save("stats", s);
  }
  return result;
}
