// packs.js — loads the question packs from data/packs/.
//
// A static website can't list a folder, so data/packs/index.json names the
// pack files to load. To add a pack: drop the .json file in data/packs/ and
// add its file name to index.json (see docs/ADDING_QUESTIONS.md).

let cache = null;

export async function loadPacks() {
  if (cache) return cache;
  const indexRes = await fetch("data/packs/index.json", { cache: "no-cache" });
  if (!indexRes.ok) throw new Error("Could not load data/packs/index.json");
  const index = await indexRes.json();
  const results = await Promise.all(
    index.packs.map(async (file) => {
      try {
        const res = await fetch(`data/packs/${file}`, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        // One broken pack shouldn't take the whole game down.
        console.warn(`Skipping pack ${file}:`, err);
        return null;
      }
    })
  );
  cache = results.filter((p) => p && Array.isArray(p.prompts) && p.prompts.length);
  return cache;
}

export function findPack(packs, id) {
  return packs.find((p) => p.id === id) || null;
}

export function findPrompt(packs, promptId) {
  for (const pack of packs) {
    const prompt = pack.prompts.find((p) => p.id === promptId);
    if (prompt) return { pack, prompt };
  }
  return null;
}
