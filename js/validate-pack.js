// validate-pack.js — checks a question pack for mistakes.
// Used by tools/validate.js (Node) and dev/validate.html (browser).
//
// Errors   = things that will break the game. Fix these.
// Warnings = things worth a look (e.g. fewer than 10 answers).

import { normalize } from "./match.js";

export const MIN_ANSWERS = 8;      // hard minimum
export const SUGGESTED_ANSWERS = 10;

export function validatePack(pack, seenPromptIds = new Set()) {
  const errors = [];
  const warnings = [];
  const where = (p) => `[${pack.id || "?"}${p ? " / " + (p.id || "?") : ""}]`;

  if (!pack || typeof pack !== "object") return { errors: ["Pack is not an object"], warnings };
  if (!pack.id) errors.push(`${where()} pack is missing "id"`);
  if (!pack.name) errors.push(`${where()} pack is missing "name"`);
  if (!Array.isArray(pack.prompts) || pack.prompts.length === 0) {
    errors.push(`${where()} pack has no "prompts"`);
    return { errors, warnings };
  }

  for (const p of pack.prompts) {
    if (!p.id) errors.push(`${where(p)} a prompt is missing "id"`);
    else if (seenPromptIds.has(p.id)) errors.push(`${where(p)} prompt id "${p.id}" is used more than once`);
    else seenPromptIds.add(p.id);
    if (!p.text) errors.push(`${where(p)} prompt is missing "text"`);
    if (!Array.isArray(p.answers)) {
      errors.push(`${where(p)} prompt has no "answers" list`);
      continue;
    }
    if (p.answers.length < MIN_ANSWERS) {
      errors.push(`${where(p)} has ${p.answers.length} answers; needs at least ${MIN_ANSWERS}`);
    } else if (p.answers.length < SUGGESTED_ANSWERS) {
      warnings.push(`${where(p)} has ${p.answers.length} answers (${SUGGESTED_ANSWERS}+ suggested)`);
    }

    // Every name and alias must be unique inside this prompt (after normalizing),
    // otherwise the game can't tell which answer a guess means.
    const keys = new Map();
    for (const a of p.answers) {
      if (!a.name) {
        errors.push(`${where(p)} an answer is missing "name"`);
        continue;
      }
      if (typeof a.depth !== "number" || a.depth < 0 || a.depth > 100) {
        errors.push(`${where(p)} "${a.name}" depth must be a number 0-100 (got ${a.depth})`);
      } else if (a.name !== p.gem && (a.depth < 1 || a.depth > 99)) {
        warnings.push(`${where(p)} "${a.name}" depth ${a.depth}: use 1-99 (100 is only for the gem)`);
      }
      if (a.aliases && !Array.isArray(a.aliases)) errors.push(`${where(p)} "${a.name}" aliases must be a list`);
      for (const n of [a.name, ...(a.aliases || [])]) {
        const k = normalize(n);
        if (!k) {
          errors.push(`${where(p)} "${n}" has no letters or digits`);
          continue;
        }
        // (An alias that normalizes to the same text as its own answer is
        //  harmless, just unnecessary, so it isn't reported.)
        if (keys.has(k) && keys.get(k) !== a.name) {
          errors.push(`${where(p)} "${n}" clashes with "${keys.get(k)}" (same after normalizing: "${k}")`);
        }
        keys.set(k, a.name);
      }
    }

    // Gem checks
    if (!p.gem) errors.push(`${where(p)} is missing "gem"`);
    else if (!p.answers.some((a) => a.name === p.gem)) {
      errors.push(`${where(p)} gem "${p.gem}" is not one of the answer names (must match exactly)`);
    }

    // notAnswers must not overlap real answers
    for (const n of p.notAnswers || []) {
      if (keys.has(normalize(n))) errors.push(`${where(p)} notAnswers "${n}" is also a real answer`);
    }
  }
  return { errors, warnings };
}
