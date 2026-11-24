// Projects are grouped by *why* they exist, not by technology.
export const CATEGORIES = ["tool", "study", "experiment", "fun"] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  tool: "tool", // built because I needed it myself
  study: "study", // built to understand something
  experiment: "experiment", // "what if…"
  fun: "for fun", // just for the laughs
};
