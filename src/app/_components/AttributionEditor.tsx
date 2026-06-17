"use client";
import { useState, useEffect } from "react";

type Param = { key: string; value: string; purpose: string };
const C = { purple: "#534ab7", t3: "#8a8980", line: "rgba(0,0,0,.12)" };
const inp: React.CSSProperties = { fontSize: 12.5, padding: "4px 7px", borderRadius: 6, border: `1px solid ${C.line}`, width: "100%", boxSizing: "border-box" };

export default function AttributionEditor({ initial, onChange }: { initial: Param[]; onChange: (p: Param[]) => void }) {
  const [params, setParams] = useState<Param[]>(initial);
  useEffect(() => { setParams(initial); }, [initial]);
  useEffect(() => { onChange(params); }, [params]);
  const updP = (i: number, p: Param) => setParams((prev) => prev.map((x, j) => (j === i ? p : x)));
  const delP = (i: number) => setParams((prev) => prev.filter((_, j) => j !== i));
  const addP = () => setParams((prev) => [...prev, { key: "utm_", value: "", purpose: "" }]);
  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.t3, margin: "0 0 8px" }}>Edit any field; add/delete tracking parameters.</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Key", "Value", "Purpose", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "4px 6px", fontSize: 10.5, color: C.t3, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
        <tbody>{params.map((p, i) => (
          <tr key={i}>
            <td style={{ padding: "3px 6px", width: "26%" }}><input value={p.key} onChange={(e) => updP(i, { ...p, key: e.target.value })} style={inp} /></td>
            <td style={{ padding: "3px 6px", width: "26%" }}><input value={p.value} onChange={(e) => updP(i, { ...p, value: e.target.value })} style={inp} /></td>
            <td style={{ padding: "3px 6px" }}><input value={p.purpose} onChange={(e) => updP(i, { ...p, purpose: e.target.value })} style={inp} /></td>
            <td style={{ padding: "3px 6px" }}><button onClick={() => delP(i)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button></td>
          </tr>
        ))}</tbody>
      </table>
      <button onClick={addP} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer", marginTop: 8 }}>+ Add parameter</button>
    </div>
  );
}
