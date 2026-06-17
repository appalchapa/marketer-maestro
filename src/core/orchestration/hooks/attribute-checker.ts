import type { Signals } from "@core/domain/signals/signals.schema";
import type { Segments } from "@core/domain/segments/segments.schema";

// Post-generation hook: drops any attribute the model used that the marketer did
// NOT provide, so segments/signals stay grounded in the real attribute list.
// If no attributes were provided, nothing is constrained.
export function constrainSignals(out: Signals, allowed: string[]): { out: Signals; dropped: number } {
  if (!allowed.length) return { out, dropped: 0 };
  const set = new Set(allowed.map((a) => a.toLowerCase().trim()));
  const before = out.signals.length;
  let signals = out.signals.filter((s) => set.has(s.name.toLowerCase().trim()));
  if (signals.length === 0) signals = [{ name: allowed[0], rationale: "Primary available signal for this goal." }];
  return { out: { signals }, dropped: before - signals.length };
}

export function constrainSegments(out: Segments, allowed: string[]): { out: Segments; dropped: number } {
  if (!allowed.length) return { out, dropped: 0 };
  const set = new Set(allowed.map((a) => a.toLowerCase().trim()));
  let dropped = 0;
  const segments = out.segments.map((seg) => {
    const conditions = seg.conditions.filter((c) => {
      const ok = set.has(c.attribute.toLowerCase().trim());
      if (!ok) dropped++;
      return ok;
    });
    return { ...seg, conditions: conditions.length ? conditions : [{ attribute: allowed[0], operator: "=", value: "any" }] };
  });
  return { out: { segments }, dropped };
}
