# Tinfoil

A trivia game where the **rarer** your answer, the more it's worth. Name answers to a prompt ("Name a FNAF animatronic", "Name a country in Africa"); common answers score a little, obscure ones score a lot, and every prompt hides one **Tinfoil gem**. Packs: FNAF, Pokémon, Geography and Misc.

Inspired by daily "name the rarest answer" games such as krillion.io. Fan-made, not affiliated; all code and questions were written for this project.

## Play it on your computer
The game is plain files, but browsers block loading the question files if you just double-click `index.html`. Run a tiny local web server instead — pick whichever you have:

**Option A — Node.** Node isn't installed on this PC's PATH, but Adobe Creative Cloud ships a copy that works (in PowerShell):
```
cd "C:\Users\matth\OneDrive\Documents\Tinfoil the game"
& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" tools/serve.js
```
If you install Node from nodejs.org, it's just `node tools/serve.js`.

**Option B — Python** (if installed):
```
cd "C:\Users\matth\OneDrive\Documents\Tinfoil the game"
python -m http.server 8000
```

Then open **http://localhost:8000** in your browser. Press Ctrl+C in the terminal to stop.

To try it on your phone, both devices must be on the same Wi-Fi and the server must listen on your network — `tools/serve.js` only listens on this computer for safety. Hosting it online (below) is the easier way.

## Modes
- **Daily** — the same prompt for everyone each day, one attempt, 3 strikes, shareable emoji result, streaks.
- **Archive** — replay any past Daily.
- **Unlimited** — pick a pack (or any pack) and play prompts back to back.
- **Quick dive** — 7 prompts, 25 seconds each, one answer per prompt.
- **Party mode** — pass-the-phone hot potato for 2–8 players with a hidden fuse.
- **My stats**, **Settings** (theme, typo handling, strikes, hints, sound), **How to play**.

## Add or fix questions
See **[docs/ADDING_QUESTIONS.md](docs/ADDING_QUESTIONS.md)**. Check your edits at http://localhost:8000/dev/validate.html.

All starter depths were drafted by AI and are marked `"reviewed": false` — please go through them.

## Tests
- Logic tests in the browser: http://localhost:8000/tests/match.test.html
- Or with Node: `node tests/run-tests.js`
- Pack checker with Node: `node tools/validate.js`

## Put it online later (not done yet)
It's a static site, so any static host works with no setup:
- **GitHub Pages:** push this folder to a GitHub repo → Settings → Pages → deploy from the main branch.
- **Netlify:** drag the folder onto app.netlify.com/drop.

## Folder map
```
index.html          the page
css/                theme.css (colours), base.css (layout), game.css (round screen)
js/main.js          switches screens (#/daily, #/packs …)
js/game.js          rules of a round (strikes, duplicates, gem)
js/match.js         typo-tolerant answer matching
js/scoring.js       tiers and points
js/daily.js         picks the Daily from the date
js/dive.js          Quick dive rules
js/party.js         Party mode rules
js/storage.js       saves stats/settings in the browser
js/ui/              one file per screen
data/packs/         the question packs (+ index.json listing them)
data/TEMPLATE.json  copy this to start a new pack
docs/               RESEARCH, DECISIONS, ADDING_QUESTIONS
tools/              validate.js (pack checker), serve.js (local server)
tests/              logic tests
dev/validate.html   pack checker in the browser
```
