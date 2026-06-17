import { promises as fs } from "node:fs";
import path from "node:path";
import type { UserStore } from "@core/ports/user-store.port";
import type { Session } from "@core/domain/session/session.types";

// Stores each session as one JSON file under .data/sessions/.
// Survives server restarts, which is what makes "history across visits" real.
export class FileUserStore implements UserStore {
  private dir: string;
  constructor(baseDir = path.join(process.cwd(), ".data", "sessions")) {
    this.dir = baseDir;
  }

  private async ensureDir() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async save(session: Session): Promise<void> {
    await this.ensureDir();
    const file = path.join(this.dir, `${session.id}.json`);
    await fs.writeFile(file, JSON.stringify(session, null, 2), "utf8");
  }

  async get(id: string): Promise<Session | null> {
    try {
      const raw = await fs.readFile(path.join(this.dir, `${id}.json`), "utf8");
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  async listByUser(username: string): Promise<Session[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.dir).catch(() => [] as string[]);
    const sessions: Session[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(this.dir, f), "utf8");
        const s = JSON.parse(raw) as Session;
        if (s.username === username) sessions.push(s);
      } catch { /* skip unreadable */ }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async listAll(): Promise<Session[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.dir).catch(() => [] as string[]);
    const sessions: Session[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try { sessions.push(JSON.parse(await fs.readFile(path.join(this.dir, f), "utf8")) as Session); } catch {}
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
