/**
 * Pixel colour field: one slow colour glow rendered at a very low
 * resolution (one cell = CELL css px), quantised to a few brightness levels
 * and ordered-dithered (Bayer 4×4) between them, like old game graphics. The
 * canvas is upscaled with image-rendering: pixelated.
 *
 * The colour comes from <html data-backdrop>: a project's colour on its page,
 * a cool grey elsewhere. On a page change the glow fades to the new colour.
 */

// ── Tuning ───────────────────────────────────────────────────────────────
const CELL = 8; // size of one "pixel" in CSS px
const FPS = 12; // low frame rate: cheap, and the motion reads as stepped
const LEVELS = 4; // brightness steps between background and full tint
const STRENGTH = 0.28; // max share of colour over the background (0..1): brightness (was 0.2)
const GREY_STRENGTH = 0.42; // the same for a greyish colour (home); was 0.3
const SIZE = 1.25; // glow size
const SAT_KEEP = 0.55; // saturation of dark pixels vs the colour's own (0 = muddy, 1 = vivid)
const SOFT = 1.6; // soft cap on overlapping blobs: higher = brighter, flatter peaks
const TALL = 0.6; // on tall screens, blob size follows height × TALL instead of width
const FADE_MS = 1200; // colour change on entering / leaving a project
const BG = [12, 12, 14]; // --color-bg

// The glow: radius (share of the larger screen side), weight, and a slow
// Lissajous path: centre (ox, oy) and swing (ax, ay) as shares of the screen,
// periods in seconds. It crosses the whole width, left edge to right edge,
// and the top two thirds. Kept as a list: the drawing below handles several
// blobs with dithered edges between them.
const BLOBS = [
  { r: 0.42, w: 1.0, px: 140, py: 190, ox: 0.5, oy: 0.35, ax: 0.36, ay: 0.25, phase: 0 },
] as const;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const parseColor = (value: string): number[] => {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const n = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return n.length >= 3 ? n.slice(0, 3) : [154, 161, 171];
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

const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

type State = { colours: number[][]; weights: number[]; size: number; strength: number };

/** data-backdrop → the glow's colour, weight, size and brightness. */
const targetState = (backdrop: string): State => {
  const colour = parseColor(backdrop.split(/\s+/)[0] ?? "");
  // A greyish colour (home) needs more brightness to look alive.
  const grey = toHsl(colour)[1] < 0.5;
  return {
    colours: [colour],
    weights: BLOBS.map((b) => b.w),
    size: SIZE,
    strength: grey ? GREY_STRENGTH : STRENGTH,
  };
};

/** A blob colour → its pixel colour at each brightness level (0 = background).
 *  Mixing towards near-black drains saturation (orange → brown), so each level
 *  gets the colour's saturation back, keeping its lightness. */
const levelPalette = (colour: number[], strength: number): number[][] => {
  const sat = Math.min(1, toHsl(colour)[1] * SAT_KEEP);
  return Array.from({ length: LEVELS + 1 }, (_, level) => {
    if (level === 0) return BG;
    const s = (level / LEVELS) * strength;
    const [h, , l] = toHsl(lerp(BG, colour, s));
    return toRgb([h, sat, l]);
  });
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

  // Page change: colour and brightness fade from the state at that moment to
  // this page's over FADE_MS.
  // Wall-clock time: the field keeps its position across reloads too.
  const clock = () => Date.now() / 1000;
  let key = root.dataset.backdrop ?? "";
  let from = targetState(key);
  let fadeStart = -Infinity;
  const fadeT = (now: number) => Math.min(1, (now - fadeStart) / FADE_MS);
  const current = (now: number): State => {
    const to = targetState(key);
    const f = ease(fadeT(now));
    if (f === 1) return to;
    return {
      colours: from.colours.map((c, i) => lerp(c, to.colours[i], f)),
      weights: lerp(from.weights, to.weights, f),
      size: from.size + (to.size - from.size) * f,
      strength: from.strength + (to.strength - from.strength) * f,
    };
  };
  const retarget = (now: number) => {
    const next = root.dataset.backdrop ?? "";
    if (next === key) return;
    from = current(now);
    key = next;
    fadeStart = reduced.matches ? -Infinity : now;
  };

  const draw = (now: number) => {
    const t = clock();
    const state = current(now);
    const side = Math.max(cols, rows * TALL) * state.size; // see TALL
    const blobs = BLOBS.map((b, i) => ({
      x: (b.ox + b.ax * Math.sin((t / b.px) * 2 * Math.PI + b.phase)) * cols,
      y: (b.oy + b.ay * Math.cos((t / b.py) * 2 * Math.PI + b.phase)) * rows,
      r2: (b.r * side) ** 2,
      w: state.weights[i],
    }));
    const palettes = state.colours.map((c) => levelPalette(c, state.strength));
    const k = new Float64Array(blobs.length);

    const data = image.data;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let total = 0;
        for (let j = 0; j < blobs.length; j++) {
          const b = blobs[j];
          const dx = x - b.x;
          const dy = y - b.y;
          k[j] = b.w * Math.exp(-(dx * dx + dy * dy) / b.r2);
          total += k[j];
        }
        // Brightness: soft-capped (overlaps approach full strength without
        // flattening into a solid patch), quantised to LEVELS steps; the Bayer
        // threshold decides per cell whether it rounds up or down.
        const v = (1 - Math.exp(-SOFT * total)) * LEVELS;
        const level = Math.min(LEVELS, Math.floor(v + BAYER[(y & 3) * 4 + (x & 3)]));
        // Colour: one blob, picked by its share of this cell against a second
        // (transposed) Bayer threshold, so blob edges are dithered, not mixed.
        let pick = 0;
        if (level > 0) {
          const u = BAYER[(x & 3) * 4 + (y & 3)] * total;
          let acc = 0;
          for (let j = 0; j < blobs.length; j++) {
            acc += k[j];
            pick = j;
            if (u < acc) break;
          }
        }
        const px = palettes[pick][level];
        const i = (y * cols + x) * 4;
        data[i] = px[0];
        data[i + 1] = px[1];
        data[i + 2] = px[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  };

  // Pinch zoom (touchpad or phone): the glass column blurs whatever is under
  // it, so a moving field makes the browser redo that blur for the whole,
  // now magnified, column on every frame, and zooming stutters. While the
  // page is zoomed in, and for a moment after any zoom step, the field holds
  // still, and html[data-zoomed] swaps the blur for a darker plain glass
  // (global.css).
  const vv = window.visualViewport;
  let zoomUntil = 0;
  let scale = vv?.scale ?? 1;
  vv?.addEventListener("resize", () => {
    if (Math.abs(vv.scale - scale) < 0.001) return; // toolbars, not a zoom
    scale = vv.scale;
    zoomUntil = performance.now() + 400;
  });
  const zoomed = (now: number) => scale > 1.01 || now < zoomUntil;

  // Motion is drawn at FPS; while colours fade, every frame is drawn so the
  // fade itself stays smooth.
  let last = 0;
  const loop = (now: number) => {
    retarget(now);
    const z = zoomed(now);
    if (z !== "zoomed" in root.dataset) root.toggleAttribute("data-zoomed", z);
    if (z) {
      if (!reduced.matches) requestAnimationFrame(loop);
      return;
    }
    if (now - last >= 1000 / FPS || fadeT(now) < 1) {
      last = now;
      draw(now);
    }
    if (!reduced.matches) requestAnimationFrame(loop);
  };

  resize();
  draw(performance.now());
  // Only a real size change (rotation, window resize) recreates the canvas.
  addEventListener("resize", () => {
    if (resize()) draw(performance.now());
  });
  // With reduced motion: one still frame, redrawn (without a fade) on a page change.
  document.addEventListener("astro:after-swap", () => {
    if (!reduced.matches) return;
    retarget(performance.now());
    draw(performance.now());
  });
  requestAnimationFrame(loop);
}
