"use client";
import { useState, useEffect } from "react";

type Variant = { id?: string; tone: string; subject: string; body: string; ctaText?: string; ctaLink?: string; imageUrl?: string };

const C = { surface: "#fff", line: "rgba(0,0,0,.1)", t2: "#5f5e5a", t3: "#8a8980",
  purple: "#534ab7", green: "#0f6e56", amber: "#ba7517", red: "#a32d2d", blue: "#185fa5" };

const EMAIL_CLIENTS = ["Gmail", "Outlook", "Apple Mail"] as const;
const SMS_DEVICES = ["iPhone 17", "iPhone 16", "iPhone 15", "Galaxy S24", "Galaxy S23"] as const;
type EmailClient = (typeof EMAIL_CLIENTS)[number];
type SmsDevice = (typeof SMS_DEVICES)[number];

const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" };
const pill = (on: boolean): React.CSSProperties => ({ padding: "4px 11px", borderRadius: 16, fontSize: 12, cursor: "pointer",
  border: `1px solid ${on ? C.purple : "rgba(0,0,0,.18)"}`, background: on ? "#eeedfe" : "#fff", color: on ? C.purple : C.t2, fontWeight: on ? 600 : 400 });

type Brand = { name: string; primary: string; accent: string };
const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='240'><rect width='600' height='240' fill='#e9e7df'/><text x='300' y='126' font-family='Arial' font-size='18' fill='#9a988f' text-anchor='middle'>Your hero image</text></svg>`
  );

// ---------- Rich marketing email ----------
function EmailRender({ client, v, brand, width }: { client: EmailClient; v: Variant; brand: Brand; width: number }) {
  const img = v.imageUrl || PLACEHOLDER_IMG;
  const subject = v.subject || "(no subject)";
  const clientHeader =
    client === "Gmail" ? (
      <div style={{ borderBottom: `1px solid ${C.line}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: brand.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{brand.name[0] || "A"}</div>
        <div style={{ fontSize: 12.5 }}><b>{brand.name}</b> <span style={{ color: "#5f6368" }}>to me</span></div>
      </div>
    ) : client === "Outlook" ? (
      <div style={{ borderBottom: `1px solid ${C.line}`, padding: "10px 14px", background: "#faf9f8", fontSize: 12.5, color: "#323130" }}>
        <b>{brand.name}</b> &lt;hello@{brand.name.toLowerCase().replace(/\s/g, "")}.com&gt;
      </div>
    ) : (
      <div style={{ borderBottom: `1px solid ${C.line}`, padding: "8px 14px", textAlign: "center", fontSize: 12, color: C.t3 }}>{brand.name} · {subject}</div>
    );

  return (
    <div style={{ width, maxWidth: "100%", margin: "0 auto", border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.08)" }}>
      {clientHeader}
      {/* brand top bar */}
      <div style={{ height: 6, background: brand.primary }} />
      {/* logo header */}
      <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid #f0eee8` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: brand.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>{brand.name[0] || "A"}</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1c1c1e", letterSpacing: "-.01em" }}>{brand.name}</span>
        </div>
        <span style={{ fontSize: 11, color: C.t3 }}>View in browser</span>
      </div>
      {/* hero */}
      <img src={img} alt="" style={{ width: "100%", display: "block", maxHeight: 240, objectFit: "cover" }} onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)} />
      {/* body */}
      <div style={{ padding: "26px 24px 8px" }}>
        <h1 style={{ fontSize: 23, lineHeight: 1.2, margin: "0 0 6px", color: "#1c1c1e", fontWeight: 800, letterSpacing: "-.02em" }}>{subject}</h1>
        <div style={{ width: 46, height: 3, background: brand.accent, borderRadius: 2, margin: "10px 0 16px" }} />
        <div style={{ fontSize: 15, lineHeight: 1.6, color: "#3a3a3c", whiteSpace: "pre-wrap" }}>{v.body || "(empty body)"}</div>
        {v.ctaText ? (
          <div style={{ margin: "24px 0 8px" }}>
            <a href={v.ctaLink || "#"} style={{ display: "inline-block", background: brand.primary, color: "#fff", padding: "13px 30px", borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 2px 0 ${brand.accent}` }}>{v.ctaText} →</a>
          </div>
        ) : null}
      </div>
      {/* footer nav */}
      <div style={{ padding: "18px 24px", marginTop: 14, background: "#f7f6f2", borderTop: `1px solid #ece9e1` }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          {["Shop", "Account", "Support", "Offers"].map((x) => <span key={x} style={{ fontSize: 12.5, color: brand.primary, fontWeight: 600 }}>{x}</span>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["f", "X", "in", "ig"].map((s) => <span key={s} style={{ width: 26, height: 26, borderRadius: "50%", background: brand.primary, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{s}</span>)}
        </div>
        {/* legal footer */}
        <p style={{ fontSize: 10.5, lineHeight: 1.5, color: "#9a988f", margin: 0 }}>
          {brand.name}, 123 Market Street, Suite 400, Dallas, TX 75201. You received this email because you opted in to {brand.name} communications.
          <br /><span style={{ textDecoration: "underline" }}>Unsubscribe</span> · <span style={{ textDecoration: "underline" }}>Manage preferences</span> · <span style={{ textDecoration: "underline" }}>Privacy policy</span>
          <br />© {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// ---------- SMS device ----------
function SmsRender({ device, v, brand }: { device: SmsDevice; v: Variant; brand: Brand }) {
  const isApple = device.startsWith("iPhone");
  const bubbleBg = isApple ? "#0b93f6" : "#e8eaed";
  const bubbleColor = isApple ? "#fff" : "#202124";
  const text = `${brand.name}: ${v.body || ""}${v.ctaLink ? `\n${v.ctaLink}` : ""}`.trim().slice(0, 320);
  return (
    <div style={{ width: 290, height: 580, margin: "0 auto", background: "#000", borderRadius: 42, padding: 10, boxShadow: "0 8px 30px rgba(0,0,0,.25)", position: "relative" }}>
      <div style={{ background: isApple ? "#f2f2f7" : "#fafafa", borderRadius: 32, height: "100%", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
        {isApple
          ? <div style={{ width: 110, height: 24, background: "#000", borderRadius: 13, position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 2 }} />
          : <div style={{ width: 8, height: 8, background: "#000", borderRadius: "50%", position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 2 }} />}
        <div style={{ paddingTop: 40, paddingBottom: 9, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,.08)", background: isApple ? "#f7f7fa" : "#fff" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: brand.primary, margin: "0 auto 3px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", fontWeight: 700 }}>{brand.name[0] || "A"}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1c1c1e" }}>{brand.name}</div>
          <div style={{ fontSize: 10, color: C.t3 }}>{device}</div>
        </div>
        <div style={{ flex: 1, padding: 13, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ alignSelf: "flex-start", maxWidth: "84%", background: bubbleBg, color: bubbleColor, padding: "9px 13px", borderRadius: 18, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text || "(empty message)"}</div>
          <div style={{ fontSize: 9.5, color: C.t3, marginTop: 4 }}>{isApple ? "SMS/MMS" : "Text message"}</div>
        </div>
      </div>
    </div>
  );
}

function Bar({ score }: { score: number }) {
  const col = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  return (
    <div style={{ height: 7, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: "100%", background: col }} />
    </div>
  );
}

export default function PreviewModal({ variant, onClose }: { variant: Variant; onClose: () => void }) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [client, setClient] = useState<EmailClient>("Gmail");
  const [device, setDevice] = useState<SmsDevice>("iPhone 17");
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [brand, setBrand] = useState<Brand>({ name: "Acme", primary: "#534ab7", accent: "#ba7517" });
  const [qa, setQa] = useState<null | { scores: Record<string, number>; overall: number; flags: string[] }>(null);
  const [qaLoading, setQaLoading] = useState(false);

  const runQa = async () => {
    setQaLoading(true); setQa(null);
    try {
      const r = await fetch("/api/qa", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: variant.subject, body: variant.body, ctaText: variant.ctaText }) });
      const d = await r.json();
      if (d && !d.error) setQa(d);
    } catch { /* non-fatal */ }
    setQaLoading(false);
  };
  useEffect(() => { runQa(); /* auto-run on open */ }, []); // eslint-disable-line

  const RUBRICS: [string, string][] = [["brand", "Brand voice"], ["spam", "Spam safety"], ["clarity", "Clarity"], ["cta", "CTA strength"], ["subject", "Subject line"]];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,18,30,.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fbfaf7", borderRadius: 16, width: "100%", maxWidth: 1040, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${C.line}` }}>
          <div><span style={{ fontWeight: 700, fontSize: 16 }}>Preview & QA</span> <span style={{ color: C.t3, fontSize: 13 }}>· {variant.tone} variant</span></div>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer", color: C.t3, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 16, padding: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* preview side */}
          <div style={{ flex: "1 1 460px", minWidth: 300 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>{(["email", "sms"] as const).map((ch) => <button key={ch} onClick={() => setChannel(ch)} style={pill(channel === ch)}>{ch === "email" ? "Email" : "SMS"}</button>)}</div>
              <div style={{ width: 1, height: 20, background: C.line }} />
              {channel === "email"
                ? <>
                    <div style={{ display: "flex", gap: 6 }}>{EMAIL_CLIENTS.map((c) => <button key={c} onClick={() => setClient(c)} style={pill(client === c)}>{c}</button>)}</div>
                    <div style={{ display: "flex", gap: 6 }}>{(["desktop", "mobile"] as const).map((w) => <button key={w} onClick={() => setWidth(w)} style={pill(width === w)}>{w}</button>)}</div>
                  </>
                : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{SMS_DEVICES.map((d) => <button key={d} onClick={() => setDevice(d)} style={pill(device === d)}>{d}</button>)}</div>}
            </div>

            {/* brand controls */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap", fontSize: 12, color: C.t2 }}>
              <span style={label}>Brand</span>
              <input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} style={{ width: 90, padding: "5px 8px", border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12.5 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 5 }}>Primary <input type="color" value={brand.primary} onChange={(e) => setBrand({ ...brand, primary: e.target.value })} style={{ width: 28, height: 24, border: 0, background: "none", cursor: "pointer" }} /></label>
              <label style={{ display: "flex", alignItems: "center", gap: 5 }}>Accent <input type="color" value={brand.accent} onChange={(e) => setBrand({ ...brand, accent: e.target.value })} style={{ width: 28, height: 24, border: 0, background: "none", cursor: "pointer" }} /></label>
            </div>

            <div style={{ background: "#efeee9", borderRadius: 10, padding: "22px 14px", display: "flex", justifyContent: "center" }}>
              {channel === "email" ? <EmailRender client={client} v={variant} brand={brand} width={width === "desktop" ? 600 : 360} /> : <SmsRender device={device} v={variant} brand={brand} />}
            </div>
            <p style={{ fontSize: 11, color: C.t3, textAlign: "center", margin: "8px 0 0" }}>Layout preview chrome — approximates framing, not a pixel-accurate deliverability test.</p>
          </div>

          {/* QA side */}
          <div style={{ flex: "0 0 280px", minWidth: 240, background: "#fff", borderRadius: 12, border: `1px solid ${C.line}`, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ ...label, margin: 0 }}>AI pre-send QA</p>
              <button onClick={runQa} disabled={qaLoading} style={{ ...pill(false), fontSize: 11 }}>{qaLoading ? "…" : "Re-run"}</button>
            </div>
            {qaLoading && <p style={{ fontSize: 13, color: C.t3, marginTop: 14 }}>Scoring…</p>}
            {qa && !qaLoading && (
              <>
                <div style={{ textAlign: "center", margin: "14px 0 6px" }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: qa.overall >= 80 ? C.green : qa.overall >= 60 ? C.amber : C.red, lineHeight: 1 }}>{qa.overall}</div>
                  <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: ".05em" }}>Overall</div>
                </div>
                {RUBRICS.map(([k, lbl]) => (
                  <div key={k} style={{ marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.t2, marginBottom: 3 }}><span>{lbl}</span><span style={{ fontWeight: 600 }}>{qa.scores[k] ?? 0}</span></div>
                    <Bar score={qa.scores[k] ?? 0} />
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>Flags</p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>{qa.flags.map((f, i) => <li key={i} style={{ fontSize: 12, color: C.t2, marginBottom: 4, lineHeight: 1.4 }}>{f}</li>)}</ul>
                </div>
                <p style={{ fontSize: 10, color: C.t3, marginTop: 12, lineHeight: 1.4 }}>AI rubric assessment — guidance, not a guarantee of deliverability.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
