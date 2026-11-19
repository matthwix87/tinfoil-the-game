# Tinfoil the Game — Build Plan (for an Opus agent)

## 0. Read this first
You are building **Tinfoil**, a personal clone-inspired version of https://krillion.io ("Krillion · the daily dive"), with the owner's own question packs: **FNAF, Pokémon, Geography, and misc topics**.

**Do not copy Krillion's code, art, name, or logo.** Recreate the *mechanic* only. Tinfoil gets its own name, theme (tinfoil hat / conspiracy-board / silver-foil look), and content.

### What is actually known about Krillion (from its homepage + FAQ only)
- Trivia/guessing game. Each prompt has a **set of accepted answers**; each answer has a **rarity score** (how obscure it is). One answer is the rare "gem" (the *Krillion*). Players "dive" deeper by giving rarer answers.
- Rarity is computed from a familiarity database or LLM + manual review; the gem is also chosen for "fun factor".
- **Fuzzy matching with aliases** (typo-tolerant; e.g. "sea donkey" accepted as a near-miss alias).
- Modes: **Daily dive**, **Unlimited** (`/unlimited/classic`), **Puffer Party** (multiplayer hot-potato with hidden random fuse 10–30s; 20s left on pass → next player gets 20s; <8s left → reset to 8; new fuse after pop), **Archive** (past dailies), **Themed packs**, **My account**, **Friends**, **Settings**, **FAQ**.
- Single-player only for the main game.

### What is NOT known (the page is client-rendered; I could not see it)
Exact turn count, scoring formula, lives, power-ups, depth visuals, question UI. **Do not pretend to know these.** Step 1 below is to look at the live game yourself and fill the gaps; where you can't, use the defaults in §3 and record them in `docs/DECISIONS.md`.

---

## 1. Step 1 — Research the live game (before coding)
Use a browser tool (Claude in Chrome / built-in browser) to play krillion.io for a few rounds. Write findings to `docs/RESEARCH.md`:
- How a prompt is shown; how guesses are entered; what feedback appears per guess (depth number? rarity tier? color?).
- How many guesses/lives per round; what ends a round; the final score/share-card format.
- Any hints, skips, or power-ups.
- Layout, animation feel (descending/ocean motif), mobile behavior.
Only record what you observe. Mark anything inferred as "ASSUMED".

## 2. Tech stack (keep it simple, owner is non-expert)
- **Vanilla HTML + CSS + JS (ES modules). No build step, no framework, no backend.** Opening `index.html` through a tiny local server must just work.
- Question data in plain **JSON files** in `data/` so the owner can add questions by editing text.
- State (streaks, stats, settings, daily progress) in `localStorage`.
- Hosting-ready as static files (GitHub Pages / Netlify later).
- Local run: `python -m http.server 8000` in the project folder (document in README).

## 3. Core mechanic (defaults, override with research findings)
**A round = one prompt** (e.g. "Name a Pokémon", "Name a FNAF animatronic", "Name a country in Africa").
- Player types answers one at a time. Each valid answer reveals its **depth** (0–100 rarity; higher = rarer) and a tier name/color.
- Duplicates rejected without penalty. Invalid answers cost a **strike**.
- Default: **3 strikes ends the round**. Score = sum of depths, plus a big bonus for finding the **Tinfoil gem** (the single rarest answer).
- Fuzzy matching: normalize (lowercase, strip accents/punctuation/spaces-insensitive), accept aliases, accept edit distance ≤1 for words 5–8 chars and ≤2 for longer; never fuzzy-match very short answers (<4 chars). When fuzzy-matching, show "Did you mean X?" or auto-accept (configurable).
- Hint button (optional, costs score): reveals first letter of the unfound gem.

### Rarity tiers (rename to fit theme)
| Depth | Tier |
|---|---|
| 0–19 | Surface (everyone knows it) |
| 20–44 | Shallows |
| 45–69 | Deep |
| 70–89 | Abyss |
| 90–99 | Rare find |
| 100 | **The Gem** |

## 4. Modes to build (priority order)
1. **Unlimited** — pick a pack (or "random"), play prompts back-to-back. (MVP)
2. **Daily** — one prompt per day chosen deterministically from the date (seeded hash, same for everyone, no server). One attempt/day, shareable emoji result string, streak counter.
3. **Archive** — replay past dailies.
4. **Packs screen** — FNAF, Pokémon, Geography, Misc (+ owner can add).
5. **Stats/My Tinfoil** — streaks, best scores, gems found, per-pack stats.
6. **Settings** — dark/light, fuzzy auto-accept toggle, sound, strike count.
7. **FAQ/About** page.
8. **Stretch: Party mode (hot-potato)** — local pass-and-play on one device using Krillion's fuse rules above (random 10–30s hidden fuse; pass with ≥8s keeps remaining time, <8s resets to 8; players must type a valid *unused* answer to pass; pop eliminates). No networking in v1.

Out of scope: accounts, friends, ads, purchases, merch, online multiplayer.

## 5. Data format (`data/packs/<pack>.json`)
```json
{
  "id": "fnaf",
  "name": "Five Nights at Freddy's",
  "icon": "🐻",
  "prompts": [
    {
      "id": "fnaf-animatronics-fnaf1",
      "text": "Name an animatronic from the first FNAF game",
      "difficulty": "easy",
      "answers": [
        { "name": "Freddy Fazbear", "aliases": ["freddy", "fazbear"], "depth": 5 },
        { "name": "Golden Freddy", "aliases": ["yellow bear"], "depth": 60 },
        { "name": "Chica", "aliases": [], "depth": 8 }
      ],
      "gem": "Golden Freddy",
      "source": "optional note for fact-checking"
    }
  ]
}
```
Rules: `depth` is the owner's/agent's best estimate of obscurity (1–99); exactly one answer per prompt is the `gem` (depth forced to 100). Validate with a script `tools/validate.js` (Node optional) or an in-browser dev page `dev/validate.html` that checks: unique ids, gem exists, no duplicate names/aliases within a prompt, depth ranges, ≥8 answers per prompt.

### Content seeding (agent task)
Write **starter packs the owner can then edit**, ~15 prompts each, ≥10 answers per prompt:
- **FNAF:** animatronics per game, locations, minigames, characters (Michael/William Afton), Security Breach & Pizzeria Sim, etc.
- **Pokémon:** by type, by generation, starters, legendaries, Eeveelutions, moves, gym leaders, regions.
- **Geography:** countries by continent, capitals, rivers, landlocked countries, island nations, US states, mountains.
- **Misc:** animals, foods, movies, space, etc. (owner to expand).
Mark every AI-written depth/fact as `"reviewed": false`; owner will correct. **Be accurate — double-check FNAF/Pokémon facts; leave out anything you're unsure of.**
Also create `data/TEMPLATE.json` and `docs/ADDING_QUESTIONS.md` (plain-language guide, with an easy way to estimate depth, e.g. "ask 5 friends; the fewer who name it, the higher the depth").

## 6. File structure
```
Tinfoil the game/
├─ index.html
├─ css/ (base.css, theme.css, game.css)
├─ js/
│  ├─ main.js        (router: hash-based screens)
│  ├─ game.js        (round state machine)
│  ├─ match.js       (normalize + alias + fuzzy)
│  ├─ scoring.js
│  ├─ daily.js       (seeded date → prompt)
│  ├─ storage.js     (localStorage wrapper with try/catch)
│  ├─ party.js       (stretch)
│  └─ ui/            (screens)
├─ data/ (packs/*.json, TEMPLATE.json)
├─ assets/ (own art / emoji / SVG only)
├─ tools/validate.js
├─ docs/ (RESEARCH.md, DECISIONS.md, ADDING_QUESTIONS.md)
├─ tests/match.test.html (or node test)
└─ README.md
```

## 7. UI/Design
- Theme: **tinfoil/conspiracy** — silver foil gradients, red-string pinboard accents, "classified" stamps, monospace + one bold display font (Google Fonts OK). Depth meter as a vertical "signal strength / paranoia level" gauge instead of ocean depth.
- Mobile-first, one-hand playable; large input; visible keyboard-safe layout; ≥44px tap targets; WCAG AA contrast; don't rely on color alone for tiers (also show tier name/icon).
- Light + dark via CSS variables, respects `prefers-color-scheme`.
- Satisfying feedback: animate meter on correct guess, shake on strike, special flourish for the gem. Sound optional, off by default, toggle in settings.
- Use the `frontend-design` skill for visual direction.

## 8. Milestones & acceptance checks
1. **M1 Skeleton:** router, themed shell, loads packs. ✔ page loads with no console errors.
2. **M2 Matching:** `match.js` + tests. ✔ cases: case/accents/punctuation, alias hit, 1-typo hit, short-word no-fuzzy, duplicate rejection.
3. **M3 Unlimited mode** playable end-to-end on FNAF pack. ✔ strikes, scoring, gem bonus, round summary.
4. **M4 All 4 packs + validator** passing.
5. **M5 Daily + archive + share string + streak.** ✔ same prompt for same date; changing system date changes prompt; can't replay today's daily.
6. **M6 Stats + settings + FAQ.**
7. **M7 Polish + mobile pass** (test at 375px width) **+ README.**
8. **M8 (stretch) Party mode.**
Verify each milestone by actually running it in a browser (use the `run` skill / browser tools) and report what you saw, not what you expect.

## 9. Working rules for the agent
- Ask the owner before: installing anything, deploying/publishing, or deleting files. Otherwise proceed.
- Keep code commented in plain language; owner is learning.
- Don't scrape krillion.io's data or assets; write all content originally.
- Record every assumption in `docs/DECISIONS.md`.
- Finish each milestone with a short summary: what works, what's untested, what's next.

## 10. Open questions for the owner (agent should ask at start)
1. Strikes vs. timer vs. fixed number of guesses per round?
2. Should fuzzy matches auto-accept or ask "did you mean…?"
3. Who writes the depth scores — you, or agent drafts and you correct?
4. Want it hosted online (GitHub Pages) at the end?
5. Any extra topics beyond FNAF, Pokémon, Geography to seed?
