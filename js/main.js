// main.js — starts the game and switches screens.
//
// Screens are chosen by the part of the address after "#":
//   #/            home
//   #/packs       pick a pack
//   #/play/fnaf   Unlimited mode with the FNAF pack ("random" = any pack)
//   #/dive/fnaf   Quick dive: 7 prompts, 25 seconds each, one answer each
//   #/daily       today's Daily
//   #/archive     list of past Dailies;  #/archive/2026-11-05 plays one
//   #/stats  #/settings  #/faq  #/party
// Hash addresses work on any static host with no server setup.

import { loadPacks } from "./packs.js";
import { getSettings } from "./storage.js";
import { h, mount } from "./ui/dom.js";
import { applyTheme } from "./theme.js";
import * as home from "./ui/home.js";
import * as packsScreen from "./ui/packs.js";
import * as unlimited from "./ui/unlimited.js";
import * as daily from "./ui/daily.js";
import * as archive from "./ui/archive.js";
import * as stats from "./ui/stats.js";
import * as settings from "./ui/settings.js";
import * as faq from "./ui/faq.js";
import * as party from "./ui/party.js";
import * as dive from "./ui/dive.js";

const routes = [
  { pattern: /^\/?$/, screen: home, nav: null },
  { pattern: /^\/packs$/, screen: packsScreen, nav: "packs" },
  { pattern: /^\/play\/([\w-]+)$/, screen: unlimited, nav: "packs" },
  { pattern: /^\/dive\/([\w-]+)$/, screen: dive, nav: "packs" },
  { pattern: /^\/daily$/, screen: daily, nav: "daily" },
  { pattern: /^\/archive$/, screen: archive, nav: "daily" },
  { pattern: /^\/archive\/(\d{4}-\d{2}-\d{2})$/, screen: daily, nav: "daily" },
  { pattern: /^\/stats$/, screen: stats, nav: "stats" },
  { pattern: /^\/settings$/, screen: settings, nav: "settings" },
  { pattern: /^\/faq$/, screen: faq, nav: null },
  { pattern: /^\/party$/, screen: party, nav: null },
];

const main = document.getElementById("main");
let cleanup = null; // screens can return a function to stop timers when we leave
let ctx = null;

function render() {
  if (typeof cleanup === "function") cleanup();
  cleanup = null;
  const path = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
  const route = routes.find((r) => r.pattern.test(path));
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (route && a.dataset.nav === route.nav) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (!route) {
    mount(main, h("div", { class: "card" },
      h("h2", {}, "File not found"),
      h("p", {}, "There's no page at this address."),
      h("a", { class: "btn", href: "#/" }, "Go to the home page")));
    return;
  }
  const params = path.match(route.pattern).slice(1);
  window.scrollTo(0, 0);
  try {
    cleanup = route.screen.render(main, ctx, params);
  } catch (err) {
    console.error(err);
    mount(main, h("div", { class: "card" }, h("h2", {}, "Something broke"), h("p", {}, String(err.message || err))));
  }
}

async function start() {
  applyTheme(getSettings().theme);
  try {
    const packs = await loadPacks();
    if (!packs.length) throw new Error("No question packs could be loaded.");
    ctx = { packs };
  } catch (err) {
    console.error(err);
    mount(main, h("div", { class: "card" },
      h("h2", {}, "Couldn't load the question files"),
      h("p", {}, "If you opened index.html by double-clicking it, the browser blocks loading the data files. Start the local server instead (see README.md), then open http://localhost:8000."),
      h("p", { class: "muted small" }, String(err.message || err))));
    return;
  }
  window.addEventListener("hashchange", render);
  render();
}

start();
