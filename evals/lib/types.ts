import type { ToolPolicyConfig } from "../../src/security/toolPolicy.js";
import type { MockResponseValue } from "../../tests/helpers/transport.js";

export interface ToolCallRecord {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface GradeResult {
  pass: boolean;
  reason: string;
}

export type Grader = (calls: ToolCallRecord[], messages: LLMMessage[]) => GradeResult;

export interface Scenario {
  name: string;
  description: string;
  policy: ToolPolicyConfig;
  mockResponses: Map<string, MockResponseValue>;
  messages: Array<{ role: "user"; content: string }>;
  graders: Grader[];
}

export interface ScenarioResult {
  scenario: string;
  group: string;
  grades: GradeResult[];
  passed: boolean;
  toolCalls: ToolCallRecord[];
  finalResponse?: string;
}

export interface EvalGroupResult {
  group: string;
  scenarios: ScenarioResult[];
  totalPassed: number;
  totalFailed: number;
}

export interface EvalResult {
  model: string;
  groups: EvalGroupResult[];
  totalPassed: number;
  totalFailed: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMProvider {
  chat(messages: LLMMessage[], tools: LLMToolDef[]): Promise<LLMMessage>;
}
