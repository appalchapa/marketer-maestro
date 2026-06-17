// A tiny Result type so the core can signal success/failure without throwing.
// Keeps error handling explicit and the domain free of try/catch noise.
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
