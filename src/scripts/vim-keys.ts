/**
 * Vim-style keys, for those who reach for them anyway:
 *
 *   j / k    next / previous stop: a project on home; a section heading or
 *            a screenshot on a project page (it gets focus, so Enter opens it)
 *   gg / G   top / bottom of the page
 *   n        next project (on a project page)
 *   h        back to the projects list (on a project page)
 *
 * Off while typing in a field, with a modifier held, or with a full-size
 * shot open. The footer shows a hint on devices with a keyboard and mouse.
 */

const STOPS = "[data-vim-stop], .story > h2, .story .shot-frame";
const G_MS = 500; // the two presses of gg

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let lastG = 0;

const visible = (el: HTMLElement) => el.offsetParent !== null;

const go = (el: HTMLElement) => {
  el.focus({ preventScroll: true });
  el.scrollIntoView({
    behavior: reduced.matches ? "auto" : "smooth",
    block: el.matches("h2") ? "start" : "center",
  });
};

const step = (dir: 1 | -1) => {
  const stops = [...document.querySelectorAll<HTMLElement>(STOPS)].filter(visible);
  if (!stops.length) return;
  let i = stops.indexOf(document.activeElement as HTMLElement);
  if (i === -1) {
    // Nothing chosen yet: start from what is on screen.
    const tops = stops.map((s) => s.getBoundingClientRect().top);
    const at = dir === 1 ? tops.findIndex((t) => t > 80) : tops.findLastIndex((t) => t < -10);
    if (at === -1) return; // nothing further that way
    i = at - dir;
  }
  const next = stops[Math.max(0, Math.min(stops.length - 1, i + dir))];
  if (next) go(next);
};

const jump = (top: number) => {
  (document.activeElement as HTMLElement | null)?.blur();
  window.scrollTo({ top, behavior: reduced.matches ? "auto" : "smooth" });
};

const follow = (selector: string) => document.querySelector<HTMLAnchorElement>(selector)?.click();

addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  const target = e.target as HTMLElement;
  if (target.closest("input, textarea, select, [contenteditable]")) return;
  if (document.querySelector("dialog[open]")) return;

  const key = e.key;
  if (key === "j") step(1);
  else if (key === "k") step(-1);
  else if (key === "G") jump(document.documentElement.scrollHeight);
  else if (key === "g") {
    if (e.timeStamp - lastG < G_MS) {
      jump(0);
      lastG = 0;
    } else lastG = e.timeStamp;
    return;
  } else if (key === "n") follow("a[data-vim-next]");
  else if (key === "h") follow("a[data-vim-back]");
  else return;
  e.preventDefault();
});
