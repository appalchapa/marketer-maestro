"use client";
import React from "react";

// Aggregates the captured efficacy signal (thumbs + edited + revisions) against
// tokens/cost, per component, across a user's sessions. Real data from ratings/events.
export default function EfficacyPanel({ history }: { history: any[] }) {
  const agg: Record<string, { n: number; edited: number; scoreSum: number; scoreCount: number; rev: number; tokens: number; cost: number }> = {};
  for (const s of history) {
    for (const [k, r] of Object.entries((s.ratings || {}) as Record<string, any>)) {
      agg[k] ??= { n: 0, edited: 0, scoreSum: 0, scoreCount: 0, rev: 0, tokens: 0, cost: 0 };
      agg[k].n++; if (r.edited) agg[k].edited++; if (typeof r.score === "number") { agg[k].scoreSum += r.score; agg[k].scoreCount++; } agg[k].rev += r.revisions || 0;
    }
    for (const e of (s.events || [])) {
      const k = e.component; if (!k) continue;
      agg[k] ??= { n: 0, edited: 0, scoreSum: 0, scoreCount: 0, rev: 0, tokens: 0, cost: 0 };
      agg[k].tokens += e.tokens ?? ((e.tokensIn || 0) + (e.tokensOut || 0)); agg[k].cost += e.costUsd || 0;
    }
  }
  const rows = Object.entries(agg);
  if (!rows.length) return null;
  const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", borderBottom: "1px solid rgba(0,0,0,.1)", fontSize: 10.5, color: "#8a8980", textTransform: "uppercase" };
  const td: React.CSSProperties = { padding: "5px 8px" };
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#8a8980", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>Agent efficacy vs cost</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead><tr>{["Component", "Approved", "Edited %", "Avg rating", "Avg revisions", "Tokens", "Cost"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(([k, a]) => (
          <tr key={k}>
            <td style={{ ...td, fontWeight: 600 }}>{k}</td>
            <td style={td}>{a.n}</td>
            <td style={td}>{a.n ? Math.round((a.edited / a.n) * 100) : 0}%</td>
            <td style={td}>{a.scoreCount ? `${(a.scoreSum / a.scoreCount).toFixed(1)}/5` : "—"}</td>
            <td style={td}>{a.n ? (a.rev / a.n).toFixed(1) : "0"}</td>
            <td style={td}>{a.tokens.toLocaleString()}</td>
            <td style={td}>${a.cost.toFixed(6)}</td>
          </tr>
        ))}</tbody>
      </table>
      <p style={{ fontSize: 11.5, color: "#8a8980", margin: "8px 0 0" }}>Lower “edited %” and fewer revisions mean the agent's drafts needed less correction — read alongside tokens/cost to spot expensive-yet-weak components.</p>
    </div>
  );
}
