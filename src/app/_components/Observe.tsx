"use client";
import { useState, useEffect } from "react";
import { BarChart, Donut } from "./charts";
import { STAGES } from "@core/orchestration/stages";

const C = { surface: "#fff", line: "rgba(0,0,0,.1)", t2: "#5f5e5a", t3: "#8a8980", purple: "#534ab7", green: "#0f6e56", red: "#a32d2d", amber: "#ba7517" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" };
const input: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: `1px solid rgba(0,0,0,.18)`, fontSize: 14 };

const TABS = ["Monitoring", "Agents & Components", "Cost & Economics", "Traces", "Settings"] as const;
type Tab = (typeof TABS)[number];

const evTokens = (e: any) => e.tokens ?? ((e.tokensIn || 0) + (e.tokensOut || 0));
const sessCost = (s: any) => (s.events || []).reduce((a: number, e: any) => a + (e.costUsd || 0), 0);

export default function Observe({ username, setUsername }: { username: string; setUsername: (u: string) => void }) {
  const [tab, setTab] = useState<Tab>("Monitoring");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [u, setU] = useState(username);
  const [scope, setScope] = useState<"user" | "all">("user");

  async function loadUser(name: string) {
    if (!name) return;
    const r = await fetch(`/api/session/list?username=${encodeURIComponent(name)}`);
    setSessions((await r.json()).sessions || []); setLoaded(true);
  }
  async function loadAll() {
    const r = await fetch(`/api/session/list?all=true`);
    setSessions((await r.json()).sessions || []); setLoaded(true);
  }
  function reload(sc: "user" | "all", name: string) { sc === "all" ? loadAll() : loadUser(name); }
  useEffect(() => { if (username) { setU(username); reload(scope, username); } }, [username]);

  return (
    <div>
      <div style={{ ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={label}>Scope</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["user", "all"] as const).map((sc) => (
            <button key={sc} onClick={() => { setScope(sc); reload(sc, u); }} style={{ padding: "6px 12px", borderRadius: 16, fontSize: 12.5, cursor: "pointer",
              border: `1px solid ${scope === sc ? C.purple : "rgba(0,0,0,.15)"}`, background: scope === sc ? "#eeedfe" : "#fff", color: scope === sc ? C.purple : C.t2, fontWeight: scope === sc ? 600 : 400 }}>
              {sc === "user" ? "This user" : "All users (global)"}</button>
          ))}
        </div>
        {scope === "user" && <>
          <input style={input} value={u} onChange={(e) => setU(e.target.value)} placeholder="username" />
          <button onClick={() => { setUsername(u); loadUser(u); }} style={{ ...input, background: C.purple, color: "#fff", border: 0, fontWeight: 600, cursor: "pointer" }}>Load</button>
        </>}
        {loaded && <span style={{ fontSize: 12.5, color: C.t3 }}>{sessions.length} session(s){scope === "all" ? " across all users" : ""}</span>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 13px", borderRadius: 18, fontSize: 13, cursor: "pointer",
            border: `1px solid ${tab === t ? C.purple : "rgba(0,0,0,.15)"}`, background: tab === t ? "#eeedfe" : "#fff", color: tab === t ? C.purple : C.t2, fontWeight: tab === t ? 600 : 400 }}>{t}</button>
        ))}
      </div>

      {!loaded && <div style={card}><p style={{ color: C.t3, margin: 0 }}>Pick a scope to load data. “All users” shows global aggregates.</p></div>}
      {loaded && sessions.length === 0 && <div style={card}><p style={{ color: C.t3, margin: 0 }}>No sessions yet for “{username}”. Run one in Operate first.</p></div>}
      {loaded && sessions.length > 0 && (
        <>
          {tab === "Monitoring" && <Monitoring sessions={sessions} scope={scope} />}
          {tab === "Agents & Components" && <Components sessions={sessions} />}
          {tab === "Cost & Economics" && <Cost sessions={sessions} />}
          {tab === "Traces" && <Traces sessions={sessions} />}
        </>
      )}
      {tab === "Settings" && <Settings />}
    </div>
  );
}

function ratingsSummary(s: any) {
  const r = Object.values((s.ratings || {}) as Record<string, any>);
  const scored = r.filter((x) => typeof x.score === "number");
  const avgScore = scored.length ? scored.reduce((a, x) => a + x.score, 0) / scored.length : null;
  return {
    avgScore,                                    // null if no numeric ratings yet
    rated: scored.length,
    edited: r.filter((x) => x.edited).length,
    revisions: r.reduce((a, x) => a + (x.revisions || 0), 0),
  };
}

// Autonomous score (0-100): how independently the agent succeeded, from data we already capture.
// Blends acceptance (not edited), low revisions, and human rating. No AI self-grading.
function autonomyScore(a: { n: number; edited: number; rev: number; scoreSum: number; scoreCount: number }): number | null {
  if (!a.n) return null;
  const acceptance = 1 - a.edited / a.n;                 // unedited drafts -> higher
  const revisionPenalty = Math.min(1, a.rev / a.n / 3);  // ~3 revisions avg = full penalty
  const revisionScore = 1 - revisionPenalty;
  const ratingScore = a.scoreCount ? (a.scoreSum / a.scoreCount - 1) / 4 : 0.6; // 1-5 -> 0-1; neutral 0.6 if unrated
  // weighted: acceptance 45%, revisions 25%, rating 30%
  const blend = acceptance * 0.45 + revisionScore * 0.25 + ratingScore * 0.30;
  return Math.round(blend * 100);
}

function Monitoring({ sessions, scope }: { sessions: any[]; scope: "user" | "all" }) {
  const [open, setOpen] = useState<string | null>(null);
  const costData = sessions.slice(0, 8).map((s) => ({ label: (s.goalText || "session").slice(0, 12), value: sessCost(s) }));
  return (
    <div>
      <div style={card}>
        <p style={label}>Cost per session</p>
        <BarChart data={costData} money />
      </div>
      {sessions.map((s) => {
        const rs = ratingsSummary(s);
        return (
          <div key={s.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.goalText}{scope === "all" && <span style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}> · @{s.username}</span>}</div>
                <div style={{ fontSize: 12.5, color: C.t3 }}>{s.vertical} · {s.done ? "complete" : `stage ${s.stageIndex + 1}/${STAGES.length}`} · {new Date(s.updatedAt).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 12.5, color: C.t2, textAlign: "right" }}>
                <div>${sessCost(s).toFixed(6)} · {(s.events || []).length} calls</div>
                <div>{rs.avgScore != null ? `★ ${rs.avgScore.toFixed(1)}/5 (${rs.rated} rated)` : "no ratings"} · ✏️ {rs.edited} edited · {rs.revisions} revisions</div>
              </div>
            </div>
            <button onClick={() => setOpen(open === s.id ? null : s.id)} style={{ marginTop: 8, fontSize: 12, border: 0, background: "transparent", color: C.purple, cursor: "pointer", padding: 0 }}>
              {open === s.id ? "▾ hide audit trail" : "▸ show audit trail"}
            </button>
            {open === s.id && (
              <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                {(s.audit || []).map((a: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: C.t2, padding: "2px 0" }}>
                    <span style={{ color: C.t3 }}>{new Date(a.at).toLocaleTimeString()}</span> · <b>{a.action}</b>{a.detail ? ` — ${a.detail}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function aggregate(sessions: any[]) {
  const agg: Record<string, { n: number; edited: number; scoreSum: number; scoreCount: number; rev: number; tokens: number; cost: number; latency: number; calls: number }> = {};
  for (const s of sessions) {
    for (const [k, r] of Object.entries((s.ratings || {}) as Record<string, any>)) {
      agg[k] ??= { n: 0, edited: 0, scoreSum: 0, scoreCount: 0, rev: 0, tokens: 0, cost: 0, latency: 0, calls: 0 };
      agg[k].n++; if (r.edited) agg[k].edited++;
      if (typeof r.score === "number") { agg[k].scoreSum += r.score; agg[k].scoreCount++; }
      agg[k].rev += r.revisions || 0;
    }
    for (const e of (s.events || [])) {
      const k = e.component; if (!k) continue;
      agg[k] ??= { n: 0, edited: 0, scoreSum: 0, scoreCount: 0, rev: 0, tokens: 0, cost: 0, latency: 0, calls: 0 };
      agg[k].tokens += evTokens(e); agg[k].cost += e.costUsd || 0; agg[k].latency += e.latencyMs || 0; agg[k].calls++;
    }
  }
  return agg;
}

function Components({ sessions }: { sessions: any[] }) {
  const agg = aggregate(sessions);
  const rows = Object.entries(agg);
  const td: React.CSSProperties = { padding: "6px 8px" };
  return (
    <div>
      <div style={card}>
        <p style={label}>Tokens by component</p>
        <BarChart data={rows.map(([k, a]) => ({ label: k, value: a.tokens }))} />
      </div>
      <div style={card}>
        <p style={label}>Autonomous score by component (higher = more independent success)</p>
        <BarChart data={rows.map(([k, a]) => ({ label: k, value: autonomyScore(a) ?? 0 }))} unit="%" />
      </div>
      <div style={card}>
        <p style={label}>Per-component detail</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead><tr>{["Component", "Approved", "Edited %", "Avg rating", "Autonomy", "Avg rev.", "Avg latency", "Tokens", "Cost"].map((h) => <th key={h} style={{ ...td, textAlign: "left", fontSize: 10.5, color: C.t3, textTransform: "uppercase", borderBottom: `1px solid ${C.line}` }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(([k, a]) => {
            const auto = autonomyScore(a);
            return (
            <tr key={k}>
              <td style={{ ...td, fontWeight: 600 }}>{k}</td><td style={td}>{a.n}</td>
              <td style={td}>{a.n ? Math.round((a.edited / a.n) * 100) : 0}%</td>
              <td style={td}>{a.scoreCount ? `${(a.scoreSum / a.scoreCount).toFixed(1)}/5` : "—"}</td>
              <td style={{ ...td, fontWeight: 600, color: auto == null ? C.t3 : auto >= 70 ? C.green : auto >= 40 ? C.amber : C.red }}>{auto == null ? "—" : `${auto}%`}</td>
              <td style={td}>{a.n ? (a.rev / a.n).toFixed(1) : "0"}</td>
              <td style={td}>{a.calls ? Math.round(a.latency / a.calls) : 0}ms</td>
              <td style={td}>{a.tokens.toLocaleString()}</td><td style={td}>${a.cost.toFixed(6)}</td>
            </tr>
          );})}</tbody>
        </table>
      </div>
    </div>
  );
}

function Cost({ sessions }: { sessions: any[] }) {
  const agg = aggregate(sessions);
  const byComp = Object.entries(agg).map(([k, a]) => ({ label: k, value: a.cost }));
  const byModel: Record<string, number> = {};
  let calls = 0, hits = 0, totalCost = 0;
  for (const s of sessions) for (const e of (s.events || [])) {
    byModel[e.model] = (byModel[e.model] || 0) + (e.costUsd || 0);
    calls++; if (e.cacheHit) hits++; totalCost += e.costUsd || 0;
  }
  const completed = sessions.filter((s) => s.done).length || 1;
  const avgPerSession = totalCost / (sessions.length || 1);
  return (
    <div>
      <div style={{ ...card, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div><p style={label}>Total cost</p><div style={{ fontSize: 22, fontWeight: 600, color: C.purple }}>${totalCost.toFixed(6)}</div></div>
        <div><p style={label}>Model calls</p><div style={{ fontSize: 22, fontWeight: 600 }}>{calls}</div></div>
        <div><p style={label}>Cache hits</p><div style={{ fontSize: 22, fontWeight: 600, color: C.green }}>{hits} <span style={{ fontSize: 13, color: C.t3 }}>({calls ? Math.round((hits / calls) * 100) : 0}% of calls)</span></div></div>
        <div><p style={label}>Avg cost / session</p><div style={{ fontSize: 22, fontWeight: 600 }}>${avgPerSession.toFixed(6)}</div></div>
      </div>
      <div style={{ ...card, marginTop: -8 }}><p style={{ fontSize: 12, color: C.t3, margin: 0 }}>ℹ️ A <b>cache hit</b> happens only when an identical request repeats — e.g. re-running the same goal+attributes, or a revision that matches a prior call. A first, unique run has <b>0% hits</b> by design; that is not an error. On the mock model the saving shows $0 (mock is free); with a real key it becomes a dollar figure.</p></div>
      <div style={card}><p style={label}>Cost by component</p><Donut data={byComp.filter((d) => d.value > 0).length ? byComp : [{ label: "no cost (mock)", value: 1 }]} money /></div>
      <div style={card}><p style={label}>Cost by model</p><BarChart data={Object.entries(byModel).map(([k, v]) => ({ label: k, value: v }))} money /></div>
      <div style={card}>
        <p style={label}>Projected cost at scale</p>
        <p style={{ fontSize: 13, color: C.t2, margin: 0 }}>At the current average of <b>${avgPerSession.toFixed(6)}</b>/session:
          1,000 sessions ≈ <b>${(avgPerSession * 1000).toFixed(4)}</b>, 100,000 ≈ <b>${(avgPerSession * 100000).toFixed(2)}</b>.</p>
        <p style={{ fontSize: 11.5, color: C.t3, margin: "6px 0 0" }}>Note: running on the mock model shows $0. Add a Gemini key for real token economics.</p>
      </div>
    </div>
  );
}

function Traces({ sessions }: { sessions: any[] }) {
  const [sel, setSel] = useState(sessions[0]?.id);
  const s = sessions.find((x) => x.id === sel) || sessions[0];
  const events = s?.events || [];
  const maxLat = Math.max(1, ...events.map((e: any) => e.latencyMs || 0));
  return (
    <div>
      <div style={{ ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={label}>Session</span>
        <select value={sel} onChange={(e) => setSel(e.target.value)} style={input}>
          {sessions.map((x) => <option key={x.id} value={x.id}>{x.goalText} · {new Date(x.updatedAt).toLocaleString()}</option>)}
        </select>
      </div>
      <div style={card}>
        <p style={label}>Call timeline ({events.length} steps)</p>
        {events.map((e: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 12.5 }}>
            <span style={{ width: 18, color: C.t3 }}>{i + 1}</span>
            <span style={{ width: 92, fontWeight: 600 }}>{e.component}</span>
            <span style={{ width: 130, color: C.t2 }}>{e.cacheHit ? "cache hit" : e.model}{e.fellBackFrom ? ` (fallback from ${e.fellBackFrom})` : ""}</span>
            <div style={{ flex: 1, background: "#f1efe8", borderRadius: 4, height: 14, minWidth: 60 }}>
              <div style={{ width: `${((e.latencyMs || 0) / maxLat) * 100}%`, background: e.cacheHit ? C.green : C.purple, height: "100%", borderRadius: 4, minWidth: 2 }} />
            </div>
            <span style={{ width: 56, color: C.t2 }}>{e.latencyMs || 0}ms</span>
            <span style={{ width: 60, color: C.t3 }}>{evTokens(e)} tok</span>
            <span style={{ width: 70, color: C.t3 }}>${(e.costUsd || 0).toFixed(6)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromptRow({ p }: { p: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(0,0,0,.1)", padding: "6px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "#5f5e5a" }}>{p.component}</span>
        <span title={p.system} style={{ fontWeight: 600, cursor: "help" }}>{p.version}</span>
        <button onClick={() => setOpen(!open)} style={{ border: 0, background: "transparent", color: "#534ab7", cursor: "pointer", fontSize: 12 }}>{open ? "hide" : "view prompt"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 6, background: "#f9f8f4", border: "1px solid rgba(0,0,0,.08)", borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8a8980", textTransform: "uppercase", marginBottom: 3 }}>System</div>
          <pre style={{ margin: "0 0 8px", whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#1f1e1c" }}>{p.system}</pre>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8a8980", textTransform: "uppercase", marginBottom: 3 }}>User-prompt template</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#5f5e5a" }}>{p.template}</pre>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [cfg, setCfg] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then(setCfg); }, []);
  async function toggleCache() {
    setBusy(true);
    const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cacheEnabled: !cfg.cacheEnabled }) });
    setCfg(await r.json()); setBusy(false);
  }
  if (!cfg) return <div style={card}><p style={{ color: C.t3, margin: 0 }}>Loading settings…</p></div>;
  const row = (k: string, v: any) => <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}><span style={{ color: C.t2 }}>{k}</span><span style={{ fontWeight: 600 }}>{String(v)}</span></div>;
  return (
    <div>
      <div style={card}>
        <p style={label}>Run mode & providers</p>
        {row("Run mode", cfg.mode)}
        {row("Primary provider", cfg.primary)}
        {row("Fallback provider", cfg.backup ?? "none")}
        {row("Per-call timeout", `${cfg.timeoutMs} ms`)}
        {row("Simulate Gemini failure", cfg.simulateGeminiFail)}
      </div>
      <div style={card}>
        <p style={label}>Optimization toggle</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontWeight: 600 }}>Semantic cache</div><div style={{ fontSize: 12.5, color: C.t3 }}>Turn off and watch cost rise on the next run (repeated calls re-bill).</div></div>
          <button onClick={toggleCache} disabled={busy} style={{ padding: "8px 16px", borderRadius: 20, border: 0, cursor: "pointer", fontWeight: 600, color: "#fff", background: cfg.cacheEnabled ? C.green : C.red }}>
            {cfg.cacheEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      <div style={card}>
        <p style={label}>Prompt catalog <span style={{ textTransform: "none", fontWeight: 400, color: C.t3 }}>— hover a version to preview; click to see the full prompt</span></p>
        {cfg.prompts.map((p: any) => <PromptRow key={p.component} p={p} />)}
      </div>
    </div>
  );
}
