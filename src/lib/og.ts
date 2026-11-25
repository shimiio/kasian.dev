/**
 * Link preview images (Open Graph, 1200×630), made at build time: what
 * Telegram, Discord or Slack show when someone shares a page. A dithered
 * pixel glow in the page's colour (like the site background), the sprite,
 * the title and a line of text. Rendered with satori (layout → SVG) and
 * resvg (SVG → PNG).
 */
import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const W = 1200;
const H = 630;
const PAD = 72;
const SPRITE_BOX = 216;
const GAP = 56;
const BG = [12, 12, 14]; // --color-bg
const FG = "#e8e6e3";
const DIM = "#8b8b93";

const font = (pkg: string, file: string) => readFile(`node_modules/@fontsource/${pkg}/files/${file}`);
const fonts = Promise.all([
  font("silkscreen", "silkscreen-latin-700-normal.woff"),
  font("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
  font("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff"),
]).then(([pixel, mono, monoBold]) => [
  { name: "pixel", data: pixel, weight: 700 as const },
  { name: "mono", data: mono, weight: 400 as const },
  { name: "mono", data: monoBold, weight: 700 as const },
]);

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** One soft glow, quantised to 4 levels and Bayer-dithered, as an SVG. */
function glow(colour: string): string {
  const CELL = 12;
  const cols = W / CELL;
  const rows = Math.ceil(H / CELL);
  const c = hex(colour);
  const level = (l: number) => {
    const s = (l / 4) * 0.28;
    return `rgb(${BG.map((b, i) => Math.round(b + (c[i] - b) * s)).join(",")})`;
  };
  // Glow centre behind the sprite, slightly up and left.
  const [cx, cy, r] = [cols * 0.2, rows * 0.3, cols * 0.4];
  let rects = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d2 = (x - cx) ** 2 + ((y - cy) * 1.3) ** 2;
      const v = (1 - Math.exp(-1.6 * Math.exp(-d2 / r ** 2))) * 4;
      const l = Math.min(4, Math.floor(v + BAYER[(y & 3) * 4 + (x & 3)]));
      if (l > 0) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${level(l)}"/>`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${rows * CELL}" ` +
    `viewBox="0 0 ${cols} ${rows}" shape-rendering="crispEdges">` +
    `<rect width="${cols}" height="${rows}" fill="rgb(${BG.join(",")})"/>${rects}</svg>`
  );
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// Tiny JSX-free element helper for satori.
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: { style, children },
});
const img = (src: string, size: number, style: Record<string, unknown> = {}): Node => ({
  type: "img",
  props: { src, width: size, height: size, style: { imageRendering: "pixelated", ...style } },
});

export interface OgCard {
  title: string;
  /** Line under the title. */
  text: string;
  /** Small line at the bottom, after kasian.dev. */
  meta?: string;
  /** Page colour: the glow (a project's backdrop, if it has one). */
  colour: string;
  /** Colour of the meta line; defaults to colour. */
  accent?: string;
  /** Sprite SVG paths under public/: one large, or a row of small ones. */
  sprite?: string;
  sprites?: string[];
}

const spriteUri = async (path: string) => dataUri(await readFile(`public${path}`, "utf8"));

export async function ogImage(card: OgCard): Promise<Buffer> {
  const big = card.sprite ? await spriteUri(card.sprite) : undefined;
  const row = await Promise.all((card.sprites ?? []).map(spriteUri));

  const tile = (src: string, box: number, sprite: number) =>
    h(
      "div",
      { display: "flex", alignItems: "center", justifyContent: "center", width: box, height: box, background: "#151519" },
      img(src, sprite),
    );

  const tree = h(
    "div",
    {
      display: "flex",
      width: W,
      height: H,
      padding: PAD,
      backgroundImage: `url(${dataUri(glow(card.colour))})`,
      backgroundSize: `${W}px ${H}px`,
      fontFamily: "mono",
      color: FG,
    },
    h(
      "div",
      { display: "flex", flexDirection: "column", justifyContent: "space-between", width: W - PAD * 2, height: H - PAD * 2 },
      h(
        "div",
        { display: "flex", alignItems: "center", gap: GAP },
        ...(big ? [tile(big, SPRITE_BOX, 168)] : []),
        h(
          "div",
          { display: "flex", flexDirection: "column", gap: 24, width: W - PAD * 2 - (big ? SPRITE_BOX + GAP : 0) },
          h("div", { fontFamily: "pixel", fontSize: card.title.length > 12 ? 68 : 92, lineHeight: 1 }, card.title),
          h("div", { fontSize: 30, lineHeight: 1.45, color: "#c9c7c3" }, card.text),
        ),
      ),
      h(
        "div",
        { display: "flex", alignItems: "flex-end", justifyContent: "space-between" },
        h(
          "div",
          { display: "flex", gap: 20, fontSize: 26, color: DIM },
          h("span", { fontWeight: 700, color: FG }, "kasian.dev"),
          ...(card.meta ? [h("span", { color: card.accent ?? card.colour }, card.meta)] : []),
        ),
        h("div", { display: "flex", gap: 12 }, ...row.map((src) => tile(src, 64, 36))),
      ),
    ),
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: W, height: H, fonts: await fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

/** A PNG of an SVG file under public/, at a size (favicon fallbacks). */
export async function svgToPng(path: string, size: number, padding = 0): Promise<Buffer> {
  const svg = await readFile(`public${path}`, "utf8");
  const inner = size - padding * 2;
  const wrapped =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="rgb(${BG.join(",")})"/>` +
    `<image x="${padding}" y="${padding}" width="${inner}" height="${inner}" style="image-rendering:pixelated" ` +
    `href="${dataUri(svg)}"/></svg>`;
  return new Resvg(wrapped).render().asPng();
}
