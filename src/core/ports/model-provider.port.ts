export interface ModelRequest {
  readonly sessionId: string;
  readonly component: string;
  readonly system?: string;
  readonly prompt: string;
  readonly promptVersion?: string;
  readonly difficulty?: "simple" | "hard";
  readonly temperature?: number;
  readonly json?: boolean;
  readonly signal?: AbortSignal;   // lets the timeout wrapper abort a slow call
}
export interface ModelResponse {
  readonly text: string;
  readonly model: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
}
export interface ModelProvider {
  readonly name: string;
  readonly label?: string;  // human-friendly name for status (e.g. 'Gemini')
  generate(req: ModelRequest): Promise<ModelResponse>;
}
