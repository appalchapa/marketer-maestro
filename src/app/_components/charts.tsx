"use client";
import React from "react";

const PALETTE = ["#534ab7", "#0f6e56", "#ba7517", "#185fa5", "#993556", "#7b73d6", "#2f8f6e"];

export function BarChart({ data, unit = "", money = false }: { data: { label: string; value: number }[]; unit?: string; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = (v: number) => (money ? `$${v.toFixed(6)}` : `${v.toLocaleString()}${unit}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ width: 96, color: "#5f5e5a", textAlign: "right", flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, background: "#f1efe8", borderRadius: 5, height: 16, position: "relative" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length], height: "100%", borderRadius: 5, minWidth: 2 }} />
          </div>
          <span style={{ width: 78, color: "#1f1e1c", flexShrink: 0 }}>{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, money = false }: { data: { label: string; value: number }[]; money?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={R} fill="none" stroke="#f1efe8" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const el = <circle key={d.label} cx="65" cy="65" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="16"
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} transform="rotate(-90 65 65)" />;
          acc += frac; return el;
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
            <span style={{ color: "#5f5e5a" }}>{d.label}</span>
            <span style={{ color: "#1f1e1c", fontWeight: 600 }}>{money ? `$${d.value.toFixed(6)}` : d.value.toLocaleString()}</span>
            <span style={{ color: "#8a8980" }}>({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
