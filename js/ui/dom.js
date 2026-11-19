// dom.js — tiny helpers for building the page.
//
// h("p", { class: "muted" }, "Hello") makes <p class="muted">Hello</p>.
// Text is always inserted as text (never as HTML), so question data
// can't accidentally inject code into the page.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
    else if (key === "style" && typeof value === "object") Object.assign(el.style, value);
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Replace everything inside an element. */
export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

/** Tell screen-reader users what just happened. */
export function announce(text) {
  const live = document.getElementById("sr-live");
  if (!live) return;
  live.textContent = "";
  // small delay so repeated identical messages are still read out
  setTimeout(() => { live.textContent = text; }, 30);
}

/** Copy text to the clipboard. Returns true if it worked. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-secure pages: fall back to a hidden textarea.
    try {
      const ta = h("textarea", { style: { position: "fixed", opacity: "0" } });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Format "2026-11-19" as "Thu 19 Nov 2026". */
export function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
