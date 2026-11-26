/**
 * The projects as a year: which months each one ran, and side lanes for one
 * that started while another was still going (esp32 during pare, bob during
 * kel), like a branch in `git log --graph`. Drawn on home by YearGraph.
 */
import type { Project } from "./projects";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "2026-05" → a running month number. */
export const monthIndex = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return y * 12 + mm - 1;
};
export const monthName = (i: number) => MONTHS[i % 12];
export const monthYear = (i: number) => Math.floor(i / 12);

export interface Span {
  project: Project;
  start: number;
  /** The last month; a project without `finished` runs to the latest month. */
  end: number;
  /** 0 = the main line; 1+ = started while one on a lower lane was going. */
  lane: number;
}

export function spans(projects: Project[]) {
  const last = Math.max(...projects.map((p) => monthIndex(p.data.finished ?? p.data.started)));
  const list = projects
    .map((p) => ({
      project: p,
      start: monthIndex(p.data.started),
      end: p.data.finished ? monthIndex(p.data.finished) : last,
      lane: 0,
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  // Lowest lane that is free from the start month on.
  const busyUntil: number[] = [];
  for (const s of list) {
    let lane = 0;
    while (busyUntil[lane] !== undefined && busyUntil[lane] >= s.start) lane++;
    s.lane = lane;
    busyUntil[lane] = s.end;
  }
  const first = Math.min(...list.map((s) => s.start));
  return { spans: list, first, last, lanes: busyUntil.length };
}

export interface GraphRow {
  /** Month, or a run of quiet months (gap). */
  from: number;
  to: number;
  gap: boolean;
  /** What each lane does in this row. */
  lanes: { span?: Span; up: boolean; down: boolean; node: "end" | "start" | null }[];
  /** Projects that end here (their entry) and start here (a small mark). */
  ends: Span[];
  starts: Span[];
}

/** Rows newest first; months where nothing ran fold into one quiet row. */
export function graphRows(projects: Project[]): { rows: GraphRow[]; lanes: number } {
  const { spans: list, first, last, lanes } = spans(projects);
  const rows: GraphRow[] = [];
  for (let m = last; m >= first; m--) {
    const active = list.filter((s) => s.start <= m && m <= s.end);
    if (active.length === 0) {
      const prev = rows.at(-1);
      if (prev?.gap) prev.from = m;
      else rows.push({ from: m, to: m, gap: true, lanes: [], ends: [], starts: [] });
      continue;
    }
    rows.push({
      from: m,
      to: m,
      gap: false,
      lanes: Array.from({ length: lanes }, (_, i) => {
        const span = active.find((s) => s.lane === i);
        if (!span) return { up: false, down: false, node: null };
        return {
          span,
          up: m < span.end,
          down: m > span.start,
          node: m === span.end ? "end" : m === span.start ? "start" : null,
        };
      }),
      ends: active.filter((s) => s.end === m),
      starts: active.filter((s) => s.start === m && s.end !== m),
    });
  }
  return { rows, lanes };
}
