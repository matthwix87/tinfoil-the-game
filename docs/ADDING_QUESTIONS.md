# Adding and editing questions

All questions live in plain text files in `data/packs/`. You can edit them in any text editor (Notepad works; VS Code is nicer because it highlights mistakes).

## The words we use
- **Pack** — one file, e.g. `fnaf.json`. Shows up as a folder on the home screen.
- **Prompt** — one question, e.g. "Name a Pokémon type".
- **Answer** — one accepted answer, with a **depth** (how obscure it is).
- **Alias** — another spelling or name that counts as the same answer ("Ivory Coast" for "Côte d'Ivoire").
- **Gem** — the single answer you consider the rarest or most fun to find. Always worth 100 + a bonus.

## Fix a wrong fact or depth
1. Open the pack file, e.g. `data/packs/pokemon.json`.
2. Find the answer (Ctrl+F) and change it. Example:
   ```json
   { "name": "Leafeon", "aliases": [], "depth": 32 },
   ```
3. Once you've checked a whole prompt, change its `"reviewed": false` to `"reviewed": true`.
4. Save, then reload the game in the browser.

## Add a new prompt to an existing pack
Copy an existing prompt block (from `{` to the matching `},`) and paste it right after another prompt. Then change:
- `"id"` — must be unique across **all** packs. Use `pack-topic` style, e.g. `"pokemon-water-gen1"`.
- `"text"` — the question as players see it. Start with "Name a…".
- `"answers"` — at least **8** (10 or more is better).
- `"gem"` — must be spelled **exactly** like one of the answer names.
- Optional `"notAnswers"` — common wrong guesses that should never be accepted as a typo of a real answer (e.g. `["Australia"]` in a list that contains Austria).
- Optional `"source"` — where you checked the facts, or notes.

Watch the commas: every item in a list needs a comma after it **except the last one**.

## Add a whole new pack
1. Copy `data/TEMPLATE.json` into `data/packs/` and rename it, e.g. `data/packs/movies.json`.
2. Change `"id"`, `"name"`, `"icon"` (any emoji) and `"description"`, then fill in prompts.
3. Open `data/packs/index.json` and add the file name to the list:
   ```json
   { "packs": ["fnaf.json", "pokemon.json", "geography.json", "misc.json", "movies.json"] }
   ```
4. Reload the game. The new folder appears on the home screen.

## Check your work
With the local server running, open **http://localhost:8000/dev/validate.html**. It lists any mistakes in plain language: missing commas, a gem that doesn't match an answer, two answers that look the same, too few answers, and so on. Fix anything marked ERROR. Warnings are just suggestions.

(If you have Node installed you can also run `node tools/validate.js`.)

## How to pick a depth (an easy method)
Depth goes from 1 (everyone says it) to 99 (almost nobody says it). The gem is always 100.

**The 5-friends test:** ask 5 people to name as many answers as they can in 30 seconds. For each answer, count how many of them said it:

| How many of 5 said it | Depth |
|---|---|
| 5 | 1–10 |
| 4 | 10–20 |
| 3 | 20–35 |
| 2 | 35–55 |
| 1 | 55–75 |
| 0 (but they agree it's right once told) | 75–99 |

Rules of thumb if you can't ask anyone:
- The first thing anyone would say → under 10.
- You'd expect a casual fan to get it → 15–35.
- Only a real fan would think of it → 40–65.
- You had to look it up to remember → 70–90.
- A trivia nerd would be proud → 90–99.

Depths are relative within one prompt — what matters is that rarer answers are higher than common ones.

## Aliases tips
- You **don't** need aliases for capital letters, accents, spaces, hyphens, apostrophes or a leading "The" — the game ignores those automatically ("cote divoire", "Mr Mime", "Gambia" all work).
- Do add real alternative names: nicknames ("Monty"), old names ("Swaziland"), abbreviations ("DRC", "UCN"), or other languages ("Sagarmatha").
- An alias must not be the same as another answer's name or alias in the same prompt — the checker will tell you if it is.
- Small typos are forgiven automatically on longer answers, so you don't need to add misspellings.
