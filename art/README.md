# Sprite art

Sources for the pixel sprites in `public/sprites/`. Not served.

- `palette.gpl`: the shared palette. In Aseprite: Palette menu → Load Palette.
- `<name>.aseprite`: the source of each sprite in `public/sprites/<name>.png`.
- `drafts/`: placeholder sprites at 1×, 12×12. A starting point to redraw over, not the final art.

Rules for the set:

- 12×12, transparent background, one object per sprite.
- Outline in ink (`#17171c`). Light comes from the top left.
- Shared neutrals, plus the project's own three-step ramp (dark / accent / light). One spot colour (yellow) for anything that glows or shines.
- Each sprite must still read at 24px, its smallest size on the site.

Export as PNG (or SVG) to `public/sprites/<name>.png` and update `sprite:` in the project's `.mdx`.
