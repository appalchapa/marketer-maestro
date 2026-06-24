"use client";
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import SegmentsEditor from "./_components/SegmentsEditor";
import EfficacyPanel from "./_components/EfficacyPanel";
import FlowsEditor from "./_components/FlowsEditor";
import ContentEditor from "./_components/ContentEditor";
import AttributionEditor from "./_components/AttributionEditor";
import Logo from "./_components/Logo";
import Observe from "./_components/Observe";
import PlanEditor from "./_components/PlanEditor";

import { STAGES } from "@core/orchestration/stages";

const RATING_LABELS: Record<number, string> = { 1: "Poor", 2: "Weak", 3: "Okay", 4: "Good", 5: "Excellent" };
const C = { surface: "#fff", line: "rgba(0,0,0,.1)", t2: "#5f5e5a", t3: "#8a8980",
  purple: "#534ab7", green: "#0f6e56", amber: "#ba7517", red: "#a32d2d", blue: "#185fa5" };
const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 16 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 6px" };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid rgba(0,0,0,.18)`, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };
const btn = (bg: string, off?: boolean): React.CSSProperties => ({ padding: "9px 18px", borderRadius: 22, border: 0, background: off ? "#cfcdc4" : bg, color: "#fff", fontWeight: 600, cursor: off ? "default" : "pointer", fontSize: 13.5 });
const chip: React.CSSProperties = { display: "inline-block", background: "#f1efe8", borderRadius: 8, padding: "3px 9px", fontSize: 12.5, margin: "3px 4px 3px 0" };

type Line = { type: string; kind?: string; message?: string; model?: string; cacheHit?: boolean; tokens?: number; cost?: number; session?: any };

export default function Home() {
  const [view, setView] = useState<"operate" | "observe">("operate");
  const [username, setUsername] = useState("");
  const [goalText, setGoalText] = useState("Reduce churn by 10% in 2 months");
  const [vertical, setVertical] = useState("Telecom");
  const [session, setSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [feedback, setFeedback] = useState("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [attrMode, setAttrMode] = useState<"paste" | "upload" | "mcp">("paste");
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [editedSegments, setEditedSegments] = useState<any[] | null>(null);
  const [editedFlows, setEditedFlows] = useState<any[] | null>(null);
  const [editedContent, setEditedContent] = useState<any[] | null>(null);
  const [editedAttribution, setEditedAttribution] = useState<any[] | null>(null);
  const [editedPlan, setEditedPlan] = useState<any | null>(null);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Line[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const watchdog = useRef<any>(null);

  async function loadHistory(u: string) {
    if (!u) return;
    const r = await fetch(`/api/session/list?username=${encodeURIComponent(u)}`);
    setHistory((await r.json()).sessions || []);
  }
  useEffect(() => { if (username && session) loadHistory(username); }, [session]);

  // Reads an NDJSON stream, pushing each line into the status panel.
  async function runStream(url: string, body: any) {
    setBusy(true); setFatal(null); setStatus([{ type: "status", kind: "info", message: "Starting…" }]);
    const ctrl = new AbortController();
    // Watchdog: if nothing arrives for 60s, stop waiting and show a clear failure.
    const bump = () => { clearTimeout(watchdog.current); watchdog.current = setTimeout(() => { ctrl.abort(); setFatal("No response for 60s — the request may have failed. Please try again."); setBusy(false); }, 60000); };
    bump();
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bump();
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const ln of lines) {
          if (!ln.trim()) continue;
          const ev: Line = JSON.parse(ln);
          if (ev.type === "result") { setSession(ev.session); }
          else if (ev.type === "error") { setFatal(ev.message || "Request failed"); }
          else setStatus((s) => [...s, ev]);
        }
      }
    } catch (e: any) {
      if (!fatal) setFatal(e?.name === "AbortError" ? "Request timed out." : (e?.message ?? "Request failed"));
    } finally {
      clearTimeout(watchdog.current); setBusy(false);
    }
  }

  const start = () => runStream("/api/session/start", { username, goalText, vertical, attributes });
  const MESSAGE = ["Email", "SMS", "Push", "In-app", "WhatsApp"];
  const abError = (flows: any[]): string | null => {
    for (const f of flows || []) for (const st of f.steps || []) {
      if (MESSAGE.includes(st.channel) && Array.isArray(st.abTest) && st.abTest.length) {
        const t = st.abTest.reduce((a: number, x: any) => a + (Number(x.percent) || 0), 0);
        if (Math.round(t) !== 100) return `A/B split on "${f.name}" (Day ${st.day} ${st.channel}) must total 100% — currently ${t}%.`;
      }
    }
    return null;
  };
  const approve = () => {
    const k = STAGES[session.stageIndex]?.key;
    if (k === "flows" && editedFlows) { const e = abError(editedFlows); if (e) { setFatal(e); return; } }
    let edited: any = undefined;
    if (k === "segments" && editedSegments) edited = { segments: { segments: editedSegments } };
    else if (k === "flows" && editedFlows) edited = { flows: { flows: editedFlows } };
    else if (k === "content" && editedContent) edited = { content: { offers: editedContent } };
    else if (k === "attribution" && editedAttribution) edited = { attribution: { params: editedAttribution } };
    else if (k === "plan" && editedPlan) edited = { plan: editedPlan };
    runStream("/api/session/stage", { sessionId: session.id, action: "approve", edited, score });
    setEditedSegments(null); setEditedFlows(null); setEditedContent(null); setEditedAttribution(null); setEditedPlan(null); setScore(undefined);
  };
  const revise = () => { if (feedback) { runStream("/api/session/stage", { sessionId: session.id, action: "revise", feedback }); setFeedback(""); } };

  useEffect(() => { setScore(undefined); }, [session?.stageIndex, session?.id]);
  const cost = (s: any) => (s?.events || []).reduce((a: number, e: any) => a + (e.costUsd || 0), 0);
  const stageIdx = session?.stageIndex ?? 0;
  const curKey = STAGES[stageIdx]?.key;

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "34px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={38} />
          <div><h1 style={{ fontWeight: 600, margin: 0 }}>Marketer Maestro</h1>
            <p style={{ color: C.t2, margin: "2px 0 0", fontSize: 14 }}>Co-create a marketing strategy, one approved stage at a time.</p></div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["operate", "observe"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13.5, cursor: "pointer", textTransform: "capitalize",
              border: `1px solid ${view === v ? C.purple : "rgba(0,0,0,.15)"}`, background: view === v ? "#eeedfe" : "#fff", color: view === v ? C.purple : C.t2, fontWeight: view === v ? 600 : 400 }}>{v}</button>
          ))}
        </div>
      </div>

      {view === "observe" && <div style={{ marginTop: 18 }}><Observe username={username} setUsername={setUsername} /></div>}

      {view === "operate" && (<>
      {session && <div style={{ textAlign: "right", fontSize: 12, color: C.t3, marginTop: 6 }}>
          <span>session cost </span><span style={{ fontSize: 16, fontWeight: 600, color: C.purple }}>${cost(session).toFixed(6)}</span>
          <span> · {session.events?.length || 0} model calls</span></div>}

      {!session && (
        <div style={{ ...card, marginTop: 18 }}>
          <p style={label}>Username</p>
          <input style={input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. ganesha" onBlur={() => loadHistory(username)} />
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <div style={{ flex: 1 }}><p style={label}>Industry</p><input style={input} value={vertical} onChange={(e) => setVertical(e.target.value)} /></div>
            <div style={{ flex: 2 }}><p style={label}>Goal</p><input style={input} value={goalText} onChange={(e) => setGoalText(e.target.value)} /></div>
          </div>

          <div style={{ marginTop: 14 }}>
            <p style={label}>Customer attributes <span style={{ textTransform: "none", fontWeight: 400, color: C.t3 }}>(names only — the system never sees real customer data)</span></p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {(["paste", "upload", "mcp"] as const).map((m) => (
                <button key={m} onClick={() => setAttrMode(m)} style={{ padding: "5px 12px", borderRadius: 18, fontSize: 12.5, border: `1px solid ${attrMode === m ? C.purple : "rgba(0,0,0,.18)"}`, background: attrMode === m ? "#eeedfe" : "#fff", color: attrMode === m ? C.purple : C.t2, cursor: "pointer", fontWeight: 500 }}>
                  {m === "paste" ? "Paste" : m === "upload" ? "Upload CSV/Excel" : "MCP (coming soon)"}
                </button>
              ))}
            </div>
            {attrMode === "paste" && (
              <textarea style={{ ...input, minHeight: 64, resize: "vertical" }} value={pasteText}
                placeholder="Paste attribute names, comma or newline separated&#10;e.g. tenure_months, last_login_days, contract_type, support_tickets_90d"
                onChange={(e) => { setPasteText(e.target.value); setAttributes(e.target.value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)); }} />
            )}
            {attrMode === "upload" && (
              <div>
                <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const name = file.name.toLowerCase();
                    let cols: string[] = [];
                    if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
                      const text = await file.text();
                      const first = text.split(/\r?\n/)[0] || "";
                      cols = first.split(name.endsWith(".tsv") ? "\t" : ",").map((x) => x.trim()).filter(Boolean);
                    } else {
                      const buf = await file.arrayBuffer();
                      const wb = XLSX.read(buf, { type: "array" });
                      const ws = wb.Sheets[wb.SheetNames[0]];
                      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                      cols = (rows[0] || []).map((c) => String(c).trim()).filter(Boolean);
                    }
                    setAttributes(cols);
                  } catch { alert("Could not read that file — try a CSV or paste the names instead."); }
                }} />
                <p style={{ fontSize: 12, color: C.t3, margin: "6px 0 0" }}>We read only the header row (column names).</p>
              </div>
            )}
            {attrMode === "mcp" && (
              <p style={{ fontSize: 13, color: C.t3, margin: "4px 0", padding: "8px 10px", background: "#f1efe8", borderRadius: 8 }}>
                Pull attribute names live from a CRM/CDP via MCP — coming in the next build. For now, paste or upload.
              </p>
            )}
            {attributes.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 12, color: C.t3 }}>{attributes.length} attributes captured: </span>
                {attributes.slice(0, 12).map((a) => <span key={a} style={chip}>{a}</span>)}
                {attributes.length > 12 && <span style={{ fontSize: 12, color: C.t3 }}>+{attributes.length - 12} more</span>}
              </div>
            )}
          </div>
          <div style={{ marginTop: 16 }}><button style={btn(C.purple, busy || !username)} onClick={start} disabled={busy || !username}>{busy ? "Working…" : "Start strategy session"}</button></div>
          {(busy || status.length > 1 || fatal) && <div style={{ marginTop: 16 }}><StatusPanel status={status} busy={busy} fatal={fatal} onRetry={start} /></div>}
        </div>
      )}

      {session && (
        <div style={{ display: "flex", gap: 18, marginTop: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 64%", minWidth: 320 }}>
            <div style={card}><p style={label}>Understood goal</p><p style={{ margin: 0, fontSize: 15 }}>{session.intent?.restated}</p></div>
            {!session.done && (() => {
              const wrap = (title: string, node: any) => <div style={card}><p style={{ fontSize: 11, fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" }}>Stage {session.stageIndex + 1}: {title}</p>{node}</div>;
              if (curKey === "segments") return wrap("Segments — drag attributes to edit", <SegmentsEditor attributes={session.attributes || []} initial={(session.outputs?.segments?.segments) || []} onChange={setEditedSegments} />);
              if (curKey === "flows") return wrap("Flows — drag to reorder, A/B content per step", <FlowsEditor initial={(session.outputs?.flows?.flows) || []} content={session.outputs?.content} segmentNames={(session.outputs?.segments?.segments || []).map((x: any) => x.name)} onChange={setEditedFlows} />);
              if (curKey === "content") return wrap("Content — edit variants, add A/B", <ContentEditor initial={(session.outputs?.content?.offers) || []} attributes={session.attributes || []} onChange={setEditedContent} />);
              if (curKey === "attribution") return wrap("Attribution — edit parameters", <AttributionEditor initial={(session.outputs?.attribution?.params) || []} onChange={setEditedAttribution} />);
              if (curKey === "plan") return wrap("Project plan — edit tasks, owners, durations, dependencies", <PlanEditor initial={session.outputs?.plan} onChange={setEditedPlan} />);
              return <StagePanel stageKey={curKey} session={session} />;
            })()}
            {session.done && (
              <div style={card}><p style={{ ...label, color: C.green }}>Strategy brief ready</p>
                <p style={{ marginTop: 0 }}>All stages approved. Download the formatted brief:</p>
                <a href={`/api/session/export?sessionId=${session.id}`} style={{ ...btn(C.green), textDecoration: "none", display: "inline-block" }}>Download brief (Word)</a>
                <button style={{ ...btn(C.purple), marginLeft: 10 }} onClick={() => { setSession(null); setStatus([]); }}>Start another</button>
              </div>
            )}
            {!session.done && (
              <div style={card}><p style={label}>Approve, or request a change to this stage</p>
                <input style={input} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. focus more on high-value customers" />
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: C.t3 }}>Rate this output (1 = poor, 5 = excellent):</span>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setScore(score === n ? undefined : n)} title={RATING_LABELS[n]}
                        style={{ width: 38, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                          border: `1px solid ${score === n ? C.purple : C.line}`, background: score === n ? "#eeedfe" : "#fff", color: score === n ? C.purple : C.t2 }}>{n}</button>
                    ))}
                    {score ? <span style={{ fontSize: 12, color: C.t2, alignSelf: "center", marginLeft: 4 }}>{RATING_LABELS[score]}</span> : null}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button style={btn(C.green, busy)} onClick={approve} disabled={busy}>Approve &amp; continue →</button>
                  <button style={{ ...btn(C.amber, busy || !feedback), marginLeft: 10 }} onClick={revise} disabled={busy || !feedback}>Revise</button>
                </div>
              </div>
            )}
          </div>

          {/* Right rail (~30%): Progress on top, Status below — stacked */}
          <div style={{ flex: "1 1 28%", minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={card}>
              <p style={label}>Progress</p>
              {STAGES.map((st, i) => {
                const done = session.done || i < stageIdx; const active = !session.done && i === stageIdx;
                return (<div key={st.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", opacity: i > stageIdx && !session.done ? 0.4 : 1 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: done ? C.green : active ? C.purple : "#cfcdc4" }}>{done ? "✓" : i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{st.label}</span></div>);
              })}
              {session.done && <div style={{ marginTop: 8, padding: "8px 10px", background: "#e1f5ee", color: C.green, borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>All stages approved ✓</div>}
            </div>
            {(busy || status.length > 1 || fatal) && (
              <div style={card}><p style={label}>Live status</p><StatusPanel status={status} busy={busy} fatal={fatal} onRetry={() => (session ? approve() : start())} /></div>
            )}
          </div>
        </div>
      )}

      {!session && history.length > 0 && (
        <>
        <EfficacyPanel history={history} />
        <div style={card}><p style={label}>Monitoring — {username}'s sessions ({history.length})</p>
          {history.map((s) => (<div key={s.id} style={{ borderTop: `1px solid ${C.line}`, padding: "8px 0", fontSize: 13 }}>
            <b>{s.goalText}</b> <span style={{ color: C.t3 }}>· {s.vertical} · {s.done ? "complete" : `stage ${s.stageIndex + 1}/${STAGES.length}`} · ${cost(s).toFixed(6)}</span></div>))}
        </div>
        </>
      )}
      </>)}
    </main>
  );
}

function StatusPanel({ status, busy, fatal, onRetry }: { status: Line[]; busy: boolean; fatal: string | null; onRetry: () => void }) {
  const color = (k?: string) => k === "fallback" ? C.amber : k === "error" || k === "timeout" ? C.red : k === "retry" ? C.amber : C.blue;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {status.map((s, i) => (
          <div key={i} style={{ fontSize: 12.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
            {s.type === "model"
              ? <span style={{ color: C.green }}>✓ {s.cacheHit ? "cache hit (0 tokens)" : `answered by ${s.model} · ${s.tokens} tok · $${(s.cost || 0).toFixed(6)}`}</span>
              : <span style={{ color: color(s.kind) }}>{s.kind === "fallback" ? "↪ " : s.kind === "error" ? "✕ " : "• "}{s.message}</span>}
          </div>
        ))}
        {busy && <div style={{ fontSize: 12.5, color: C.t3 }}><span className="blink">●</span> working…</div>}
      </div>
      {fatal && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#fceaea", border: `1px solid #f0a0a0`, borderRadius: 8 }}>
          <div style={{ fontSize: 12.5, color: C.red, fontWeight: 600 }}>{fatal}</div>
          <button style={{ ...btn(C.red), marginTop: 8, padding: "6px 14px", fontSize: 12.5 }} onClick={onRetry}>Try again</button>
        </div>
      )}
      <style>{`.blink{animation:b 1s steps(2) infinite}@keyframes b{0%{opacity:1}50%{opacity:.2}}`}</style>
    </div>
  );
}

function StagePanel({ stageKey, session }: { stageKey: string; session: any }) {
  const o = session.outputs || {};
  const head = STAGES.find((s) => s.key === stageKey)?.label;
  return (
    <div style={card}>
      <p style={{ fontSize: 11, fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" }}>Stage {session.stageIndex + 1}: {head} — review</p>
      {stageKey === "strategy" && o.strategy && (<><p style={{ marginTop: 0 }}>{o.strategy.summary}</p>
        <ul style={{ paddingLeft: 18, margin: "8px 0" }}>{o.strategy.pillars.map((p: any, i: number) => <li key={i} style={{ marginBottom: 6 }}><b>{p.title}</b> — <span style={{ color: C.t2 }}>{p.rationale}</span></li>)}</ul>
        <div>{o.strategy.recommendedChannels.map((c: string) => <span key={c} style={chip}>{c}</span>)}</div></>)}
      {stageKey === "signals" && o.signals && (<ul style={{ paddingLeft: 18, margin: 0 }}>{o.signals.signals.map((s: any, i: number) => <li key={i} style={{ marginBottom: 6 }}><b>{s.name}</b> — <span style={{ color: C.t2 }}>{s.rationale}</span></li>)}</ul>)}
      {stageKey === "segments" && o.segments && o.segments.segments.map((seg: any, i: number) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>{seg.name}</div><div style={{ fontSize: 13, color: C.t2, margin: "2px 0 8px" }}>{seg.description}</div>
          <div>{seg.conditions.map((c: any, j: number) => (<span key={j}><span style={chip}>{c.attribute} {c.operator} {c.value}</span>{j < seg.conditions.length - 1 && <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, margin: "0 4px" }}>{seg.match}</span>}</span>))}</div>
        </div>))}
      {stageKey === "flows" && o.flows && o.flows.flows.map((f: any, i: number) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>{f.name} <span style={{ fontSize: 12, color: C.t3 }}>· {f.direction} · {f.audience}</span></div>
          <div style={{ marginTop: 8 }}>{f.steps.map((st: any, j: number) => (<div key={j} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0" }}>
            <span style={{ width: 46, fontSize: 12, fontWeight: 600, color: C.purple }}>Day {st.day}</span><span style={chip}>{st.channel}</span><span style={{ fontSize: 13, color: C.t2 }}>{st.action}</span></div>))}</div>
        </div>))}
      {stageKey === "content" && o.content && o.content.offers.map((off: any, i: number) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Segment: {off.segment}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{off.variants.map((v: any, j: number) => (
            <div key={j} style={{ flex: 1, minWidth: 180, background: "#f9f8f4", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase" }}>{String.fromCharCode(65 + j)} · {v.tone}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, margin: "4px 0" }}>{v.subject}</div><div style={{ fontSize: 13, color: C.t2 }}>{v.body}</div></div>))}</div>
        </div>))}
      {stageKey === "attribution" && o.attribution && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Key", "Value", "Purpose"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.t3, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{o.attribution.params.map((p: any, i: number) => (<tr key={i}><td style={{ padding: "6px 8px", fontWeight: 600 }}>{p.key}</td><td style={{ padding: "6px 8px" }}>{p.value}</td><td style={{ padding: "6px 8px", color: C.t2 }}>{p.purpose}</td></tr>))}</tbody>
        </table>)}
    </div>
  );
}
