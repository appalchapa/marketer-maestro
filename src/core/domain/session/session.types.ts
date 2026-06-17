import type { GoalIntent } from "../goal/goal.schema";
import type { Strategy } from "../strategy/strategy.schema";
import type { Signals } from "../signals/signals.schema";
import type { Segments } from "../segments/segments.schema";
import type { Flows } from "../flows/flows.schema";
import type { Content } from "../content/content.schema";
import type { Attribution } from "../attribution/attribution.schema";
import type { ModelCallEvent } from "@core/observability/optimization-event.types";

export interface AuditEntry { at: number; action: string; detail?: string; }

// Per-stage efficacy signal: explicit thumb + behavioural (edited?, #revisions).
export interface StageRating { thumb?: "up" | "down"; edited: boolean; revisions: number; }

// Each gated stage's output, accumulated as the marketer approves through them.
export interface StageOutputs {
  strategy?: Strategy;
  signals?: Signals;
  segments?: Segments;
  flows?: Flows;
  content?: Content;
  attribution?: Attribution;
}

export interface Session {
  id: string;
  username: string;
  createdAt: number;
  updatedAt: number;
  goalText: string;
  vertical: string;
  attributes: string[];   // customer attribute NAMES provided by the marketer
  intent?: GoalIntent;
  stageIndex: number;             // pointer into STAGES (0..n-1)
  awaitingApproval: boolean;      // true once a stage is generated, until approved
  done: boolean;                  // all stages approved
  outputs: StageOutputs;
  feedbackHistory: Record<string, string[]>;
  drafts: Record<string, unknown>;          // the AI's original draft per stage (to detect edits)
  ratings: Record<string, StageRating>;     // efficacy signal per stage
  audit: AuditEntry[];
  events: ModelCallEvent[];
}
