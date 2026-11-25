// Where a project is now. A short, closed list: each status has its own mark
// (StatusMark.astro), so the animation says something. The project's own
// wording ("daily driver", "one-off") goes in statusLabel.
export const STATUSES = ["building", "live", "in use", "paused", "archived"] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_MARK: Record<Status, "spinner" | "blink" | "dot" | "none"> = {
  building: "spinner", // actively working on it: a process running
  live: "blink", // deployed somewhere and running: an "online" light
  "in use": "dot", // finished, and I use it: a steady light
  paused: "none", // left for now
  archived: "none", // done with it
};
