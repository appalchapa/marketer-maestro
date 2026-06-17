import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } from "docx";
import type { Session } from "@core/domain/session/session.types";

// Step 8: assemble all approved stages into a formatted Word document.
// Order mirrors the pipeline: Strategy, Signals, Segments, Content, Flows, Attribution.
export async function assembleBrief(session: Session): Promise<Buffer> {
  const o = session.outputs;
  const children: (Paragraph | Table)[] = [];

  const h = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
  const p = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 80 } });
  const bold = (t: string) => new Paragraph({ children: [new TextRun({ text: t, bold: true })] });
  const bullet = (t: string, level = 0) => new Paragraph({ text: t, bullet: { level } });

  // Variant lookup so flow A/B steps can resolve to real content (declared up front).
  const variantById: Record<string, { tone: string; subject: string; segment: string }> = {};
  if (o.content) o.content.offers.forEach((off) => off.variants.forEach((v: any) => { if (v.id) variantById[v.id] = { tone: v.tone, subject: v.subject, segment: off.segment }; }));

  children.push(new Paragraph({ text: "Marketing Strategy Brief", heading: HeadingLevel.TITLE }));
  children.push(p(`Prepared for: ${session.username}`));
  children.push(p(`Industry: ${session.vertical}`));
  children.push(p(`Goal: ${session.goalText}`));
  if (session.intent) children.push(p(`Objective: ${session.intent.restated}`));

  if (o.strategy) {
    children.push(h("Strategy"));
    children.push(p(o.strategy.summary));
    o.strategy.pillars.forEach((pl) => children.push(bullet(`${pl.title} — ${pl.rationale}`)));
    children.push(p(`Recommended channels: ${o.strategy.recommendedChannels.join(", ")}`));
  }
  if (o.signals) {
    children.push(h("Key signals"));
    o.signals.signals.forEach((s) => children.push(bullet(`${s.name} — ${s.rationale}`)));
  }
  if (o.segments) {
    children.push(h("Audience segments"));
    o.segments.segments.forEach((seg) => {
      children.push(bold(seg.name));
      children.push(p(seg.description));
      children.push(p(`Rule: ${seg.conditions.map((c) => `${c.attribute} ${c.operator} ${c.value}`).join(`  ${seg.match}  `)}`));
    });
  }
  if (o.content) {
    children.push(h("Content offers (A/B)"));
    o.content.offers.forEach((off) => {
      children.push(bold(`Segment: ${off.segment}`));
      off.variants.forEach((v, i) => children.push(p(`${String.fromCharCode(65 + i)} [${v.tone}] ${v.subject} — ${v.body}`)));
    });
  }
  if (o.flows) {
    children.push(h("Campaign flows"));
    o.flows.flows.forEach((f) => {
      children.push(bold(`${f.name} (${f.direction}, audience: ${f.audience})`));
      f.steps.forEach((st: any) => {
        children.push(bullet(`Day ${st.day} · ${st.channel} · ${st.action}`));
        if (Array.isArray(st.abTest) && st.abTest.length) {
          st.abTest.forEach((ab: any) => {
            const v = variantById[ab.variantId];
            children.push(bullet(`A/B ${ab.percent}% → ${v ? `${v.tone}: ${v.subject}` : "(removed variant)"}`, 1));
          });
        }
      });
    });
  }
  if (o.attribution) {
    children.push(h("Attribution parameters"));
    const rows = [
      new TableRow({ children: ["Key", "Value", "Purpose"].map((t) => new TableCell({ children: [bold(t)] })) }),
      ...o.attribution.params.map((pm) => new TableRow({ children: [pm.key, pm.value, pm.purpose].map((t) => new TableCell({ children: [new Paragraph(t)] })) })),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
