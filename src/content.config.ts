import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { CATEGORIES } from "./lib/categories";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    /** One sentence under the title on the project page. */
    tagline: z.string(),
    /** Shorter line for lists on the home page. */
    blurb: z.string(),
    category: z.enum(CATEGORIES),
    status: z.string(),
    stack: z.array(z.string()),
    platform: z.string().optional(),
    builtWith: z.string().optional(),
    /** Used for ordering; the newest one is shown as "latest". */
    date: z.coerce.date(),
    /** Path under public/, e.g. /sprites/kel.png */
    sprite: z.string(),
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
