"use client";
import { useState, useEffect } from "react";

const mkId = () => "v_" + Math.random().toString(16).slice(2, 10);

type Variant = { id?: string; tone: string; subject: string; body: string };
type Offer = { segment: string; variants: Variant[] };
const C = { purple: "#534ab7", amber: "#ba7517", t3: "#8a8980", line: "rgba(0,0,0,.12)" };
const inp: React.CSSProperties = { fontSize: 12.5, padding: "4px 7px", borderRadius: 6, border: `1px solid ${C.line}`, width: "100%", boxSizing: "border-box" };

export default function ContentEditor({ initial, onChange }: { initial: Offer[]; onChange: (o: Offer[]) => void }) {
  const [offers, setOffers] = useState<Offer[]>(initial);
  useEffect(() => {
    // ensure every variant has a stable id so flow steps can reference it
    setOffers(initial.map((o) => ({ ...o, variants: o.variants.map((v) => ({ ...v, id: (v as any).id || mkId() })) })));
  }, [initial]);
  useEffect(() => { onChange(offers); }, [offers]);
  const setOffer = (i: number, o: Offer) => setOffers((p) => p.map((x, j) => (j === i ? o : x)));
  const delOffer = (i: number) => setOffers((p) => p.filter((_, j) => j !== i));
  const addOffer = () => setOffers((p) => [...p, { segment: "New segment", variants: [{ tone: "warm", subject: "", body: "" }] }]);

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.t3, margin: "0 0 8px" }}>Edit any field; add/remove A/B variants and offers.</p>
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
                <div key={k} style={{ flex: 1, minWidth: 200, background: "#f9f8f4", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>{String.fromCharCode(65 + k)}</span>
                    <input value={v.tone} onChange={(e) => updVar(k, { ...v, tone: e.target.value })} placeholder="tone" style={{ ...inp, fontSize: 11.5 }} />
                    <button onClick={() => delVar(k)} style={{ border: 0, background: "transparent", color: C.t3, cursor: "pointer" }}>×</button>
                  </div>
                  <input value={v.subject} onChange={(e) => updVar(k, { ...v, subject: e.target.value })} placeholder="subject" style={{ ...inp, fontWeight: 600, marginBottom: 4 }} />
                  <textarea value={v.body} onChange={(e) => updVar(k, { ...v, body: e.target.value })} placeholder="body" style={{ ...inp, minHeight: 48, resize: "vertical" }} />
                </div>
              ))}
            </div>
            <button onClick={addVar} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 14, border: `1px solid ${C.line}`, background: "#eeedfe", color: C.purple, cursor: "pointer", marginTop: 8 }}>+ add variant</button>
          </div>
        );
      })}
      <button onClick={addOffer} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 18, border: `1px dashed ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer" }}>+ Add offer</button>
    </div>
  );
}
