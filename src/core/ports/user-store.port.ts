import type { Session } from "@core/domain/session/session.types";

// The interface for per-user persistence. The local adapter writes JSON files;
// a live adapter would use Supabase/Postgres — same interface, swap at the root.
export interface UserStore {
  save(session: Session): Promise<void>;
  get(id: string): Promise<Session | null>;
  listByUser(username: string): Promise<Session[]>;
}
