import type { APIRoute, GetStaticPaths } from "astro";
import { CATEGORY_LABEL } from "../../lib/categories";
import { type OgCard, ogImage } from "../../lib/og";
import { getProjects, projectAccent, SITE_BACKDROP } from "../../lib/projects";

// Link preview images: /og/index.png for the site, /og/<project>.png for each
// project (see lib/og.ts; BaseLayout points og:image at them).
export const getStaticPaths = (async () => {
  const projects = await getProjects();
  const site: OgCard = {
    title: "Pavlo Kasian",
    text: "Projects and ideas from the other side: the stuff that doesn't make it into a README or a CV.",
    colour: SITE_BACKDROP,
    sprites: projects.map((p) => p.data.sprite),
  };
  return [
    { params: { slug: "index" }, props: { card: site } },
    ...projects.map((p) => ({
      params: { slug: p.id },
      props: {
        card: {
          title: p.data.title,
          text: p.data.tagline,
          meta: `${CATEGORY_LABEL[p.data.category]} · ${p.data.statusLabel ?? p.data.status}`,
          colour: p.data.backdrop ?? projectAccent(p),
          accent: projectAccent(p),
          sprite: p.data.sprite,
        } satisfies OgCard,
      },
    })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogImage(props.card as OgCard)), {
    headers: { "Content-Type": "image/png" },
  });
