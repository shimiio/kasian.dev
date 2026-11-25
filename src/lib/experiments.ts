/**
 * Style experiments, switched here in one place. Each flag keeps the older
 * variant available until a decision is made.
 */

/** Clean slate: everything outside project pages goes neutral (grey
 *  background, no project colours in rows, cards, tiles or the mouse cursor,
 *  plain notes), to rethink colour later with real sprites and more projects.
 *  The choices below are kept as they were and come back with false. */
export const CLEAN_SLATE = true;

/** Background field: "pixels" = low-res dithered colour field (canvas),
 *  "soft" = blurred CSS blobs. */
export const BACKGROUND: "pixels" | "soft" = "pixels";

/** Background on pages that are not a project (home, 404): "mix" = the
 *  projects' colours taking turns, "grey" = cool near-neutral. */
export const HOME_BACKDROP: "mix" | "grey" = CLEAN_SLATE ? "grey" : "mix";

/** Glows in the grey background: 3 = like a project page, 1 = a single,
 *  larger glow drifting around, most of the screen left dark. */
export const GREY_BLOBS: 1 | 3 = 1;

/** Pixel mouse cursors: neutral arrow and hand. */
export const CUSTOM_CURSOR = true;

/** Over a project, the hand cursor takes the project's colour. */
export const CURSOR_PROJECT_COLOUR = CLEAN_SLATE ? false : true;

/** The site's own colour outside project pages (name cursor, focus ring,
 *  spinners): "lime" = #b6f36a, "neutral" = off-white, like kel's home, where
 *  colour appears only where a project is. */
export const SITE_ACCENT_STYLE: "lime" | "neutral" = "neutral";

/** Project colours outside project pages: category labels and spinners in
 *  rows, the latest card's tint, row hover, footer tiles. Off: all neutral. */
export const HOME_PROJECT_COLOURS = CLEAN_SLATE ? false : true;

/** "latest" card on home: "paper" = light paper card, "tint" = dark glass card
 *  tinted with the project's colour (a light neutral tint without
 *  HOME_PROJECT_COLOURS). */
export const LATEST_STYLE: "paper" | "tint" = "tint";

/** Project row on hover: "paper" = flips to paper, "tint" = the project's
 *  colour (or a neutral light) shows through, like a selected line. */
export const ROW_HOVER: "paper" | "tint" = "tint";

/** Asides ("not built yet, maybe never", "collected so far"): "comment" =
 *  italic mono with "// ", like comments in a code editor; "plain" = dim text
 *  after a dash. */
export const NOTES: "comment" | "plain" = CLEAN_SLATE ? "plain" : "comment";
