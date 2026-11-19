// ui/party.js — Party mode screen: set up players, then pass the phone.
import { h, mount, announce } from "./dom.js";
import { createParty } from "../party.js";
import { playCorrect, playStrike, playPop } from "../sound.js";

let lastSetup = { names: ["Player 1", "Player 2", "Player 3"], packId: "random" };

function randomPrompt(ctx, packId, avoid) {
  const pool = [];
  for (const pack of ctx.packs) {
    if (packId !== "random" && pack.id !== packId) continue;
    for (const prompt of pack.prompts) if (prompt.id !== avoid) pool.push({ pack, prompt });
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function render(main, ctx) {
  let timer = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; };

  // ---------- Setup ----------
  function setup() {
    stop();
    const inputs = h("div", { class: "player-inputs" });
    const drawInputs = () => {
      inputs.replaceChildren(...lastSetup.names.map((name, i) => {
        const input = h("input", { type: "text", value: name, maxlength: "16", "aria-label": `Player ${i + 1} name` });
        input.addEventListener("input", () => { lastSetup.names[i] = input.value; });
        return input;
      }));
    };
    drawInputs();
    const add = h("button", { class: "btn btn-small", type: "button" }, "Add player");
    const remove = h("button", { class: "btn btn-small btn-quiet", type: "button" }, "Remove player");
    add.addEventListener("click", () => { if (lastSetup.names.length < 8) { lastSetup.names.push(`Player ${lastSetup.names.length + 1}`); drawInputs(); } });
    remove.addEventListener("click", () => { if (lastSetup.names.length > 2) { lastSetup.names.pop(); drawInputs(); } });
    const packSel = h("select", { id: "party-pack" },
      h("option", { value: "random", selected: lastSetup.packId === "random" }, "🎲 Any pack"),
      ctx.packs.map((p) => h("option", { value: p.id, selected: lastSetup.packId === p.id }, `${p.icon} ${p.name}`)));
    const startBtn = h("button", { class: "btn btn-primary", type: "button" }, "Start party");
    startBtn.addEventListener("click", () => {
      const names = lastSetup.names.map((n, i) => n.trim() || `Player ${i + 1}`);
      lastSetup = { names, packId: packSel.value };
      play(names, packSel.value);
    });

    mount(main,
      h("section", { class: "hero" },
        h("h1", {}, "Party mode"),
        h("p", {}, "Pass the phone. Name a new answer to get rid of it before the hidden fuse pops.")),
      h("div", { class: "card" },
        h("h3", {}, "Players (2–8)"),
        inputs,
        h("div", { class: "btn-row" }, add, remove),
        h("div", { class: "setting", style: { marginTop: "12px" } }, h("label", { for: "party-pack" }, "Questions from"), packSel),
        h("div", { class: "btn-row", style: { marginTop: "12px" } }, startBtn)),
      h("div", { class: "card", style: { marginTop: "18px" } },
        h("h3", { style: { marginBottom: "8px" } }, "Rules"),
        h("ul", {},
          h("li", {}, "A hidden fuse burns for 10–30 seconds."),
          h("li", {}, "Type a valid answer nobody has used yet to pass the phone on."),
          h("li", {}, "The next player keeps the time that's left — but never less than 8 seconds."),
          h("li", {}, "When it pops, whoever is holding the phone is out. Last one standing wins."))));
  }

  // ---------- Playing ----------
  function play(names, packId) {
    const party = createParty({ players: names });
    let current = randomPrompt(ctx, packId);
    party.setPrompt(current.prompt);

    const promptLabel = h("p", { class: "casefile-label" });
    const promptText = h("h1", { class: "casefile-prompt" });
    const playersEl = h("ul", { class: "party-players", "aria-label": "Players" });
    const who = h("div", { class: "who" });
    const status = h("p", { class: "muted" });
    const fuse = h("div", { class: "party-fuse", "aria-hidden": "true" }, h("div"));
    const feedback = h("p", { class: "feedback", role: "status" });
    const input = h("input", { class: "guess-input", type: "text", placeholder: "Quick — an answer!", "aria-label": "Your answer",
      autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "send" });
    const sendBtn = h("button", { class: "btn btn-primary", type: "submit" }, "Pass");
    const form = h("form", { class: "guess-row" }, input, sendBtn);
    const actionBtn = h("button", { class: "btn btn-primary", type: "button" });
    const turnCard = h("div", { class: "card party-turn" }, who, status, fuse);

    const say = (text, kind = "") => { feedback.textContent = text; feedback.dataset.kind = kind; announce(text); };

    function draw() {
      const s = party.state;
      promptLabel.textContent = `${current.pack.icon} ${current.pack.name} · Round ${s.round}`;
      promptText.textContent = current.prompt.text;
      playersEl.replaceChildren(...s.players.map((p, i) =>
        h("li", { class: (p.out ? "out" : "") + (i === s.current && s.status !== "won" ? " active" : "") }, p.name)));
      const burning = s.status === "burning";
      form.hidden = !burning;
      actionBtn.hidden = burning;
      fuse.hidden = !burning;
      fuse.firstChild.style.animation = burning ? "gauge-pulse .6s ease-in-out infinite" : "";
      if (s.status === "ready") {
        who.textContent = `${party.holder().name}, you start`;
        status.textContent = "Press the button to light the fuse. You won't know how long it is.";
        actionBtn.textContent = "Light the fuse 🧨";
      } else if (burning) {
        who.textContent = `${party.holder().name}!`;
        status.textContent = `It's burning… ${s.used.size} answer${s.used.size === 1 ? "" : "s"} used`;
      } else if (s.status === "popped") {
        who.textContent = `💥 ${s.lastOut} is out`;
        status.textContent = `${party.alive().length} players left. New case, new fuse.`;
        actionBtn.textContent = "Next round";
      } else if (s.status === "won") {
        who.textContent = `🏆 ${party.alive()[0]?.name} wins!`;
        status.textContent = `${s.lastOut} was holding it when it popped.`;
        actionBtn.textContent = "Play again";
      }
    }

    actionBtn.addEventListener("click", () => {
      const s = party.state;
      if (s.status === "ready") {
        party.start();
        say("");
        startTimer();
        draw();
        input.focus();
      } else if (s.status === "popped") {
        party.nextRound();
        current = randomPrompt(ctx, packId, current.prompt.id);
        party.setPrompt(current.prompt);
        say("");
        draw();
      } else if (s.status === "won") {
        play(names, packId);
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value;
      if (!text.trim()) return;
      input.value = "";
      const ev = party.guess(text);
      if (ev.type === "pass") {
        say(`✔ ${ev.name} — pass to ${ev.to}!`, "ok");
        playCorrect(40);
        if (ev.exhausted) {
          // Every answer used: swap in a fresh case, keep the fuse burning.
          current = randomPrompt(ctx, packId, current.prompt.id);
          party.setPrompt(current.prompt);
          say(`Every answer used! New case — pass to ${ev.to}!`, "ok");
        }
      } else if (ev.type === "used") {
        say(`${ev.name} was already said.`, "strike");
        playStrike();
      } else if (ev.type === "wrong") {
        say(`“${ev.typed}” isn't on file.`, "strike");
        playStrike();
      }
      draw();
      input.focus();
    });

    function startTimer() {
      stop();
      let last = performance.now();
      timer = setInterval(() => {
        const now = performance.now();
        const ev = party.tick((now - last) / 1000);
        last = now;
        if (ev) {
          stop();
          playPop();
          turnCard.classList.remove("party-pop");
          void turnCard.offsetWidth;
          turnCard.classList.add("party-pop");
          say(`💥 POP! ${ev.name} is out.`, "strike");
          draw();
        }
      }, 100);
    }

    const quit = h("button", { class: "btn btn-quiet btn-small", type: "button" }, "End party");
    quit.addEventListener("click", setup);

    mount(main,
      h("section", { class: "party-stage" },
        h("div", { class: "card pin casefile round-prompt" }, promptLabel, promptText),
        playersEl,
        turnCard,
        form,
        feedback,
        h("div", { class: "btn-row" }, actionBtn, quit)));
    draw();
  }

  setup();
  return stop; // stop the timer if the player leaves this screen
}
