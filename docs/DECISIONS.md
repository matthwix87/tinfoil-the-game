# Decisions and assumptions

Every choice the build agent made without asking you. Change any of them — most are one number in one file.

## Your open questions (PLAN §10) — defaults picked
| # | Question | Picked | Where to change |
|---|---|---|---|
| 1 | Strikes vs timer vs fixed guesses? | **3 strikes** ends a round (main mode). Unlimited strike count is adjustable 1–5 in Settings; the Daily is always 3 so results are comparable. A timed mode exists separately (Quick dive). | `js/storage.js` `DEFAULT_SETTINGS.strikes`; `js/ui/daily.js` `DAILY_STRIKES` |
| 2 | Fuzzy matches auto-accept or ask? | **Auto-accept** small typos by default. Settings has "Ask 'Did you mean…?'" and "Exact spelling only". | `DEFAULT_SETTINGS.fuzzyMode` |
| 3 | Who writes depth scores? | **The agent drafted all of them**; every pack and prompt is marked `"reviewed": false`. Please review. | `data/packs/*.json` |
| 4 | Host online? | **Not deployed.** The project is plain static files, ready for GitHub Pages/Netlify later (see README). | — |
| 5 | Extra topics? | Misc pack has space, animals, food, films, sport, music, etc. | `data/packs/misc.json` |

## Gameplay
- **Score** = sum of depths of answers found; **gem** always counts as depth 100 (whatever the file says) **+150 bonus**; **finding every answer +100**; **hint −25**; score never below 0. (`js/scoring.js`)
- **Tier names** (themed): Mainstream 0–19 📺, Rumor 20–44 🗣️, Cover-up 45–69 🕵️, Redacted 70–89 🗂️, Top Secret 90–99 🔒, Tinfoil Gem 100 🛸. Each shows icon + name, not colour alone.
- **Duplicates** (including a different alias of an answer you already found) → rejected, no strike.
- **"Did you mean X?" → No** costs **no strike** (you just retype). Rationale: the game guessed, not you.
- **Ambiguous typo** (equally close to two answers, e.g. "Bambia" for Gambia/Zambia) → no strike, asks you to be more exact.
- **Hint** reveals the first letter and length of the gem, once per round; disabled once the gem is found. Can be turned off in Settings.
- **Round ends** on max strikes, on finding every answer, or on "Close case" (needs two taps to avoid accidents).

## Matching (`js/match.js`)
- Normalizing ignores case, accents, punctuation, spaces, and a leading "the " ("The Gambia" = "gambia"); "&" = "and".
- Typo allowance uses the **shorter** of guess/answer length: under 5 letters → exact only; 5–8 → 1 edit; 9+ → 2 edits. The plan said "never fuzzy under 4"; **4-letter words were also kept exact** because short words collide too easily (Mali/Bali, Iran/Iraq).
- A swap of two neighbouring letters counts as **one** typo ("Bonnei" → Bonnie).
- Using the shorter length stops "Australia" matching "Austria" (and similar).
- Prompts can list `notAnswers` — common wrong answers that must never be fuzzy-matched (e.g. "Gambia" in a landlocked list). They simply count as a strike.

## Daily (`js/daily.js`, `js/ui/daily.js`)
- **Launch date** (Daily #1) = **1 Nov 2026**, so the Archive already has entries.
- Every prompt from every pack is sorted by id and shuffled with a fixed seed; day N plays item N (wrapping). No repeats until all 58 prompts are used.
- **Caveat:** adding/removing prompts reshuffles the rotation, so past Archive days may show a different prompt afterwards. Fine for a personal game; if it matters later, freeze a list of daily prompt ids.
- Uses the player's **local** calendar day (like Wordle), so people in different time zones switch at different moments.
- One attempt per date. Guesses are saved as you type, so **reloading resumes** the round instead of giving a fresh attempt.
- **Streak** counts only today's Daily; Archive replays count for stats but not streaks.
- Share text: `Tinfoil #N 🛸` / pack icon + prompt / emoji squares (one per guess; ❌ = strike) / score line. No link is included because nothing is hosted yet.
- **Testing aid:** add `?today=YYYY-MM-DD` before the `#` (e.g. `http://localhost:8000/?today=2026-12-01#/daily`) to pretend it's another day. It also lets a player peek ahead — harmless for a personal game; remove `todayKey()`'s override if you publish competitively.

## Quick dive (added after research)
- 7 prompts, 25 s each, one answer each, wrong guesses free, timeout = 0. Points = Tinfoil depth (gem 100 + 150). Not recorded in per-pack stats (it would inflate "cases played"); "best quick dive" is tracked instead.
- In Quick dive, the "Ask" typo setting behaves like "Auto" (no time for a dialog under a timer); "Exact only" is respected.

## Party mode (`js/party.js`)
- Rules as written in PLAN.md: hidden random fuse 10–30 s; passing with ≥8 s left keeps the time; <8 s resets to 8; pop eliminates the holder; new fuse after a pop.
- The remaining time is **never shown** (only a "burning" bar that doesn't shrink), matching "hidden fuse".
- After each pop a **new prompt** is drawn. If every answer to a prompt gets used, a new prompt is swapped in without stopping the fuse.
- Wrong and repeated answers have no penalty except lost time.

## Content
- 4 packs, 58 prompts, ~1,400 answers. Each prompt has ≥10 answers except three where the real list is shorter: Eevee + evolutions (9), countries bordering Germany (9), Australian states/territories (9). The validator warns about these; they are intentional.
- Where a list is "complete" (e.g. all 54 African countries, all 50 US states, all 14 eight-thousanders) it was made complete; where it's open-ended (Ghost Pokémon, fruits, rivers) common answers were prioritised.
- Some gems were chosen for **fun factor** rather than strict rarity (noted in each prompt's `source`).
- Debatable calls are written in each prompt's `source` field (e.g. Australia is not counted as an island country; Kosovo included as partially recognised; Edinburgh/Cardiff/Belfast not counted as European capitals).

## Tech
- Vanilla HTML/CSS/JS ES modules, no build step, no backend. Hash routes (`#/daily`) so any static host works.
- `package.json` exists only so Node treats `.js` files as modules for the tests; there are no dependencies.
- `tools/serve.js` was added as a Python-free way to run the local server (this PC has no Python; the plan's `python -m http.server 8000` still works where Python exists).
- Fonts: Big Shoulders Stencil Display + Courier Prime from Google Fonts; falls back to system fonts offline.
- Sound: generated beeps (Web Audio), off by default.
