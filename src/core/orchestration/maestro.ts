import type { ModelProvider } from "@core/ports/model-provider.port";
import type { UserStore } from "@core/ports/user-store.port";
import type { EventBus } from "@core/observability/event-bus.port";
import type { ModelCallEvent } from "@core/observability/optimization-event.types";
import type { Session, StageOutputs } from "@core/domain/session/session.types";
import { STAGES, type StageKey } from "./stages";
import { newId } from "@shared/id";
import { understandGoal } from "./steps/01-understand-goal.step";
import { proposeStrategy } from "./steps/02-propose-strategy.step";
import { mapSignals } from "./steps/03-map-signals.step";
import { buildSegments } from "./steps/04-build-segments.step";
import { designFlows } from "./steps/05-design-flows.step";
import { generateContent } from "./steps/06-generate-content.step";
import { buildAttribution } from "./steps/07-build-attribution.step";
import { buildPlan } from "./steps/08-build-plan.step";
import { constrainSignals, constrainSegments } from "./hooks/attribute-checker";
import { isMessageChannel } from "@core/domain/flows/flows.schema";
import { newId as mkId } from "@shared/id";
import type { ExampleStore } from "@core/ports/example-store.port";
import type { StageRating } from "@core/domain/session/session.types";

export class Maestro {
  constructor(private provider: ModelProvider, private store: UserStore, private bus: EventBus, private examples: ExampleStore) {}

  private async withCapture<T>(fn: () => Promise<T>): Promise<{ result: T; events: ModelCallEvent[] }> {
    const captured: ModelCallEvent[] = [];
    const unsub = this.bus.subscribe((e) => captured.push(e));
    try { return { result: await fn(), events: captured }; }
    finally { unsub(); }
  }

  // Build a compact context string from everything approved so far.
  private context(s: Session): string {
    const o = s.outputs;
    let c = `Industry: ${s.vertical}\nGoal: ${s.intent?.restated ?? s.goalText}`;
    if (s.attributes.length) c += `\nProvided attributes: ${s.attributes.join(", ")}`;
    if (o.strategy) c += `\nStrategy: ${o.strategy.summary}`;
    if (o.signals) c += `\nSignals: ${o.signals.signals.map((x) => x.name).join(", ")}`;
    if (o.segments) c += `\nSegments: ${o.segments.segments.map((x) => x.name).join(", ")}`;
    if (o.content) c += `\nContent offers: ${o.content.offers.map((x) => x.segment + " (" + x.variants.map((v) => v.tone).join("/") + ")").join("; ")}`;
    if (o.flows) c += `\nFlows: ${o.flows.flows.map((x) => x.name).join(", ")}`;
    if (o.attribution) c += `\nAttribution params: ${o.attribution.params.map((x) => x.key).join(", ")}`;
    return c;
  }

  // Ensure every content variant has a stable id (so flow steps can reference it).
  private normalizeContent(content: any) {
    if (!content?.offers) return content;
    for (const off of content.offers) for (const v of off.variants ?? []) if (!v.id) v.id = mkId("v");
    return content;
  }

  // Ensure plan task ids exist and enforce one level of hierarchy (parent must be top-level).
  private normalizePlan(plan: any) {
    if (!plan?.tasks) return plan;
    for (const t of plan.tasks) if (!t.id) t.id = mkId("task");
    const ids = new Set(plan.tasks.map((t: any) => t.id));
    const parentOf = new Map(plan.tasks.map((t: any) => [t.id, t.parentId]));
    for (const t of plan.tasks) {
      if (t.parentId && !ids.has(t.parentId)) t.parentId = undefined;       // missing parent
      else if (t.parentId && parentOf.get(t.parentId)) t.parentId = undefined; // grandparent -> one level
      t.deps = (t.deps || []).filter((d: string) => ids.has(d) && d !== t.id);
    }
    return plan;
  }

  // Validate A/B splits on message steps total exactly 100% (enforced on approve).
  private validateFlowsAb(flows: any) {
    for (const f of flows?.flows ?? []) {
      for (const st of f.steps ?? []) {
        if (isMessageChannel(st.channel) && Array.isArray(st.abTest) && st.abTest.length) {
          const total = st.abTest.reduce((a: number, x: any) => a + (Number(x.percent) || 0), 0);
          if (Math.round(total) !== 100) {
            throw new Error(`A/B split on "${f.name}" (Day ${st.day} ${st.channel}) must total 100% — currently ${total}%.`);
          }
        }
      }
    }
  }

  // Generate the output for a given stage key (with optional revision feedback).
  private async generateStage(s: Session, key: StageKey, feedback?: string) {
    const ctx = this.context(s);
    const sid = s.id;
    const p = this.provider;
    switch (key) {
      case "strategy":    return { strategy: await proposeStrategy(p, sid, s.intent!, s.vertical, feedback) };
      case "signals": {
        const raw = await mapSignals(p, sid, ctx, s.attributes, feedback);
        return { signals: constrainSignals(raw, s.attributes).out };
      }
      case "segments": {
        const raw = await buildSegments(p, sid, ctx, s.attributes, feedback);
        return { segments: constrainSegments(raw, s.attributes).out };
      }
      case "flows":       return { flows: await designFlows(p, sid, ctx, feedback) };
      case "content":     return { content: this.normalizeContent(await generateContent(p, sid, ctx, feedback)) };
      case "attribution": return { attribution: await buildAttribution(p, sid, ctx, feedback) };
      case "plan":        return { plan: this.normalizePlan(await buildPlan(p, sid, ctx, feedback)) };
    }
  }

  newId(): string { return newId("ses"); }

  async startSession(id: string, username: string, goalText: string, vertical: string, attributes: string[]): Promise<Session> {
    const now = Date.now();
    const s: Session = {
      id, username, createdAt: now, updatedAt: now, goalText, vertical, attributes,
      stageIndex: 0, awaitingApproval: true, done: false,
      outputs: {}, feedbackHistory: {}, drafts: {}, ratings: {}, audit: [{ at: now, action: "start", detail: goalText }], events: [],
    };
    const { result, events } = await this.withCapture(async () => {
      const intent = await understandGoal(this.provider, id, goalText, vertical);
      s.intent = intent;
      return this.generateStage(s, STAGES[0].key);
    });
    s.outputs = { ...s.outputs, ...result } as StageOutputs;
    s.drafts[STAGES[0].key] = (result as any)[STAGES[0].key];
    s.events.push(...events);
    await this.store.save(s);
    return s;
  }

  // Approve the current stage (optionally with marketer edits), then generate the next.
  async approve(sessionId: string, edited?: Partial<StageOutputs>, thumb?: "up" | "down"): Promise<Session | null> {
    const s = await this.store.get(sessionId);
    if (!s) return null;
    const key = STAGES[s.stageIndex].key;
    if (edited && edited[key]) {
      let val: any = edited[key];
      if (key === "content") val = this.normalizeContent(val);
      if (key === "flows") this.validateFlowsAb(val);   // enforce 100% before saving
      if (key === "plan") val = this.normalizePlan(val);
      s.outputs = { ...s.outputs, [key]: val } as StageOutputs;
    }

    // Efficacy signal: did the marketer hand-edit the AI draft? how many revisions?
    const wasEdited = JSON.stringify(s.drafts[key] ?? null) !== JSON.stringify((s.outputs as any)[key] ?? null);
    const rating: StageRating = { thumb, edited: wasEdited, revisions: (s.feedbackHistory[key] ?? []).length };
    s.ratings[key] = rating;
    s.audit.push({ at: Date.now(), action: `approve:${key}`, detail: `thumb=${thumb ?? "-"} edited=${wasEdited} revisions=${rating.revisions}` });

    // Flywheel: capture the approved output as a future learning example.
    try {
      await this.examples.add({
        id: newId("ex"), createdAt: Date.now(), scope: "global", username: s.username,
        stageKey: key, goal: s.goalText, vertical: s.vertical, attributes: s.attributes,
        output: (s.outputs as any)[key],
      });
    } catch { /* non-fatal */ }

    if (s.stageIndex >= STAGES.length - 1) {
      s.done = true; s.awaitingApproval = false; s.updatedAt = Date.now();
      await this.store.save(s);
      return s;
    }
    s.stageIndex += 1;
    const { result, events } = await this.withCapture(() => this.generateStage(s, STAGES[s.stageIndex].key));
    s.outputs = { ...s.outputs, ...result } as StageOutputs;
    s.drafts[STAGES[s.stageIndex].key] = (result as any)[STAGES[s.stageIndex].key];
    s.events.push(...events);
    s.awaitingApproval = true; s.updatedAt = Date.now();
    await this.store.save(s);
    return s;
  }

  // Revise the current stage with feedback (regenerates just this stage).
  async revise(sessionId: string, feedback: string): Promise<Session | null> {
    const s = await this.store.get(sessionId);
    if (!s) return null;
    const key = STAGES[s.stageIndex].key;
    const { result, events } = await this.withCapture(() => this.generateStage(s, key, feedback));
    s.outputs = { ...s.outputs, ...result } as StageOutputs;
    s.events.push(...events);
    (s.feedbackHistory[key] ??= []).push(feedback);
    s.audit.push({ at: Date.now(), action: `revise:${key}`, detail: feedback });
    s.updatedAt = Date.now();
    await this.store.save(s);
    return s;
  }
}
