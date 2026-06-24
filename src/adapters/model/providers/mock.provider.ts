import type { ModelProvider, ModelRequest, ModelResponse } from "@core/ports/model-provider.port";

// Deterministic fake provider — no key, no network. Returns coherent JSON per
// component so the entire 8-stage flow works offline for the demo.
export class MockProvider implements ModelProvider {
  readonly name = "mock";
  readonly label = "Mock (offline)";

  async generate(req: ModelRequest): Promise<ModelResponse> {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 60);
      req.signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); });
    });
    const text = req.json ? this.jsonFor(req) : `Mock response for "${req.component}".`;
    return {
      text, model: "mock-1",
      tokensIn: Math.ceil((req.system ?? "").length / 4) + Math.ceil(req.prompt.length / 4),
      tokensOut: Math.ceil(text.length / 4),
    };
  }

  private attrsFrom(prompt: string): string[] {
    const m = prompt.match(/use ONLY these\):\s*([^\n]+)/i);
    if (!m) return [];
    return m[1].split(",").map((x) => x.trim()).filter(Boolean);
  }

  private jsonFor(req: ModelRequest): string {
    const attrs = this.attrsFrom(req.prompt);
    switch (req.component) {
      case "intent":
        return JSON.stringify({ goalType: "reduce churn", kpi: "churn rate", magnitude: "10%", timeframe: "2 months", focus: "retention", restated: "Cut customer churn by 10% within two months." });
      case "strategy":
        return JSON.stringify({
          summary: "A retention-first plan targeting at-risk, low-engagement customers with timely win-back offers.",
          pillars: [
            { title: "Identify flight-risk customers", rationale: "Low usage + month-to-month contracts churn most." },
            { title: "Proactive win-back offers", rationale: "Offers near contract end measurably reduce churn." },
            { title: "Reduce friction for frustrated users", rationale: "High support-ticket users need a faster touch." },
          ],
          recommendedChannels: ["Email", "SMS", "Push"],
        });
      case "signals": {
        const src = attrs.length ? attrs.slice(0, 4) : ["last_login_days", "contract_type", "support_tickets_90d", "tenure_months"];
        return JSON.stringify({ signals: src.map((name) => ({ name, rationale: `${name} is a useful signal for this goal.` })) });
      }
      case "segments": {
        const a = attrs.length ? attrs : ["last_login_days", "contract_type", "support_tickets_90d", "tenure_months"];
        const c = (i: number, op: string, v: string) => ({ attribute: a[i % a.length], operator: op, value: v });
        return JSON.stringify({ segments: [
          { name: "Primary target group", description: "Highest-priority customers for this goal.", match: "AND", conditions: [ c(0, ">", "30"), c(1, "=", "target") ] },
          { name: "Secondary group", description: "Additional reachable customers.", match: "OR", conditions: [ c(2, ">=", "3"), c(3, ">", "0") ] },
        ]});
      }
      case "flows":
        return JSON.stringify({ flows: [
          { name: "Silent risk win-back", audience: "Silent flight risks", direction: "outbound", steps: [
            { day: 1, channel: "Email", action: "Send personalised win-back offer" },
            { day: 4, channel: "SMS", action: "Follow up if email unopened" },
            { day: 7, channel: "Push", action: "Final reminder before offer expires" } ] },
          { name: "Frustration recovery", audience: "Frustrated customers", direction: "outbound", steps: [
            { day: 1, channel: "SMS", action: "Personal apology + priority support link" },
            { day: 3, channel: "Email", action: "Goodwill credit offer" } ] },
        ]});
      case "content":
        return JSON.stringify({ offers: [
          { segment: "Silent flight risks", variants: [
            { tone: "warm", subject: "We'd hate to see you go", body: "Here's 20% off an annual plan to stay with us." },
            { tone: "urgent", subject: "Your discount expires Friday", body: "Lock in 20% off now before it's gone." } ] },
          { segment: "Frustrated customers", variants: [
            { tone: "apologetic", subject: "Let's make this right", body: "We're sorry — here's priority support and a credit." },
            { tone: "reassuring", subject: "We're on it", body: "Your issue matters; here's how we're helping." } ] },
        ]});
      case "variant": {
        const toneMatch = /Tone:\s*([^\n]+)/.exec(req.prompt);
        const tone = (toneMatch ? toneMatch[1] : "warm").trim();
        return JSON.stringify({
          subject: `A ${tone} note just for you`,
          body: `Here's a ${tone} message tailored to this segment, with a clear next step.`,
          ctaText: "Learn More",
        });
      }
      case "attribution":
        return JSON.stringify({ params: [
          { key: "utm_source", value: "maestro", purpose: "Identifies the campaign tool as the traffic source." },
          { key: "utm_medium", value: "email", purpose: "Channel the click came from." },
          { key: "utm_campaign", value: "churn_winback_q3", purpose: "Ties clicks to this specific campaign." },
        ]});
      case "plan":
        return JSON.stringify({ tasks: [
          { name: "Implement audience segments in CDP", owner: "Marketing Ops", durationDays: 3, deps: [] },
          { name: "Write & approve A/B content", owner: "Content", durationDays: 4, deps: [] },
          { name: "Configure attribution / UTM tracking", owner: "Analytics", durationDays: 2, deps: [] },
          { name: "Build campaign flows in platform", owner: "Marketing Ops", durationDays: 5, deps: ["Implement audience segments in CDP", "Write & approve A/B content"] },
          { name: "QA flows & tracking", owner: "QA", durationDays: 2, deps: ["Build campaign flows in platform", "Configure attribution / UTM tracking"] },
          { name: "Launch & monitor", owner: "Marketing Ops", durationDays: 3, deps: ["QA flows & tracking"] },
        ]});
      default:
        return JSON.stringify({ note: "mock", component: req.component });
    }
  }
}
