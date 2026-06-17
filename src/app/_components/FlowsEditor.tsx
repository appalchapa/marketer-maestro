"use client";
import { useState, useEffect } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Ab = { variantId: string; percent: number };
type Step = { day: number; channel: string; action: string; abTest?: Ab[] };
type Flow = { name: string; audience: string; direction: "inbound" | "outbound"; steps: Step[] };
type VariantOpt = { id: string; label: string };

const C = { purple: "#534ab7", amber: "#ba7517", green: "#0f6e56", red: "#a32d2d", t2: "#5f5e5a", t3: "#8a8980", line: "rgba(0,0,0,.12)" };
const CHANNELS = ["Email", "SMS", "Push", "In-app", "WhatsApp", "Call"];
const MESSAGE = ["Email", "SMS", "Push", "In-app", "WhatsApp"];
const inp: React.CSSProperties = { fontSize: 12.5, padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.line}` };

// All content variants for a given audience (segment match, case-insensitive).
function variantsForAudience(content: any, audience: string): VariantOpt[] {
  const offers = content?.offers ?? [];
  const a = (audience || "").toLowerCase().trim();
  const out: VariantOpt[] = [];
  for (const off of offers) {
    if (a && off.segment.toLowerCase().trim() !== a) continue;
    off.variants.forEach((v: any, i: number) => out.push({ id: v.id, label: `${off.segment} · ${String.fromCharCode(65 + i)} (${v.tone}): ${v.subject || "—"}` }));
  }
  return out;
}

function AbEditor({ step, options, onChange }: { step: Step; options: VariantOpt[]; onChange: (ab: Ab[]) => void }) {
  const ab = step.abTest ?? [];
  const total = ab.reduce((s, x) => s + (Number(x.percent) || 0), 0);
  const set = (i: number, patch: Partial<Ab>) => onChange(ab.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = () => onChange([...ab, { variantId: options[0]?.id ?? "", percent: ab.length ? 0 : 100 }]);
  const del = (i: number) => onChange(ab.filter((_, j) => j !== i));
  return (
    <div style={{ marginLeft: 28, marginTop: 4, paddingLeft: 8, borderLeft: `2px solid ${C.line}` }}>
      <div style={{ fontSize: 10.5, color: C.t3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>A/B content</div>
      {options.length === 0 && <div style={{ fontSize: 11.5, color: C.t3 }}>No content for this audience — set the flow's audience to a segment that has content.</div>}
      {ab.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
          <select value={x.variantId} onChange={(e) => set(i, { variantId: e.target.value })} style={{ ...inp, flex: 1, minWidth: 120 }}>
            <option value="">— pick variant —</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            {x.variantId && !options.some((o) => o.id === x.variantId) && <option value={x.variantId}>(removed variant)</option>}
          </select>
          <input type="number" value={x.percent} onChange={(e) => set(i, { percent: Number(e.target.value) })} style={{ ...inp, width: 56 }} />
          <span style={{ fontSize: 11, color: C.t3 }}>%</span>
          <button onClick={() => del(i)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button>
        </div>
      ))}
      {options.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={add} style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#eeedfe", color: C.purple, cursor: "pointer" }}>+ variant</button>
          {ab.length > 0 && <span style={{ fontSize: 11.5, fontWeight: 600, color: total === 100 ? C.green : C.red }}>Total: {total}%{total !== 100 ? " — must equal 100%" : " ✓"}</span>}
        </div>
      )}
    </div>
  );
}

function StepRow({ id, step, content, audience, onChange, onDelete, onUp, onDown }:
  { id: string; step: Step; content: any; audience: string; onChange: (s: Step) => void; onDelete: () => void; onUp: () => void; onDown: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, padding: "5px 0" };
  const mv: React.CSSProperties = { border: 0, background: "transparent", color: C.t3, cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 };
  const isMsg = MESSAGE.includes(step.channel);
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span {...attributes} {...listeners} title="Drag to reorder" style={{ cursor: "grab", color: C.t3, fontSize: 14, userSelect: "none" }}>⠿</span>
        <span style={{ display: "flex", flexDirection: "column" }}><button onClick={onUp} title="Move up" style={mv}>▲</button><button onClick={onDown} title="Move down" style={mv}>▼</button></span>
        <span style={{ fontSize: 11, color: C.t3 }}>Day</span>
        <input type="number" value={step.day} onChange={(e) => onChange({ ...step, day: Number(e.target.value) })} style={{ ...inp, width: 48 }} />
        <select value={step.channel} onChange={(e) => onChange({ ...step, channel: e.target.value })} style={inp}>
          {CHANNELS.includes(step.channel) ? null : <option value={step.channel}>{step.channel}</option>}
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={step.action} onChange={(e) => onChange({ ...step, action: e.target.value })} placeholder="action" style={{ ...inp, flex: 1, minWidth: 80 }} />
        <button onClick={onDelete} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button>
      </div>
      {isMsg && <AbEditor step={step} options={variantsForAudience(content, audience)} onChange={(ab) => onChange({ ...step, abTest: ab })} />}
    </div>
  );
}

function FlowCard({ flow, content, segmentNames, onChange, onDelete }:
  { flow: Flow; content: any; segmentNames: string[]; onChange: (f: Flow) => void; onDelete: () => void }) {
  const ids = flow.steps.map((_, i) => `s${i}`);
  const upd = (patch: Partial<Flow>) => onChange({ ...flow, ...patch });
  const updStep = (i: number, s: Step) => upd({ steps: flow.steps.map((x, j) => (j === i ? s : x)) });
  const delStep = (i: number) => upd({ steps: flow.steps.filter((_, j) => j !== i) });
  const addStep = () => upd({ steps: [...flow.steps, { day: (flow.steps.at(-1)?.day ?? 0) + 1, channel: "Email", action: "" }] });
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    upd({ steps: arrayMove(flow.steps, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))) });
  }
  return (
    <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input value={flow.name} onChange={(e) => upd({ name: e.target.value })} style={{ fontWeight: 600, border: "none", borderBottom: `1px solid ${C.line}`, fontSize: 14, flex: 1, padding: "2px 0", background: "transparent" }} />
        <button onClick={() => upd({ direction: flow.direction === "outbound" ? "inbound" : "outbound" })} style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: "#faeeda", border: 0, borderRadius: 12, padding: "3px 10px", cursor: "pointer" }}>{flow.direction}</button>
        <button onClick={onDelete} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer", fontSize: 16 }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.t3 }}>Audience</span>
        <select value={segmentNames.includes(flow.audience) ? flow.audience : ""} onChange={(e) => upd({ audience: e.target.value })} style={{ ...inp, flex: 1 }}>
          <option value="">— select segment —</option>
          {segmentNames.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {flow.steps.map((st, i) => <StepRow key={ids[i]} id={ids[i]} step={st} content={content} audience={flow.audience}
            onChange={(s) => updStep(i, s)} onDelete={() => delStep(i)}
            onUp={() => i > 0 && upd({ steps: arrayMove(flow.steps, i, i - 1) })}
            onDown={() => i < flow.steps.length - 1 && upd({ steps: arrayMove(flow.steps, i, i + 1) })} />)}
        </SortableContext>
      </DndContext>
      <button onClick={addStep} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 14, border: `1px solid ${C.line}`, background: "#eeedfe", color: C.purple, cursor: "pointer", marginTop: 4 }}>+ add step</button>
    </div>
  );
}

export default function FlowsEditor({ initial, content, segmentNames, onChange }:
  { initial: Flow[]; content: any; segmentNames: string[]; onChange: (f: Flow[]) => void }) {
  const [flows, setFlows] = useState<Flow[]>(initial);
  useEffect(() => { setFlows(initial); }, [initial]);
  useEffect(() => { onChange(flows); }, [flows]);
  const setFlow = (i: number, f: Flow) => setFlows((p) => p.map((x, j) => (j === i ? f : x)));
  const delFlow = (i: number) => setFlows((p) => p.filter((_, j) => j !== i));
  const addFlow = () => setFlows((p) => [...p, { name: `Flow ${p.length + 1}`, audience: segmentNames[0] ?? "", direction: "outbound", steps: [{ day: 1, channel: "Email", action: "" }] }]);
  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.t3, margin: "0 0 8px" }}>Drag ⠿ (or ▲▼) to reorder. Message steps can run an A/B content test (must total 100%). Audience picks a segment so its content is offered.</p>
      {flows.map((f, i) => <FlowCard key={i} flow={f} content={content} segmentNames={segmentNames} onChange={(nf) => setFlow(i, nf)} onDelete={() => delFlow(i)} />)}
      <button onClick={addFlow} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer" }}>+ Add flow</button>
    </div>
  );
}
