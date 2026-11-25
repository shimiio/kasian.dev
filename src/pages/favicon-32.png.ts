import type { APIRoute } from "astro";
import { svgToPng } from "../lib/og";

// PNG copy of public/favicon.svg for browsers without SVG favicons.
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await svgToPng("/favicon.svg", 32)), {
    headers: { "Content-Type": "image/png" },
  });
