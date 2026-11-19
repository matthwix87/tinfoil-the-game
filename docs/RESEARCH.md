# Research: how krillion.io plays

**Date:** 19 Nov 2026
**How:** The build agent had no interactive browser tool (no Claude in Chrome or built-in browser). Instead it drove a **headless Firefox** from a small test script: it loaded `krillion.io` and `krillion.io/unlimited/classic`, read the visible text, took phone-size (390×844) screenshots, and played **one prompt** of an Unlimited dive (one nonsense guess, one real guess, then waited for the reveal).
**What was not done:** No answer data, code or art was copied. Only the visible screens were looked at. The Daily, Archive, Themed packs and Puffer Party were **not** played.

Legend: **OBSERVED** = seen on screen. **ASSUMED** = inferred, not confirmed.

## Home screen (OBSERVED)
- Title "KRILLION", subtitle "THE DAILY DIVE".
- Tagline: **"7 prompts · 25 seconds each · rarer answers sink deeper"**.
- Buttons: `BEGIN DESCENT` (daily), `DIVE #127` label, `ARCHIVE`, `THEMED PACKS`, `UNLIMITED ∞`, `PUFFER PARTY` (marked "BETA · LIMITED TIME"), `HOW TO PLAY`, Privacy, a hamburger menu, a sound toggle, settings and a shirt (merch) icon.
- Pixel-art ocean scene. A depth ruler down the right side has ocean-zone captions ("light begins to fade", "THE MIDNIGHT ZONE", "the Titanic rests here — 3,800m", "THE HADAL ZONE", "the trench floor — a perfect dive ends here").
- HUD shows **DEPTH (metres)** top-left and **SCORE** top-right, with a row of 7 progress squares between them ("PROMPT 1 OF 7").

## A prompt (OBSERVED, Unlimited "Endless dive")
- Unlimited is also **7 prompts per dive** ("ENDLESS DIVE #1", "PROMPT 1 OF 7").
- Prompt example: "Name a noodle dish", with "▼ rarer answers sink deeper ▼".
- A short "descending · the clock starts in…" countdown, then a **25-second** countdown number.
- Input placeholder: **"type one answer…"** (`enterkeyhint="send"`, autocorrect/capitalize off). **One answer per prompt.**
- A guess that isn't accepted shows: **`"xqzv": no echo. try again`**. There was **no visible penalty**: the timer kept running and the prompt stayed open.
- A valid guess plays an animation: the answer drops past tier lines on the depth ruler, then a reveal card shows:
  - Tier name (e.g. **PLANKTON**), the answer ("Ramen"), **"+10 PTS · sink 100m"**, and a one-line flavour text ("The answer everyone blurts out.").
  - A `DESCEND ▼` button to go to the next prompt.
- Tier ladder shown during the drop (name · points):
  `PLANKTON · 10`, `TOO CLEVER · 15`, `SCHOOLER · 30`, `RARE · 60`, `DEEP CUT · 85`, `ONE IN A KRILLION · 100`.
  So points come in **fixed steps per tier** (not a free 0–100 number). ASSUMED: "TOO CLEVER" is for answers that are valid but technically/pedantically so.

## Not observed (ASSUMED / unknown)
- What happens if the 25 seconds run out with no answer (ASSUMED: 0 points for that prompt).
- Final score / share-card format after 7 prompts.
- Whether there are hints, skips or power-ups (none were visible on the prompt screen).
- Puffer Party rules beyond the FAQ (used as written in PLAN.md).
- Exact mobile keyboard behaviour (screens were taken in a headless browser).

## What this changed in Tinfoil
- The PLAN's default ("one prompt, keep naming answers until 3 strikes") is **different** from Krillion's real format. The owner-approved default (3 strikes) is kept as the **main mode** (Daily + Unlimited). See `DECISIONS.md`.
- Added an optional **Quick dive** mode that follows the observed format: 7 prompts, 25 s each, one answer each, wrong guesses free, timeout = 0. It uses Tinfoil's own depth scores and tier names, not Krillion's.
- Kept Tinfoil's own look (foil/conspiracy board) — nothing visual was copied.
