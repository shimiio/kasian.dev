import type { APIRoute } from "astro";
import { svgToPng } from "../lib/og";

// PNG copy of public/favicon.svg for iOS home screens (they ignore SVG icons).
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await svgToPng("/favicon.svg", 180, 20)), {
    headers: { "Content-Type": "image/png" },
  });
