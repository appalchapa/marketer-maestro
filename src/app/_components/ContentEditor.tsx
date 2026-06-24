"use client";
import { useState, useEffect, useRef } from "react";
import PreviewModal from "./Preview";

const mkId = () => "v_" + Math.random().toString(16).slice(2, 10);
type Variant = { id?: string; tone: string; subject: string; body: string; ctaText?: string; ctaLink?: string; imageUrl?: string };
type Offer = { segment: string; variants: Variant[] };
const C = { purple: "#534ab7", amber: "#ba7517", t3: "#8a8980", line: "rgba(0,0,0,.12)", blue: "#185fa5" };
const inp: React.CSSProperties = { fontSize: 12.5, padding: "4px 7px", borderRadius: 6, border: `1px solid ${C.line}`, width: "100%", boxSizing: "border-box" };

// Pure helpers (unit-tested): detect an "@query" ending at the caret, and
// replace it with a {{attribute}} personalization token.
export function detectMentionQuery(text: string, caret: number): string | null {
  const m = text.slice(0, caret).match(/@([\w-]*)$/);
  return m ? m[1] : null;
}
export function applyMention(text: string, caret: number, attr: string): { value: string; caret: number } {
  const before = text.slice(0, caret).replace(/@([\w-]*)$/, `{{${attr}}}`);
  return { value: before + text.slice(caret), caret: before.length };
}

// Input/textarea with an @-triggered attribute picker. Type "@" then filter; pick to insert {{attr}}.
function MentionField({ value, onChange, attributes, textarea, placeholder, style }:
  { value: string; onChange: (v: string) => void; attributes: string[]; textarea?: boolean; placeholder?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const refresh = () => { const el = ref.current; if (!el) return; setQuery(detectMentionQuery(el.value, el.selectionStart ?? el.value.length)); };
  const choose = (attr: string) => {
    const el = ref.current; if (!el) return;
    const { value: nv, caret } = applyMention(el.value, el.selectionStart ?? el.value.length, attr);
    onChange(nv); setQuery(null);
    requestAnimationFrame(() => { if (ref.current) { ref.current.focus(); ref.current.setSelectionRange(caret, caret); } });
  };
  const matches = query !== null ? attributes.filter((a) => a.toLowerCase().includes(query.toLowerCase())) : [];
  const common = { ref, value, placeholder, style: { ...inp, ...style },
    onChange: (e: any) => { onChange(e.target.value); refresh(); },
    onKeyUp: refresh, onClick: refresh, onBlur: () => setTimeout(() => setQuery(null), 150) };
  return (
    <div style={{ position: "relative" }}>
      {textarea ? <textarea {...common} /> : <input {...common} />}
      {query !== null && attributes.length > 0 && (
        <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,.12)", maxHeight: 160, overflowY: "auto", marginTop: 2 }}>
          <div style={{ fontSize: 10.5, color: C.t3, padding: "4px 8px", textTransform: "uppercase" }}>Insert attribute{query ? ` matching “${query}”` : ""}</div>
          {matches.length ? matches.map((a) => (
            <div key={a} onMouseDown={(e) => { e.preventDefault(); choose(a); }} style={{ padding: "5px 8px", fontSize: 12.5, cursor: "pointer", color: C.purple }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#eeedfe")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {`{{${a}}}`}
            </div>
          )) : <div style={{ padding: "5px 8px", fontSize: 12, color: C.t3 }}>no attribute matches “{query}”</div>}
        </div>
      )}
    </div>
  );
}

export default function ContentEditor({ initial, attributes = [], onChange }: { initial: Offer[]; attributes?: string[]; onChange: (o: Offer[]) => void }) {
  const [offers, setOffers] = useState<Offer[]>(initial);
  useEffect(() => {
    setOffers(initial.map((o) => ({ ...o, variants: o.variants.map((v) => ({ ...v, id: (v as any).id || mkId() })) })));
  }, [initial]);
  useEffect(() => { onChange(offers); }, [offers]);
  const setOffer = (i: number, o: Offer) => setOffers((p) => p.map((x, j) => (j === i ? o : x)));
  const delOffer = (i: number) => setOffers((p) => p.filter((_, j) => j !== i));
  const addOffer = () => setOffers((p) => [...p, { segment: "New segment", variants: [{ id: mkId(), tone: "warm", subject: "", body: "" }] }]);

  // Per-variant on-demand generation: tone -> subject/body/CTA for that one variant.
  const [genning, setGenning] = useState<string | null>(null);
  const [previewVar, setPreviewVar] = useState<Variant | null>(null);
  const genVariant = async (offerIdx: number, varIdx: number) => {
    const off = offers[offerIdx]; const v = off.variants[varIdx];
    setGenning(`${offerIdx}:${varIdx}`);
    try {
      const r = await fetch("/api/variant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment: off.segment, tone: v.tone || "warm", context: `Segment: ${off.segment}` }),
      });
      const g = await r.json();
      if (g && !g.error) {
        setOffers((prev) => prev.map((o, i) => i !== offerIdx ? o : {
          ...o, variants: o.variants.map((x, j) => j !== varIdx ? x : { ...x, subject: g.subject ?? x.subject, body: g.body ?? x.body, ctaText: g.ctaText ?? x.ctaText }),
        }));
      }
    } catch { /* surface nothing fatal; user can retry */ }
    setGenning(null);
  };

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.t3, margin: "0 0 8px" }}>Edit any field; add/remove A/B variants and offers. Type <b>@</b> in a subject or body to insert a personalization attribute as <code>{"{{attribute}}"}</code>.</p>
      {offers.map((off, i) => {
        const upd = (patch: Partial<Offer>) => setOffer(i, { ...off, ...patch });
        const updVar = (k: number, v: Variant) => upd({ variants: off.variants.map((x, j) => (j === k ? v : x)) });
        const delVar = (k: number) => upd({ variants: off.variants.filter((_, j) => j !== k) });
        const addVar = () => upd({ variants: [...off.variants, { id: mkId(), tone: "urgent", subject: "", body: "" }] });
        return (
          <div key={i} style={{ border: `1.5px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.t3 }}>Segment:</span>
              <input value={off.segment} onChange={(e) => upd({ segment: e.target.value })} style={{ ...inp, fontWeight: 600 }} />
              <button onClick={() => delOffer(i)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {off.variants.map((v, k) => (
                <div key={v.id || k} style={{ flex: 1, minWidth: 240, background: "#f9f8f4", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>{String.fromCharCode(65 + k)}</span>
                    <input value={v.tone} onChange={(e) => updVar(k, { ...v, tone: e.target.value })} placeholder="tone" style={{ ...inp, fontSize: 11.5 }} />
                    <button onClick={() => genVariant(i, k)} disabled={genning === `${i}:${k}`} title="Generate copy for this variant from its tone"
                      style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, border: 0, background: C.purple, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {genning === `${i}:${k}` ? "…" : "Generate"}
                    </button>
                    <button onClick={() => setPreviewVar(v)} title="Preview this variant as email/SMS with AI QA"
                      style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, border: `1px solid ${C.blue}`, background: "#fff", color: C.blue, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Preview
                    </button>
                    <button onClick={() => delVar(k)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <MentionField value={v.subject} onChange={(nv) => updVar(k, { ...v, subject: nv })} attributes={attributes} placeholder="subject (type @ for attributes)" style={{ fontWeight: 600 }} />
                  </div>
                  <MentionField value={v.body} onChange={(nv) => updVar(k, { ...v, body: nv })} attributes={attributes} textarea placeholder="body (type @ for attributes)" style={{ minHeight: 56, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input value={v.ctaText ?? ""} onChange={(e) => updVar(k, { ...v, ctaText: e.target.value })} placeholder="CTA text" style={{ ...inp, flex: 1, fontSize: 11.5 }} />
                    <input value={v.ctaLink ?? ""} onChange={(e) => updVar(k, { ...v, ctaLink: e.target.value })} placeholder="CTA link (URL)" style={{ ...inp, flex: 2, fontSize: 11.5 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                    <input value={v.imageUrl ?? ""} onChange={(e) => updVar(k, { ...v, imageUrl: e.target.value })} placeholder="image URL" style={{ ...inp, flex: 1, fontSize: 11.5 }} />
                    {v.imageUrl ? <img src={v.imageUrl} alt="" style={{ width: 34, height: 34, borderRadius: 4, objectFit: "cover" }} onError={(e) => ((e.currentTarget.style.display = "none"))} /> : null}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addVar} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 14, border: `1px solid ${C.line}`, background: "#eeedfe", color: C.purple, cursor: "pointer", marginTop: 8 }}>+ add variant</button>
          </div>
        );
      })}
      <button onClick={addOffer} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer" }}>+ Add offer</button>
      {previewVar && <PreviewModal variant={previewVar} onClose={() => setPreviewVar(null)} />}
    </div>
  );
}
