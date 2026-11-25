import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { CATEGORIES } from "./lib/categories";
import { STATUSES } from "./lib/status";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "a month: YYYY-MM");

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    /** One sentence under the title on the project page. */
    tagline: z.string(),
    /** Shorter line for lists on the home page. */
    blurb: z.string(),
    category: z.enum(CATEGORIES),
    /** Where it is now; each status has its own mark (see lib/status.ts). */
    status: z.enum(STATUSES),
    /** The project's own word for it, shown instead ("daily driver"). */
    statusLabel: z.string().optional(),
    stack: z.array(z.string()),
    platform: z.string().optional(),
    builtWith: z.string().optional(),
    /** When: a month, "2026-09". started alone = still going ("since sep
     *  2026"); with finished, a span ("sep – nov 2026"). Also the order on
     *  home: projects still going first, then by the latest month. */
    started: month,
    finished: month.optional(),
    /** Path under public/, e.g. /sprites/kel.png */
    sprite: z.string(),
    /** Project colour, like a project accent in kel: tints the background,
     *  the cursor and accents on its page. Omit to use the site accent. */
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "accent must be a #rrggbb colour")
      .optional(),
    /** Optional background colour, when the accent does not work there:
     *  dark orange reads as brown, so a warm accent may want a redder one. */
    backdrop: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "backdrop must be a #rrggbb colour")
      .optional(),
    /** Optional 2–3 line summary shown on paper above the story. */
    tldr: z.string().optional(),
    links: z
      .object({
        github: z.string().optional(),
        live: z.string().optional(),
        readme: z.string().optional(),
      })
      .default({}),
    draft: z.boolean().default(false),
  }),
});

const ideas = defineCollection({
  loader: file("src/content/ideas.json"),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    note: z.string().optional(),
  }),
});

export const collections = { projects, ideas };
