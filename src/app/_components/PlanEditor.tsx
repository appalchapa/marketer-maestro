"use client";
import { useState, useEffect } from "react";

type Task = { id: string; name: string; owner: string; durationDays: number; deps: string[]; parentId?: string };
const C = { purple: "#534ab7", amber: "#ba7517", green: "#0f6e56", t2: "#5f5e5a", t3: "#8a8980", line: "rgba(0,0,0,.12)" };
const inp: React.CSSProperties = { fontSize: 12.5, padding: "4px 6px", borderRadius: 6, border: `1px solid ${C.line}` };
const btn: React.CSSProperties = { border: 0, background: "transparent", cursor: "pointer", color: C.t3, fontSize: 12, padding: "0 2px" };
const mkId = () => "task_" + Math.random().toString(16).slice(2, 10);
const DAY = 86400000;

// Keep the array in canonical display order: each top-level task immediately
// followed by its children; enforce one level (a child's parent must be top-level).
function normalize(tasks: Task[]): Task[] {
  const ids = new Set(tasks.map((t) => t.id));
  const parentOf = new Map(tasks.map((t) => [t.id, t.parentId]));
  const fixed = tasks.map((t) => {
    let pid = t.parentId;
    if (pid && !ids.has(pid)) pid = undefined;               // parent missing
    if (pid && parentOf.get(pid)) pid = undefined;           // parent is itself a child -> one level
    return pid === t.parentId ? t : { ...t, parentId: pid };
  });
  const tops = fixed.filter((t) => !t.parentId);
  const out: Task[] = [];
  tops.forEach((tp) => { out.push(tp); fixed.filter((c) => c.parentId === tp.id).forEach((c) => out.push(c)); });
  return out;
}

function schedule(tasks: Task[], startDate: string) {
  const base = Date.parse(startDate) || Date.now();
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const isParent = (id?: string) => !!id && tasks.some((t) => t.parentId === id);
  const childrenOf = (id: string) => tasks.filter((t) => t.parentId === id);
  const memo = new Map<string, { s: number; e: number }>();
  const resolve = (t: Task, seen: Set<string>): { s: number; e: number } => {
    if (memo.has(t.id)) return memo.get(t.id)!;
    let r: { s: number; e: number };
    if (isParent(t.id)) {
      const kids = childrenOf(t.id).map((c) => resolve(c, new Set(seen).add(t.id)));
      const s = kids.length ? Math.min(...kids.map((k) => k.s)) : 0;
      r = { s, e: kids.length ? Math.max(...kids.map((k) => k.e)) : s };
    } else {
      const ends = (t.deps || []).filter((d) => byId.has(d) && !seen.has(d)).map((d) => resolve(byId.get(d)!, new Set(seen).add(t.id)).e);
      const s = ends.length ? Math.max(...ends) : 0;
      r = { s, e: s + Math.max(0, t.durationDays || 0) };
    }
    memo.set(t.id, r); return r;
  };
  let span = 1; const map = new Map<string, { s: number; e: number; sd: string; ed: string }>();
  tasks.forEach((t) => { const { s, e } = resolve(t, new Set()); span = Math.max(span, e); map.set(t.id, { s, e, sd: new Date(base + s * DAY).toISOString().slice(0, 10), ed: new Date(base + e * DAY).toISOString().slice(0, 10) }); });
  return { map, span, isParent };
}

export default function PlanEditor({ initial, onChange }: { initial: any; onChange: (p: any) => void }) {
  const [startDate, setStartDate] = useState<string>(initial?.startDate || new Date().toISOString().slice(0, 10));
  const [tasks, setTasks] = useState<Task[]>(() => normalize((initial?.tasks || []).map((t: any) => ({ ...t, id: t.id || mkId(), deps: t.deps || [] }))));
  useEffect(() => {
    setStartDate(initial?.startDate || new Date().toISOString().slice(0, 10));
    setTasks(normalize((initial?.tasks || []).map((t: any) => ({ ...t, id: t.id || mkId(), deps: t.deps || [] }))));
  }, [initial]);
  useEffect(() => { onChange({ startDate, tasks }); }, [startDate, tasks]);

  const set = (next: Task[]) => setTasks(normalize(next));
  const isParent = (id: string) => tasks.some((t) => t.parentId === id);
  const upd = (id: string, patch: Partial<Task>) => set(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const del = (id: string) => set(tasks.filter((t) => t.id !== id).map((t) => (t.parentId === id ? { ...t, parentId: undefined } : t)));
  const addTop = () => set([...tasks, { id: mkId(), name: "New task", owner: "", durationDays: 1, deps: [] }]);

  // Insert a sibling immediately after this task's group (array is canonical, so index works).
  const insertBelow = (id: string) => {
    const t = tasks.find((x) => x.id === id)!;
    let i = tasks.findIndex((x) => x.id === id);
    if (!t.parentId) { const kids = tasks.filter((x) => x.parentId === id); i += kids.length; } // skip its children
    const c = [...tasks]; c.splice(i + 1, 0, { id: mkId(), name: "New task", owner: "", durationDays: 1, deps: [], parentId: t.parentId });
    set(c);
  };
  // Explicit: add a sub-task under a top-level task.
  const addSubTask = (parentId: string) => set([...tasks, { id: mkId(), name: "New sub-task", owner: "", durationDays: 1, deps: [], parentId }]);
  const promote = (id: string) => upd(id, { parentId: undefined });
  const moveWithinSiblings = (id: string, dir: -1 | 1) => {
    const t = tasks.find((x) => x.id === id)!; const sibs = tasks.filter((x) => x.parentId === t.parentId);
    const si = sibs.findIndex((x) => x.id === id); const tj = si + dir; if (tj < 0 || tj >= sibs.length) return;
    const other = sibs[tj]; const c = [...tasks]; const ai = c.indexOf(t); const bi = c.indexOf(other); [c[ai], c[bi]] = [c[bi], c[ai]]; set(c);
  };

  const { map, span } = schedule(tasks, startDate);
  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.t3 }}>Project start</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inp} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760 }}>
          <thead><tr>{["Task", "Owner / role", "Days", "Depends on", "Start", "End", "Actions"].map((h) => <th key={h} style={{ textAlign: "left", padding: "5px 6px", fontSize: 10.5, color: C.t3, textTransform: "uppercase", borderBottom: `1px solid ${C.line}` }}>{h}</th>)}</tr></thead>
          <tbody>{tasks.map((t) => {
            const sc = map.get(t.id); const parent = isParent(t.id); const child = !!t.parentId;
            return (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.line}`, background: parent ? "#f7f6ff" : undefined }}>
                <td style={{ padding: "4px 6px" }}>
                  {child && <span style={{ paddingLeft: 18, color: C.t2 }}>↳ </span>}
                  <input value={t.name} onChange={(e) => upd(t.id, { name: e.target.value })} style={{ ...inp, width: child ? 168 : 186, fontWeight: parent ? 600 : 400 }} />
                </td>
                <td style={{ padding: "4px 6px" }}><input value={t.owner} onChange={(e) => upd(t.id, { owner: e.target.value })} style={{ ...inp, width: 100 }} /></td>
                <td style={{ padding: "4px 6px" }}>{parent ? <span style={{ color: C.t3 }} title="rolled up from sub-tasks">{sc ? sc.e - sc.s : 0}d <span style={{ fontSize: 10 }}>(auto)</span></span> : <input type="number" min={0} value={t.durationDays} onChange={(e) => upd(t.id, { durationDays: Number(e.target.value) })} style={{ ...inp, width: 46 }} />}</td>
                <td style={{ padding: "4px 6px", maxWidth: 150 }}>
                  <details><summary style={{ cursor: "pointer", color: C.purple, fontSize: 12 }}>{t.deps.length ? `${t.deps.length} dep(s)` : "none"}</summary>
                    <div style={{ marginTop: 4 }}>{tasks.filter((o) => o.id !== t.id && o.parentId !== t.id).map((o) => (
                      <label key={o.id} style={{ display: "block", fontSize: 11.5, color: C.t2 }}>
                        <input type="checkbox" checked={t.deps.includes(o.id)} onChange={() => upd(t.id, { deps: t.deps.includes(o.id) ? t.deps.filter((d) => d !== o.id) : [...t.deps, o.id] })} /> {o.name}
                      </label>))}</div>
                  </details>
                </td>
                <td style={{ padding: "4px 6px", color: C.t2 }}>{sc?.sd}</td>
                <td style={{ padding: "4px 6px", color: C.t2 }}>{sc?.ed}</td>
                <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                  <button style={btn} title="move up" onClick={() => moveWithinSiblings(t.id, -1)}>▲</button>
                  <button style={btn} title="move down" onClick={() => moveWithinSiblings(t.id, 1)}>▼</button>
                  {!child && <button style={{ ...btn, color: C.purple }} title="add sub-task under this task" onClick={() => addSubTask(t.id)}>+sub</button>}
                  {child && <button style={btn} title="promote to top-level" onClick={() => promote(t.id)}>⤴</button>}
                  <button style={btn} title="insert task below" onClick={() => insertBelow(t.id)}>＋</button>
                  <button style={{ ...btn, color: "#a32d2d" }} title="delete" onClick={() => del(t.id)}>×</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <button onClick={addTop} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer", marginTop: 10 }}>+ Add task</button>

      <div style={{ marginTop: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>Timeline (Gantt)</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {tasks.map((t) => { const sc = map.get(t.id)!; const parent = isParent(t.id); const child = !!t.parentId; return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ width: 160, color: C.t2, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0, paddingLeft: child ? 10 : 0, fontWeight: parent ? 600 : 400 }}>{child ? "↳ " : ""}{t.name}</span>
              <div style={{ flex: 1, position: "relative", height: 16, background: "#f6f5f0", borderRadius: 4 }}>
                <div style={{ position: "absolute", left: `${(sc.s / span) * 100}%`, width: `${Math.max(2, ((sc.e - sc.s) / span) * 100)}%`, top: 2, bottom: 2, background: parent ? "#2f2a6b" : child ? C.amber : C.purple, borderRadius: 4, opacity: parent ? 0.55 : 1 }} />
              </div>
              <span style={{ width: 56, color: C.t3, flexShrink: 0 }}>{parent ? `${sc.e - sc.s}d` : `${t.durationDays}d`}</span>
            </div>); })}
        </div>
        <p style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>“+sub” adds a sub-task under a top-level task; “⤴” promotes a sub-task back. Parent phases (shaded) roll up from their sub-tasks.</p>
      </div>
    </div>
  );
}
