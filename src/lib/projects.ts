import { getCollection, type CollectionEntry } from "astro:content";

export type Project = CollectionEntry<"projects">;

/** All published projects, newest first. Drafts show up only in dev. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection(
    "projects",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const projectUrl = (p: Project) => `/projects/${p.id}/`;

/** Unique view-transition name so a sprite "travels" between pages. */
export const spriteTransition = (p: Project) => `sprite-${p.id}`;

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/** Site accent; also the fallback for projects without their own colour. */
export const SITE_ACCENT = "#b6f36a";

/** Background colour on pages that are not a project (home, 404): a cool,
 *  almost neutral grey, so a project's own colour stands out when you enter it. */
export const SITE_BACKDROP = "#9aa1ab";

export const projectAccent = (p: Project) => p.data.accent ?? SITE_ACCENT;

/** Statuses of a project that runs / is in use right now: shown with a spinner. */
const RUNNING = new Set(["live", "daily driver", "in progress"]);
export const isRunning = (p: Project) => RUNNING.has(p.data.status);
