# kasian.dev

My personal site: my projects and ideas from the other side — the stuff that doesn't make it into a README or a CV.

Astro (static) · MDX · Tailwind CSS v4.

## Commands

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # astro check + build into dist/
npm run preview  # serve dist/ locally
```

## Adding a project

Create `src/content/projects/<slug>.mdx`. The slug becomes the URL: `/projects/<slug>/`.

```yaml
---
title: kel
tagline: One sentence under the title on the project page.
blurb: Shorter line for the list on the home page.
category: tool # tool | study | experiment | fun
status: daily driver
stack: [Rust, winit]
platform: Windows # optional
builtWith: Claude Code # optional
date: 2026-10-01 # ordering; the newest one is "latest"
sprite: /sprites/kel.png
tldr: Optional 2–3 lines shown on paper above the story.
links: # all optional
  github: https://github.com/…
  live: https://…
  readme: https://…
draft: false # true = visible only in dev
---

## the pain
…
```

Every `##` heading in the story gets a `## ` prefix automatically. Link other projects with `[pare](/projects/pare/)`.

Ideas live in `src/content/ideas.json`.

## Sprites

Draw in Aseprite at 1x (e.g. 12×12 or 16×16), export PNG to `public/sprites/`.
They are rendered with `image-rendering: pixelated`, so keep display sizes at integer multiples of the sprite size.

## Config

Site name, location and footer links: `src/config.ts`.
Design tokens (colors, fonts): `@theme` in `src/styles/global.css`.
