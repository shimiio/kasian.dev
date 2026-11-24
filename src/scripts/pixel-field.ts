/**
 * Pixel colour field: the same slow colour blobs as the soft backdrop, but
 * rendered at a very low resolution (one cell = CELL css px), quantised to a
 * few brightness levels and ordered-dithered (Bayer 4×4) between them, like
 * old game graphics. The canvas is upscaled with image-rendering: pixelated.
 *
 * Colour follows --live-accent (the current page's project, or a near-neutral
 * grey), read every frame, so its CSS transition fades the field too.
 * The three blobs use the accent and two neighbouring hues (not unrelated
 * colours, which turned warm accents muddy), and dark pixels get their
 * saturation back, so a dim orange reads as orange, not brown.
 */

// ── Tuning ───────────────────────────────────────────────────────────────
const CELL = 8; // size of one "pixel" in CSS px
const FPS = 12; // low frame rate: cheap, and the motion reads as stepped
const LEVELS = 4; // brightness steps between background and full tint
const STRENGTH = 0.2; // max share of colour over the background (0..1): brightness
const SAT_KEEP = 0.55; // saturation of dark pixels vs the accent's own (0 = muddy, 1 = vivid)
const BG = [12, 12, 14]; // --color-bg

// Blobs: radius (share of the larger screen side), weight, hue shift from the
// accent in degrees, and a slow Lissajous path (periods in seconds).
const BLOBS = [
  { r: 0.42, w: 1.0, hue: 0, px: 140, py: 190, ox: 0.25, oy: 0.2, phase: 0 },
  { r: 0.38, w: 0.8, hue: 16, px: 170, py: 130, ox: 0.8, oy: 0.35, phase: 2 },
  { r: 0.36, w: 0.6, hue: -16, px: 210, py: 160, ox: 0.45, oy: 0.85, phase: 4 },
] as const;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const parseColor = (value: string): number[] => {
  const n = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return n.length >= 3 ? n.slice(0, 3) : [182, 243, 106];
};

// RGB (0–255) ⇄ HSL (h in degrees, s and l in 0–1).
const toHsl = ([r, g, b]: number[]): number[] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return [h, s, l];
};

const toRgb = ([h, s, l]: number[]): number[] => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r, g, b] =
    hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

const canvas = document.querySelector<HTMLCanvasElement>("canvas.pixel-field");
const ctx = canvas?.getContext("2d");

if (canvas && ctx) {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let cols = 0;
  let rows = 0;
  let image: ImageData;

  // Size from the backdrop (100lvh: the viewport with mobile toolbars hidden),
  // so the toolbar sliding in and out while scrolling does not resize it.
  const backdrop = canvas.parentElement ?? root;
  const resize = () => {
    const box = backdrop.getBoundingClientRect();
    const nextCols = Math.ceil(box.width / CELL);
    const nextRows = Math.ceil(box.height / CELL);
    if (nextCols === cols && nextRows === rows) return false;
    cols = nextCols;
    rows = nextRows;
    canvas.width = cols;
    canvas.height = rows;
    canvas.style.width = `${cols * CELL}px`;
    canvas.style.height = `${rows * CELL}px`;
    image = ctx.createImageData(cols, rows);
    return true;
  };

  const liveAccent = () => getComputedStyle(root).getPropertyValue("--live-accent");
  let drawnAccent = "";

  const draw = () => {
    // Wall-clock time: the field keeps its position across reloads too.
    const t = Date.now() / 1000;
    drawnAccent = liveAccent();
    const [h, sat, l] = toHsl(parseColor(drawnAccent));
    const darkSat = Math.min(1, sat * SAT_KEEP);
    const side = Math.max(cols, rows);

    const blobs = BLOBS.map((b) => ({
      x: (b.ox + 0.3 * Math.sin((t / b.px) * 2 * Math.PI + b.phase)) * cols,
      y: (b.oy + 0.25 * Math.cos((t / b.py) * 2 * Math.PI + b.phase)) * rows,
      r2: (b.r * side) ** 2,
      w: b.w,
      color: toRgb([h + b.hue, sat, l]),
    }));

    const data = image.data;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let total = 0;
        let r = 0;
        let g = 0;
        let bl = 0;
        for (const b of blobs) {
          const dx = x - b.x;
          const dy = y - b.y;
          const k = b.w * Math.exp(-(dx * dx + dy * dy) / b.r2);
          total += k;
          r += b.color[0] * k;
          g += b.color[1] * k;
          bl += b.color[2] * k;
        }
        // Quantise intensity to LEVELS steps; the Bayer threshold decides,
        // per cell, whether it rounds up or down: that is the dither.
        const v = Math.min(total, 1) * LEVELS;
        const level = Math.min(LEVELS, Math.floor(v + BAYER[(y & 3) * 4 + (x & 3)]));
        const s = (level / LEVELS) * STRENGTH;
        const i = (y * cols + x) * 4;
        const inv = total > 0 ? 1 / total : 0;
        let px = [
          BG[0] + (r * inv - BG[0]) * s,
          BG[1] + (g * inv - BG[1]) * s,
          BG[2] + (bl * inv - BG[2]) * s,
        ];
        if (level > 0) {
          // Mixing towards near-black drains saturation (orange → brown):
          // put the hue's saturation back, keeping the lightness.
          const [ph, , pl] = toHsl(px);
          px = toRgb([ph, darkSat, pl]);
        }
        data[i] = px[0];
        data[i + 1] = px[1];
        data[i + 2] = px[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  };

  // Motion is drawn at FPS; while the colour is fading, every frame is drawn
  // so the colour change itself stays smooth.
  let last = 0;
  const loop = (now: number) => {
    if (now - last >= 1000 / FPS || liveAccent() !== drawnAccent) {
      last = now;
      draw();
    }
    if (!reduced.matches) requestAnimationFrame(loop);
  };

  resize();
  draw();
  // Only a real size change (rotation, window resize) recreates the canvas.
  addEventListener("resize", () => {
    if (resize()) draw();
  });
  // With reduced motion: one still frame, redrawn only when the colour changes.
  root.addEventListener("transitionend", () => reduced.matches && draw());
  requestAnimationFrame(loop);
}
