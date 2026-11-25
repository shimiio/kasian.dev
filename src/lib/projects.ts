import { getCollection, type CollectionEntry } from "astro:content";
import { HOME_PROJECT_COLOURS, SITE_ACCENT_STYLE } from "./experiments";

export type Project = CollectionEntry<"projects">;

/** All published projects, newest first. Drafts show up only in dev. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection(
    "projects",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  // Still going first, then by the latest month (finished, or started).
  const key = (p: Project) => `${p.data.finished ? 0 : 1}${p.data.finished ?? p.data.started}`;
  return all.sort((a, b) => key(b).localeCompare(key(a)));
}

export const projectUrl = (p: Project) => `/projects/${p.id}/`;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const parts = (m: string) => {
  const [y, mm] = m.split("-");
  return { y, m: MONTHS[Number(mm) - 1] };
};

/** "since sep 2026", "may 2026", "sep – nov 2026", "nov 2025 – feb 2026". */
export function projectWhen(p: Project): string {
  const a = parts(p.data.started);
  if (!p.data.finished) return `since ${a.m} ${a.y}`;
  const b = parts(p.data.finished);
  if (p.data.finished === p.data.started) return `${a.m} ${a.y}`;
  return a.y === b.y ? `${a.m} – ${b.m} ${b.y}` : `${a.m} ${a.y} – ${b.m} ${b.y}`;
}

/** Unique view-transition name so a sprite "travels" between pages. */
export const spriteTransition = (p: Project) => `sprite-${p.id}`;

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/** Site accent; also the fallback for projects without their own colour. */
export const SITE_ACCENT = SITE_ACCENT_STYLE === "neutral" ? "#e8e6e3" : "#b6f36a";

/** Background colour on pages that are not a project (home, 404): a cool,
 *  almost neutral grey, so a project's own colour stands out when you enter it. */
export const SITE_BACKDROP = "#9db0cc"; // cool steel grey

export const projectAccent = (p: Project) => p.data.accent ?? SITE_ACCENT;

/** A project's colour outside its own page (rows, latest card, tiles):
 *  neutral without HOME_PROJECT_COLOURS. Tint: for surfaces, its backdrop. */
const NEUTRAL = "#e8e6e3";
export const homeColour = (p: Project) => (HOME_PROJECT_COLOURS ? projectAccent(p) : NEUTRAL);
export const homeTint = (p: Project) =>
  HOME_PROJECT_COLOURS ? (p.data.backdrop ?? projectAccent(p)) : NEUTRAL;

