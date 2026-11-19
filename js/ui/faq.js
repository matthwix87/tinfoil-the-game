// ui/faq.js — how to play, tiers, scoring, and other questions.
import { h, mount } from "./dom.js";
import { TIERS, GEM_BONUS, HINT_COST, SWEEP_BONUS } from "../scoring.js";

export function render(main) {
  const q = (question, ...answer) => h("details", {}, h("summary", {}, question), ...answer);
  const ranges = ["0–19", "20–44", "45–69", "70–89", "90–99", "100"];

  mount(main,
    h("section", { class: "hero" }, h("h1", {}, "How to play")),
    h("div", { class: "card faq" },
      q("What's the goal?",
        h("p", {}, "Each case is a category, like “Name a Pokémon type”. Type answers one at a time. Common answers score a little; obscure ones score a lot. Every case has one rarest answer: the Tinfoil gem.")),
      q("What ends a case?",
        h("p", {}, "Three wrong answers (strikes), finding every answer, or pressing “Close case”. Repeating an answer you already found is free — no strike.")),
      q("What do the depth numbers mean?",
        h("p", {}, "Depth runs from 0 to 100 and is our estimate of how few people would think of that answer. The gauge on the left shows your paranoia level for each answer."),
        h("ul", { class: "tier-key" }, TIERS.map((t, i) =>
          h("li", {}, h("span", { "aria-hidden": "true" }, t.icon), h("strong", {}, t.name), h("span", { class: "muted" }, `${ranges[i]} — ${t.blurb}`))))),
      q("How is the score worked out?",
        h("ul", {},
          h("li", {}, "Each answer scores its depth."),
          h("li", {}, `The gem scores 100 plus a ${GEM_BONUS}-point bonus.`),
          h("li", {}, `Finding every answer adds ${SWEEP_BONUS}.`),
          h("li", {}, `Using the hint costs ${HINT_COST}.`))),
      q("Do I have to spell perfectly?",
        h("p", {}, "No. Capitals, accents, spaces and punctuation are ignored (“cote divoire” works). Longer answers forgive one typo (5–8 letters) or two (9+ letters). Very short answers must be exact. You can change this in Settings.")),
      q("How does the Daily work?",
        h("p", {}, "Everyone gets the same case each day, picked from the date. You get one attempt, it always has 3 strikes, and playing on consecutive days builds your streak. Copy your result to share it. Missed a day? Play it from the Archive (no streak credit).")),
      q("What is Quick dive?",
        h("p", {}, "A faster mode closer to the original daily-dive games: 7 prompts in a row, 25 seconds each, and you file just one answer per prompt. Wrong guesses cost nothing but time. Run out of time and that prompt scores 0.")),
      q("What is Party mode?",
        h("p", {}, "Hot-potato for 2–8 people on one phone. A hidden fuse burns for 10–30 seconds. Type a valid new answer to pass the phone. If 8 seconds or more were left, the next player keeps that time; under 8 seconds resets to 8. When the fuse pops, whoever's holding it is out.")),
      q("Who decides how obscure an answer is?",
        h("p", {}, "The starter packs were drafted with AI help and still need checking by a human, so some depths will feel off. Anyone can edit the pack files — see docs/ADDING_QUESTIONS.md.")),
      q("Is my data private?",
        h("p", {}, "Yes. Stats and settings stay in this browser. There are no accounts and nothing is uploaded.")),
      q("Where did the idea come from?",
        h("p", {}, "Tinfoil is a fan-made game inspired by daily “name the rarest answer” trivia games such as Krillion. It is not affiliated with them, and all questions here were written for Tinfoil."))),
    h("p", { style: { marginTop: "20px" } }, h("a", { class: "btn btn-primary", href: "#/daily" }, "Open today's file")));
}
