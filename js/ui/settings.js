// ui/settings.js — theme, typo handling, strikes, hints, sound, reset.
import { h, mount, announce } from "./dom.js";
import { getSettings, setSettings, clearAll } from "../storage.js";
import { applyTheme } from "../theme.js";

export function render(main) {
  const s = getSettings();

  const select = (id, value, options, onChange) => {
    const el = h("select", { id }, options.map(([v, label]) => h("option", { value: v, selected: v === value }, label)));
    el.addEventListener("change", () => onChange(el.value));
    return el;
  };
  const toggle = (id, checked, onChange) => {
    const input = h("input", { type: "checkbox", id, checked, role: "switch" });
    input.addEventListener("change", () => onChange(input.checked));
    return h("span", { class: "toggle" }, input, h("span", {}));
  };
  const saved = (msg = "Saved") => announce(msg);

  const strikes = h("input", { type: "number", id: "set-strikes", min: "1", max: "5", step: "1", value: String(s.strikes), inputmode: "numeric", style: { width: "5em" } });
  strikes.addEventListener("change", () => {
    const n = Math.min(5, Math.max(1, Math.round(Number(strikes.value) || 3)));
    strikes.value = String(n);
    setSettings({ strikes: n });
    saved();
  });

  const resetBtn = h("button", { class: "btn", type: "button" }, "Erase all my data");
  resetBtn.addEventListener("click", () => {
    if (confirm("Erase all stats, streaks, daily results and settings on this device? This can't be undone.")) {
      clearAll();
      applyTheme("system");
      render(main);
      announce("All data erased");
    }
  });

  mount(main,
    h("section", { class: "hero" }, h("h1", {}, "Settings")),
    h("div", { class: "card" },
      h("div", { class: "setting" },
        h("label", { for: "set-theme" }, "Theme", h("span", { class: "hint" }, "Light foil or dark bunker.")),
        select("set-theme", s.theme, [["system", "Match my device"], ["light", "Light"], ["dark", "Dark"]], (v) => { setSettings({ theme: v }); applyTheme(v); saved(); })),
      h("div", { class: "setting" },
        h("label", { for: "set-fuzzy" }, "Typos", h("span", { class: "hint" }, "Small spelling mistakes on longer answers. Short answers always need exact spelling.")),
        select("set-fuzzy", s.fuzzyMode, [["auto", "Accept automatically"], ["ask", "Ask “Did you mean…?”"], ["off", "Exact spelling only"]], (v) => { setSettings({ fuzzyMode: v }); saved(); })),
      h("div", { class: "setting" },
        h("label", { for: "set-strikes" }, "Strikes in Unlimited", h("span", { class: "hint" }, "Wrong answers allowed (1–5). The Daily always uses 3.")),
        strikes),
      h("div", { class: "setting" },
        h("label", { for: "set-hints" }, "Hint button", h("span", { class: "hint" }, "Shows the gem's first letter for −25 points.")),
        toggle("set-hints", s.hints, (v) => { setSettings({ hints: v }); saved(); })),
      h("div", { class: "setting" },
        h("label", { for: "set-sound" }, "Sound effects", h("span", { class: "hint" }, "Little beeps for right and wrong answers.")),
        toggle("set-sound", s.sound, (v) => { setSettings({ sound: v }); saved(); }))),
    h("div", { class: "card", style: { marginTop: "20px" } },
      h("h3", { style: { marginBottom: "8px" } }, "Your data"),
      h("p", { class: "muted" }, "Everything is saved in this browser only. Nothing is sent anywhere."),
      resetBtn));
}
