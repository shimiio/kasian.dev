// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

/** Links to other sites in MDX stories open in a new tab (as in config.ts). */
function externalLinks() {
  /** @param {any} node A hast node. */
  const walk = (node) => {
    const href = node.properties?.href;
    if (node.tagName === "a" && typeof href === "string" && /^https?:\/\//.test(href) && !href.startsWith("https://kasian.dev")) {
      node.properties.target = "_blank";
      node.properties.rel = ["noopener", "noreferrer"];
    }
    node.children?.forEach(walk);
  };
  return walk;
}

export default defineConfig({
  site: "https://kasian.dev",
  trailingSlash: "ignore",
  integrations: [mdx({ rehypePlugins: [externalLinks] }), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
