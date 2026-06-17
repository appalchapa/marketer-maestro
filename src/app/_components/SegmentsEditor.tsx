"use client";
import { useState, useEffect } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";

// AI proposes a draft; the marketer edits freely. Attributes are dragged (or
// clicked) from the palette into a segment as conditions. Edited state is the
// source of truth and is lifted up via onChange for Approve to persist.
type Condition = { attribute: string; operator: string; value: string };
type Segment = { name: string; description: string; match: "AND" | "OR"; conditions: Condition[] };

const OPERATORS = ["=", "!=", ">", ">=", "<", "<=", "in", "contains"];
const C = { purple: "#534ab7", amber: "#ba7517", t2: "#5f5e5a", t3: "#8a8980", line: "rgba(0,0,0,.12)" };
const chip = (active = false): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 4, background: active ? "#eeedfe" : "#f1efe8", border: `1px solid ${active ? C.purple : "transparent"}`, borderRadius: 8, padding: "4px 9px", fontSize: 12.5, margin: "3px 4px 3px 0", cursor: "grab", userSelect: "none" });

function AttrChip({ name }: { name: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `attr:${name}` });
  return <span ref={setNodeRef} {...listeners} {...attributes} style={{ ...chip(), opacity: isDragging ? 0.4 : 1 }} title="Drag onto a segment, or click + Add">{name}</span>;
}

function SegmentCard({ seg, idx, onChange, onDelete, attributes }: { seg: Segment; idx: number; onChange: (s: Segment) => void; onDelete: () => void; attributes: string[]; }) {
  const { setNodeRef, isOver } = useDroppable({ id: `seg:${idx}` });
  const [addAttr, setAddAttr] = useState("");
  const upd = (patch: Partial<Segment>) => onChange({ ...seg, ...patch });
  const updCond = (i: number, patch: Partial<Condition>) => upd({ conditions: seg.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const addCond = (attr: string) => { if (attr) upd({ conditions: [...seg.conditions, { attribute: attr, operator: "=", value: "" }] }); };
  const delCond = (i: number) => upd({ conditions: seg.conditions.filter((_, j) => j !== i) });

  return (
    <div ref={setNodeRef} style={{ border: `1.5px solid ${isOver ? C.purple : C.line}`, background: isOver ? "#f6f5ff" : "#fff", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input value={seg.name} onChange={(e) => upd({ name: e.target.value })} style={{ fontWeight: 600, border: "none", borderBottom: `1px solid ${C.line}`, fontSize: 14, flex: 1, padding: "2px 0", background: "transparent" }} />
        <button onClick={() => upd({ match: seg.match === "AND" ? "OR" : "AND" })} style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: "#faeeda", border: 0, borderRadius: 12, padding: "3px 10px", cursor: "pointer" }}>{seg.match}</button>
        <button onClick={onDelete} title="Delete segment" style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer", fontSize: 16 }}>×</button>
      </div>
      {seg.conditions.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 110 }}>{c.attribute}</span>
          <select value={c.operator} onChange={(e) => updCond(i, { operator: e.target.value })} style={{ fontSize: 12.5, padding: "3px 4px", borderRadius: 6, border: `1px solid ${C.line}` }}>
            {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input value={c.value} onChange={(e) => updCond(i, { value: e.target.value })} placeholder="value" style={{ fontSize: 12.5, padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.line}`, flex: 1, minWidth: 60 }} />
          {i < seg.conditions.length - 1 && <span style={{ fontSize: 10, fontWeight: 700, color: C.amber }}>{seg.match}</span>}
          <button onClick={() => delCond(i)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button>
        </div>
      ))}
      {/* click/dropdown fallback path (works even without drag) */}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <select value={addAttr} onChange={(e) => setAddAttr(e.target.value)} style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.line}` }}>
          <option value="">+ add attribute…</option>
          {attributes.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => { addCond(addAttr); setAddAttr(""); }} disabled={!addAttr} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 14, border: `1px solid ${C.line}`, background: addAttr ? "#eeedfe" : "#f5f4ef", color: addAttr ? C.purple : C.t3, cursor: addAttr ? "pointer" : "default" }}>Add</button>
      </div>
    </div>
  );
}

export default function SegmentsEditor({ attributes, initial, onChange }: { attributes: string[]; initial: Segment[]; onChange: (segs: Segment[]) => void; }) {
  const [segments, setSegments] = useState<Segment[]>(initial);
  useEffect(() => { setSegments(initial); }, [initial]);
  useEffect(() => { onChange(segments); }, [segments]);

  const setSeg = (i: number, s: Segment) => setSegments((prev) => prev.map((x, j) => (j === i ? s : x)));
  const delSeg = (i: number) => setSegments((prev) => prev.filter((_, j) => j !== i));
  const addSeg = () => setSegments((prev) => [...prev, { name: `Segment ${prev.length + 1}`, description: "", match: "AND", conditions: [{ attribute: attributes[0] ?? "", operator: "=", value: "" }] }]);

  function onDragEnd(e: DragEndEvent) {
    const a = String(e.active.id); const o = e.over ? String(e.over.id) : "";
    if (a.startsWith("attr:") && o.startsWith("seg:")) {
      const attr = a.slice(5); const idx = Number(o.slice(4));
      setSegments((prev) => prev.map((s, j) => (j === idx ? { ...s, conditions: [...s.conditions, { attribute: attr, operator: "=", value: "" }] } : s)));
    }
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>Your attributes</p>
          <p style={{ fontSize: 11.5, color: C.t3, margin: "0 0 8px" }}>Drag onto a segment, or use “+ add attribute”.</p>
          <div>{attributes.length ? attributes.map((a) => <AttrChip key={a} name={a} />) : <span style={{ fontSize: 12, color: C.t3 }}>No attributes provided.</span>}</div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          {segments.map((s, i) => <SegmentCard key={i} seg={s} idx={i} attributes={attributes} onChange={(ns) => setSeg(i, ns)} onDelete={() => delSeg(i)} />)}
          <button onClick={addSeg} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer" }}>+ Add segment</button>
        </div>
      </div>
    </DndContext>
  );
}
