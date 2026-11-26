export const SITE = {
  name: "Pavlo Kasian",
  domain: "kasian.dev",
  location: "Vienna",
  description:
    "A look at my projects from another angle: the stuff that doesn't make it into a README or a CV.",
};

// Contact links. email may be a bare address (it becomes mailto:). An empty
// one is not shown anywhere.
export const LINKS = {
  github: "https://github.com/shimiio",
  linkedin: "https://www.linkedin.com/in/pavlo-kasian-504691419/",
  email: "pavlo1191@gmail.com",
  // The Google Doc exported as PDF on every click: always the current version.
  cv: "https://docs.google.com/document/d/1PvQPcn-njsn4swZzLuTikhpOKQhD23TVF9KaJVi2ksU/export?format=pdf",
};

/** Links to other sites open in a new tab (the site stays open behind). */
export const external = (href: string) =>
  /^https?:\/\//.test(href) && !href.startsWith(`https://${SITE.domain}`)
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
