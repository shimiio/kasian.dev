/**
 * Pixel mouse cursors, generated as tiny SVGs at build time.
 * Placeholder art: redraw them in Aseprite and swap the bitmaps below
 * ("o" = outline, "x" = fill, "." = transparent).
 */

const SCALE = 2; // screen px per art pixel; keep width/height × SCALE ≤ 32
const OUTLINE = "#0c0c0e";

const ARROW = [
  "o..........",
  "oo.........",
  "oxo........",
  "oxxo.......",
  "oxxxo......",
  "oxxxxo.....",
  "oxxxxxo....",
  "oxxxxxxo...",
  "oxxxxxxxo..",
  "oxxxxxxxxo.",
  "oxxxxxoooo.",
  "oxxoxxo....",
  "oxo.oxxo...",
  "oo..oxxo...",
  "o....oxxo..",
  ".....oooo..",
];

const HAND = [
  "....oo.......",
  "...oxxo......",
  "...oxxo......",
  "...oxxo......",
  "...oxxoooooo.",
  "...oxxoxxoxxo",
  "ooooxxoxxoxxo",
  "oxxoxxxxxxxxo",
  "oxxxxxxxxxxxo",
  ".oxxxxxxxxxxo",
  ".oxxxxxxxxxxo",
  "..oxxxxxxxxo.",
  "..oxxxxxxxxo.",
  "...oxxxxxxo..",
  "...oxxxxxxo..",
  "...oooooooo..",
];

/** Bitmap → CSS cursor value: url("data:image/svg+xml,…") x y, fallback */
function toCursor(bitmap: string[], fill: string, hotspot: [number, number], fallback: string) {
  const w = bitmap[0].length;
  const h = bitmap.length;
  let rects = "";
  bitmap.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === ".") return;
      const color = c === "o" ? OUTLINE : fill;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    }),
  );
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" ` +
    `viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`;
  const [hx, hy] = hotspot;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx * SCALE} ${hy * SCALE}, ${fallback}`;
}

export const arrowCursor = (fill: string) => toCursor(ARROW, fill, [0, 0], "auto");
export const handCursor = (fill: string) => toCursor(HAND, fill, [4, 0], "pointer");
