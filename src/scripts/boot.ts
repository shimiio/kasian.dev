/**
 * Home "boot" animation, like a terminal starting up. Plays once per browser
 * session (add ?boot to the URL to replay it), never with reduced motion.
 * The inline gate in index.astro adds html.booting before the first paint;
 * CSS hides the marked parts while it is set.
 *
 *   [data-boot-text="char"]  typed letter by letter, the block cursor follows
 *   [data-boot-text="word"]  streamed word by word
 *   [data-boot-section]      shows a spinner line first ("loading x/"); all
 *                            sections load in parallel and finish one by one
 *   [data-boot-item]         inside a section: printed one after another
 *
 * A click, tap or key (not scrolling) skips to the end.
 */

import { SPINNER } from "./spinners";

// ── Tuning (ms) ──────────────────────────────────────────────────────────
const CHAR_MS = 55; // name, per letter
const WORD_MS = 22; // intro, per word
const PAUSE_MS = 150; // between intro blocks
const LOAD_MS = 650; // first section's spinner time
const LOAD_STEP_MS = 380; // each next section finishes this much later
const ITEM_MS = 70; // between printed items
const SPINNER_MS = 80;

const root = document.documentElement;

const run = () => {
  if (!root.classList.contains("booting")) return;
  sessionStorage.setItem("booted", "1");
  // ?boot=5 plays it 5× slower, to look at it closely.
  const slow = Number(new URLSearchParams(location.search).get("boot")) || 1;

  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms * slow));
  const restore: (() => void)[] = [];
  // Scrolling does not skip (it is short, and loaders below are part of it):
  // a click / tap or a non-scrolling key does.
  const scrollKeys = /^(Arrow|Page|Home$|End$| $|Tab$|Shift|Control|Alt|Meta)/;
  const onKey = (e: KeyboardEvent) => {
    if (!scrollKeys.test(e.key)) finish();
  };

  const finish = () => {
    timers.forEach(clearTimeout);
    restore.forEach((fn) => fn());
    root.classList.remove("booting");
    removeEventListener("click", finish);
    removeEventListener("keydown", onKey);
    document.removeEventListener("astro:before-swap", finish);
  };
  addEventListener("click", finish);
  addEventListener("keydown", onKey);
  document.addEventListener("astro:before-swap", finish);

  /** Wrap an element's text in hidden spans (letters or words); returns them. */
  const split = (el: HTMLElement, mode: string) => {
    const html = el.innerHTML;
    restore.push(() => {
      el.innerHTML = html;
      el.classList.remove("boot-typing");
    });
    const units: HTMLElement[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const parts = mode === "char" ? [...(node.textContent ?? "")] : (node.textContent ?? "").split(/(\s+)/);
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.append(part);
          continue;
        }
        const span = document.createElement("span");
        span.className = "boot-off";
        span.textContent = part;
        units.push(span);
        frag.append(span);
      }
      node.replaceWith(frag);
    }
    el.classList.add("boot-typing");
    return units;
  };

  // 1. Name and intro, one after another. The name's block cursor travels with
  // the text (solid while typing); at the end it is back after the name.
  let t = 200;
  let introEnd = t;
  const texts = [...document.querySelectorAll<HTMLElement>("[data-boot-text]")];
  let cursor: HTMLElement | null = null;
  for (const el of texts) {
    const mode = el.dataset.bootText ?? "word";
    const units = split(el, mode);
    cursor ??= el.querySelector<HTMLElement>(".cursor");
    const c = cursor;
    if (c && units[0]) {
      if (el === texts[0]) units[0].before(c);
      else at(t, () => units[0].before(c));
    }
    const step = mode === "char" ? CHAR_MS : WORD_MS;
    units.forEach((u, i) =>
      at(t + i * step, () => {
        u.classList.remove("boot-off");
        if (c) u.after(c);
      }),
    );
    t += units.length * step + PAUSE_MS;
    if (mode === "char") introEnd = t; // sections start loading once the name is in
  }
  if (cursor) {
    const c = cursor;
    c.classList.add("cursor-solid");
    at(t, () => c.classList.remove("cursor-solid"));
  }

  // 2. Sections: spinners start together, then finish one by one.
  let end = t;
  document.querySelectorAll<HTMLElement>("[data-boot-section]").forEach((section, i) => {
    const label = section.querySelector("h2")?.firstChild?.textContent?.trim() ?? "";
    const loader = document.createElement("div");
    loader.className = "boot-loader";
    loader.setAttribute("aria-hidden", "true");
    const spin = document.createElement("span");
    spin.className = "boot-spin";
    const text = document.createElement("span");
    text.className = "shimmer";
    text.textContent = `loading ${label}`;
    loader.append(spin, text);
    restore.push(() => {
      loader.remove();
      section.classList.remove("boot-open");
      section.querySelectorAll(".boot-shown").forEach((el) => el.classList.remove("boot-shown"));
    });

    let frame = 0;
    const tick = () => {
      spin.textContent = SPINNER[frame++ % SPINNER.length];
    };
    tick();
    let spinTimer = 0;
    at(introEnd, () => {
      section.prepend(loader);
      spinTimer = window.setInterval(tick, SPINNER_MS * slow);
    });
    restore.push(() => clearInterval(spinTimer));

    const done = introEnd + LOAD_MS + i * LOAD_STEP_MS;
    at(done, () => {
      clearInterval(spinTimer);
      loader.remove();
      section.classList.add("boot-open");
    });
    const items = section.querySelectorAll<HTMLElement>("[data-boot-item]");
    items.forEach((item, j) => at(done + j * ITEM_MS, () => item.classList.add("boot-shown")));
    end = Math.max(end, done + items.length * ITEM_MS);
  });

  at(end + 300, finish);
};

document.addEventListener("astro:page-load", run);
