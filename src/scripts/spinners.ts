/**
 * Terminal spinners: every [data-spinner] element shows the same braille
 * frame, advanced here (one shared timer). Used as the mark of a project
 * being built (see lib/status.ts and StatusMark.astro), like a live process.
 * Reduced motion: a still first frame.
 */
export const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const FRAME_MS = 100;

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let frame = 0;
const tick = () => {
  const ch = SPINNER[frame % SPINNER.length];
  for (const el of document.querySelectorAll("[data-spinner]")) el.textContent = ch;
};

setInterval(() => {
  if (reduced.matches || document.hidden) return;
  frame++;
  tick();
}, FRAME_MS);
document.addEventListener("astro:page-load", tick);
