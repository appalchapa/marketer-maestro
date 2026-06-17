import { Redis } from "@upstash/redis";
import type { UserStore } from "@core/ports/user-store.port";
import type { Session } from "@core/domain/session/session.types";

// Serverless-friendly persistence (Vercel/AWS) using Upstash Redis over REST.
// Same UserStore interface as the file adapter — selected by config at the root.
// Sessions are stored at session:{id}; index sets make listing fast without scans.
export class UpstashUserStore implements UserStore {
  private redis: Redis;
  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  private key(id: string) { return `session:${id}`; }
  private userSet(username: string) { return `sessions:user:${username}`; }
  private allSet() { return "sessions:index"; }

  async save(session: Session): Promise<void> {
    await this.redis.set(this.key(session.id), session);          // client serializes JSON
    await this.redis.sadd(this.allSet(), session.id);
    await this.redis.sadd(this.userSet(session.username), session.id);
  }

  async get(id: string): Promise<Session | null> {
    return (await this.redis.get<Session>(this.key(id))) ?? null;  // client parses JSON
  }

  private async byIds(ids: string[]): Promise<Session[]> {
    if (!ids.length) return [];
    const keys = ids.map((id) => this.key(id));
    const rows = await this.redis.mget<Session[]>(...keys);
    return (rows.filter(Boolean) as Session[]).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async listByUser(username: string): Promise<Session[]> {
    const ids = await this.redis.smembers(this.userSet(username));
    return this.byIds(ids as string[]);
  }

  async listAll(): Promise<Session[]> {
    const ids = await this.redis.smembers(this.allSet());
    return this.byIds(ids as string[]);
  }
}
