"use client";
import { useState, useEffect } from "react";

type Param = { key: string; value: string; purpose: string };
type Row = Param & { _rid: string };
const C = { purple: "#534ab7", t3: "#8a8980", line: "rgba(0,0,0,.12)" };
const inp: React.CSSProperties = { fontSize: 12.5, padding: "4px 7px", borderRadius: 6, border: `1px solid ${C.line}`, width: "100%", boxSizing: "border-box" };
const rid = () => "p_" + Math.random().toString(16).slice(2, 10);

// De-dupe by parameter key (case-insensitive, trimmed), keeping the last occurrence.
// Models sometimes emit the same UTM key more than once; this collapses them.
function dedupe(params: Param[]): Param[] {
  const out: Param[] = [];
  const seen = new Map<string, number>();
  for (const p of params) {
    const k = (p.key || "").trim().toLowerCase();
    if (k && seen.has(k)) { out[seen.get(k)!] = p; continue; } // replace earlier with later
    if (k) seen.set(k, out.length);
    out.push(p);
  }
  return out;
}

export default function AttributionEditor({ initial, onChange }: { initial: Param[]; onChange: (p: Param[]) => void }) {
  const [rows, setRows] = useState<Row[]>(() => dedupe(initial).map((p) => ({ ...p, _rid: rid() })));
  // Re-seed only when the upstream data actually changes (dedupe applied once, on load).
  useEffect(() => { setRows(dedupe(initial).map((p) => ({ ...p, _rid: rid() }))); }, [initial]);
  // Push clean params (without internal id) upward.
  useEffect(() => { onChange(rows.map(({ _rid, ...p }) => p)); }, [rows]);

  const updP = (rid_: string, patch: Partial<Param>) => setRows((prev) => prev.map((x) => (x._rid === rid_ ? { ...x, ...patch } : x)));
  const delP = (rid_: string) => setRows((prev) => prev.filter((x) => x._rid !== rid_));
  const addP = () => setRows((prev) => [...prev, { key: "", value: "", purpose: "", _rid: rid() }]);

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.t3, margin: "0 0 8px" }}>Edit any field; add/delete tracking parameters. Duplicate keys are merged on load.</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Key", "Value", "Purpose", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "4px 6px", fontSize: 10.5, color: C.t3, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p._rid}>
            <td style={{ padding: "3px 6px", width: "26%" }}><input value={p.key} onChange={(e) => updP(p._rid, { key: e.target.value })} style={inp} placeholder="utm_..." /></td>
            <td style={{ padding: "3px 6px", width: "26%" }}><input value={p.value} onChange={(e) => updP(p._rid, { value: e.target.value })} style={inp} /></td>
            <td style={{ padding: "3px 6px" }}><input value={p.purpose} onChange={(e) => updP(p._rid, { purpose: e.target.value })} style={inp} /></td>
            <td style={{ padding: "3px 6px" }}><button onClick={() => delP(p._rid)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button></td>
          </tr>
        ))}</tbody>
      </table>
      <button onClick={addP} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer", marginTop: 8 }}>+ Add parameter</button>
    </div>
  );
}
