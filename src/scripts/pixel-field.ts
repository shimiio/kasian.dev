/**
 * Pixel colour field: a few slow colour blobs rendered at a very low
 * resolution (one cell = CELL css px), quantised to a few brightness levels
 * and ordered-dithered (Bayer 4×4) between them, like old game graphics. The
 * canvas is upscaled with image-rendering: pixelated.
 *
 * Colours come from <html data-backdrop>: one colour (a project page: the
 * blobs use it and two neighbouring hues) or a list (home: one project colour
 * per blob). Colours are never averaged where blobs meet, which turned mixes
 * muddy: each cell takes one blob's colour, and the edges between blobs are
 * dithered, as with a small fixed palette. On a page change each blob fades
 * to its new colour.
 */

// ── Tuning ───────────────────────────────────────────────────────────────
const CELL = 8; // size of one "pixel" in CSS px
const FPS = 12; // low frame rate: cheap, and the motion reads as stepped
const LEVELS = 4; // brightness steps between background and full tint
const STRENGTH = 0.2; // max share of colour over the background (0..1): brightness
const SAT_KEEP = 0.55; // saturation of dark pixels vs the colour's own (0 = muddy, 1 = vivid)
const SOFT = 1.6; // soft cap on overlapping blobs: higher = brighter, flatter peaks
const TALL = 0.6; // on tall screens, blob size follows height × TALL instead of width
const FADE_MS = 1200; // colour change on entering / leaving a project
// With several colours (home), smaller and dimmer blobs: separate glows with
// dark between them, not a carpet of colour.
const MIX_SIZE = 0.7; // blob size vs a single-colour page
const MIX_STRENGTH = 0.16; // like STRENGTH, for several colours
const MIX_WEIGHT = 0.85; // even blob weight with several colours
// More colours than blobs: the colours take turns. Every CYCLE_S seconds each
// blob moves on to the next colour, fading over the last SWAP share of it.
const CYCLE_S = 20;
const SWAP = 0.25;
const BG = [12, 12, 14]; // --color-bg

// Blobs: radius (share of the larger screen side), weight, hue shift (used
// when the page has a single colour), and a slow Lissajous path (periods in
// seconds). Always this many, however many projects: the density stays put.
const BLOBS = [
  { r: 0.42, w: 1.0, hue: 0, px: 140, py: 190, ox: 0.25, oy: 0.2, phase: 0 },
  { r: 0.38, w: 0.8, hue: 8, px: 170, py: 130, ox: 0.8, oy: 0.35, phase: 2 },
  { r: 0.36, w: 0.6, hue: -8, px: 210, py: 160, ox: 0.45, oy: 0.85, phase: 4 },
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

/** data-backdrop at time t (s) → a colour and weight per blob, plus blob size
 *  and brightness. */
const targetState = (backdrop: string, t: number): State => {
  const list = backdrop.split(/\s+/).filter(Boolean).map(parseColor);
  if (list.length === 0) list.push(parseColor(""));
  const n = list.length;
  if (n === 1) {
    const [h, s, l] = toHsl(list[0]);
    return {
      colours: BLOBS.map((b) => toRgb([h + b.hue, s, l])),
      weights: BLOBS.map((b) => b.w),
      size: 1,
      strength: STRENGTH,
    };
  }
  // Up to one colour per blob: fixed. More: all blobs step to the next colour
  // together (so two blobs never share one), each CYCLE_S, with a slow fade.
  const phase = n > BLOBS.length ? t / CYCLE_S : 0;
  const step = Math.floor(phase);
  const swap = ease(Math.max(0, (phase - step - (1 - SWAP)) / SWAP));
  return {
    colours: BLOBS.map((_, i) => lerp(list[(i + step) % n], list[(i + step + 1) % n], swap)),
    weights: BLOBS.map(() => MIX_WEIGHT),
    size: MIX_SIZE,
    strength: MIX_STRENGTH,
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

  // Page change: colours, blob size and brightness fade from the state at that
  // moment to this page's (itself moving, if colours take turns) over FADE_MS.
  // Wall-clock time: the field keeps its position across reloads too.
  const clock = () => Date.now() / 1000;
  let key = root.dataset.backdrop ?? "";
  let from = targetState(key, clock());
  let fadeStart = -Infinity;
  const fadeT = (now: number) => Math.min(1, (now - fadeStart) / FADE_MS);
  const current = (now: number, t: number): State => {
    const to = targetState(key, t);
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
    from = current(now, clock());
    key = next;
    fadeStart = reduced.matches ? -Infinity : now;
  };

  const draw = (now: number) => {
    const t = clock();
    const state = current(now, t);
    const side = Math.max(cols, rows * TALL) * state.size; // see TALL
    const blobs = BLOBS.map((b, i) => ({
      x: (b.ox + 0.3 * Math.sin((t / b.px) * 2 * Math.PI + b.phase)) * cols,
      y: (b.oy + 0.25 * Math.cos((t / b.py) * 2 * Math.PI + b.phase)) * rows,
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

  // Motion is drawn at FPS; while colours fade, every frame is drawn so the
  // fade itself stays smooth.
  let last = 0;
  const loop = (now: number) => {
    retarget(now);
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
