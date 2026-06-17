import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExampleStore, LearningExample } from "@core/ports/example-store.port";

// Stores approved results as JSON under .data/examples/. Foundation for Tier-1
// cross-session learning (retrieve similar approved examples into the prompt).
export class FileExampleStore implements ExampleStore {
  constructor(private dir = path.join(process.cwd(), ".data", "examples")) {}
  private async ensure() { await fs.mkdir(this.dir, { recursive: true }); }

  async add(e: LearningExample): Promise<void> {
    await this.ensure();
    await fs.writeFile(path.join(this.dir, `${e.id}.json`), JSON.stringify(e, null, 2), "utf8");
  }
  async list(stageKey: string, opts: { username?: string; limit?: number } = {}): Promise<LearningExample[]> {
    await this.ensure();
    const files = await fs.readdir(this.dir).catch(() => [] as string[]);
    const out: LearningExample[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const e = JSON.parse(await fs.readFile(path.join(this.dir, f), "utf8")) as LearningExample;
        if (e.stageKey !== stageKey) continue;
        if (opts.username && e.scope === "user" && e.username !== opts.username) continue;
        out.push(e);
      } catch { /* skip */ }
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return opts.limit ? out.slice(0, opts.limit) : out;
  }
}
