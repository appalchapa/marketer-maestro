// A captured approved result, used next round to teach future drafts (the flywheel).
export interface LearningExample {
  id: string;
  createdAt: number;
  scope: "user" | "global";
  username: string;
  stageKey: string;
  goal: string;
  vertical: string;
  attributes: string[];
  output: unknown;      // the approved stage output
}
export interface ExampleStore {
  add(e: LearningExample): Promise<void>;
  list(stageKey: string, opts?: { username?: string; limit?: number }): Promise<LearningExample[]>;
}
