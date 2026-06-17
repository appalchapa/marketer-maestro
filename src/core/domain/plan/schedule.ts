import type { Plan, Task } from "./plan.schema";

export interface ScheduledTask extends Task { start: string; end: string; startOffset: number; isParent: boolean; }
const DAY = 86400000;
const iso = (d: number) => new Date(d).toISOString().slice(0, 10);

// Compute start/end honouring finish-to-start deps AND one level of hierarchy:
// a parent task's span rolls up from its children (earliest start .. latest end).
export function computeSchedule(plan: Plan): { projectStart: string; projectEnd: string; tasks: ScheduledTask[] } {
  const base = plan.startDate ? Date.parse(plan.startDate) : Date.now();
  const start0 = isNaN(base) ? Date.now() : base;
  const tasks = plan.tasks;
  const byId = new Map(tasks.filter((t) => t.id).map((t) => [t.id as string, t]));
  const childrenOf = (id: string) => tasks.filter((t) => t.parentId === id);
  const isParent = (id?: string) => !!id && tasks.some((t) => t.parentId === id);

  const memo = new Map<string, { s: number; e: number }>();
  const resolve = (t: Task, seen: Set<string>): { s: number; e: number } => {
    const key = t.id ?? t.name;
    if (memo.has(key)) return memo.get(key)!;
    let r: { s: number; e: number };
    if (t.id && isParent(t.id)) {
      const kids = childrenOf(t.id).map((c) => resolve(c, new Set(seen).add(key)));
      const s = kids.length ? Math.min(...kids.map((k) => k.s)) : start0;
      const e = kids.length ? Math.max(...kids.map((k) => k.e)) : s;
      r = { s, e };
    } else {
      const depEnds = (t.deps || [])
        .filter((d) => byId.has(d) && !seen.has(d))
        .map((d) => resolve(byId.get(d)!, new Set(seen).add(key)).e);
      const s = depEnds.length ? Math.max(...depEnds) : start0;
      r = { s, e: s + Math.max(0, t.durationDays || 0) * DAY };
    }
    memo.set(key, r);
    return r;
  };

  let maxEnd = start0;
  const out: ScheduledTask[] = tasks.map((t) => {
    const { s, e } = resolve(t, new Set());
    maxEnd = Math.max(maxEnd, e);
    return { ...t, start: iso(s), end: iso(e), startOffset: Math.round((s - start0) / DAY), isParent: isParent(t.id) };
  });
  return { projectStart: iso(start0), projectEnd: iso(maxEnd), tasks: out };
}
