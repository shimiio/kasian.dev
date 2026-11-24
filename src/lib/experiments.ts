/**
 * Style experiments, switched here in one place. Each flag keeps the older
 * variant available until a decision is made.
 */

/** Background field: "pixels" = low-res dithered colour field (canvas),
 *  "soft" = blurred CSS blobs. */
export const BACKGROUND: "pixels" | "soft" = "pixels";

/** Background on pages that are not a project (home, 404): "mix" = the
 *  projects' colours taking turns, "grey" = near-neutral. */
export const HOME_BACKDROP: "mix" | "grey" = "mix";

/** Pixel mouse cursors: neutral arrow and hand; over a project the hand takes
 *  its colour. */
export const CUSTOM_CURSOR = true;

/** The site's own colour outside project pages (name cursor, focus ring,
 *  spinners): "lime" = #b6f36a, "neutral" = off-white, like kel's home, where
 *  colour appears only where a project is. With "neutral", project rows show
 *  their category and spinner in the project's colour. */
export const SITE_ACCENT_STYLE: "lime" | "neutral" = "neutral";

/** "latest" card on home: "paper" = light paper card, "tint" = dark glass card
 *  tinted with the project's colour. */
export const LATEST_STYLE: "paper" | "tint" = "tint";

/** Project row on hover: "paper" = flips to paper, "tint" = the project's
 *  colour shows through, like a selected line. */
export const ROW_HOVER: "paper" | "tint" = "tint";
