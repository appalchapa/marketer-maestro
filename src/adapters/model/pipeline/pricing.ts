// Rough public per-million-token prices (USD). Used to estimate call cost.
// Kept in one place so the Cost console and the cost-meter agree.
const PER_M = {
  "gemini-2.5-flash": { in: 0.075, out: 0.30 },
  "mock-1": { in: 0, out: 0 },
} as const;

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = (PER_M as Record<string, { in: number; out: number }>)[model] ?? { in: 0, out: 0 };
  return (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
}
