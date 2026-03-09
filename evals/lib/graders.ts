import type { ToolCallRecord, LLMMessage, GradeResult, Grader } from "./types.js";

export function toolCalled(toolName: string, opts?: { times?: number }): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const matching = calls.filter((c) => c.tool === toolName);
    if (opts?.times !== undefined) {
      return {
        pass: matching.length === opts.times,
        reason:
          matching.length === opts.times
            ? `${toolName} called exactly ${opts.times} time(s)`
            : `Expected ${toolName} to be called ${opts.times} time(s), but was called ${matching.length} time(s)`,
      };
    }
    return {
      pass: matching.length > 0,
      reason:
        matching.length > 0
          ? `${toolName} was called`
          : `Expected ${toolName} to be called, but it was never called`,
    };
  };
}

export function toolNotCalled(toolName: string): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const matching = calls.filter((c) => c.tool === toolName);
    return {
      pass: matching.length === 0,
      reason:
        matching.length === 0
          ? `${toolName} was not called`
          : `Expected ${toolName} to NOT be called, but it was called ${matching.length} time(s)`,
    };
  };
}

export function toolCalledWith(toolName: string, expectedArgs: Record<string, unknown>): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const matching = calls.filter((c) => c.tool === toolName);
    if (matching.length === 0) {
      return {
        pass: false,
        reason: `${toolName} was never called`,
      };
    }

    const found = matching.some((call) =>
      Object.entries(expectedArgs).every(([key, value]) => call.arguments[key] === value),
    );

    return {
      pass: found,
      reason: found
        ? `${toolName} was called with expected arguments`
        : `${toolName} was called but never with arguments ${JSON.stringify(expectedArgs)}. Actual calls: ${JSON.stringify(matching.map((c) => c.arguments))}`,
    };
  };
}

export function argumentSameAcrossCalls(toolName: string, argName: string): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const matching = calls.filter((c) => c.tool === toolName);
    if (matching.length < 2) {
      return {
        pass: matching.length === 1,
        reason:
          matching.length === 1
            ? `Only one call to ${toolName}, argument trivially same`
            : `${toolName} was never called`,
      };
    }

    const values = matching.map((c) => c.arguments[argName]);
    const allSame = values.every((v) => v === values[0]);
    return {
      pass: allSame,
      reason: allSame
        ? `All calls to ${toolName} used the same ${argName}: ${JSON.stringify(values[0])}`
        : `${argName} differed across calls to ${toolName}: ${JSON.stringify(values)}`,
    };
  };
}

export function argumentDiffersAcrossCalls(toolName: string, argName: string): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const matching = calls.filter((c) => c.tool === toolName);
    if (matching.length < 2) {
      return {
        pass: false,
        reason: `Need at least 2 calls to ${toolName} to check that ${argName} differs, got ${matching.length}`,
      };
    }

    const values = matching.map((c) => c.arguments[argName]);
    const unique = new Set(values.map((v) => JSON.stringify(v)));
    const allDifferent = unique.size === values.length;
    return {
      pass: allDifferent,
      reason: allDifferent
        ? `All calls to ${toolName} used different ${argName} values: ${JSON.stringify(values)}`
        : `Expected ${argName} to differ across calls to ${toolName}, but got: ${JSON.stringify(values)}`,
    };
  };
}

export function callOrder(first: string, second: string): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const firstIdx = calls.findIndex((c) => c.tool === first);
    const secondIdx = calls.findIndex((c) => c.tool === second);

    if (firstIdx === -1) {
      return { pass: false, reason: `${first} was never called` };
    }
    if (secondIdx === -1) {
      return { pass: false, reason: `${second} was never called` };
    }

    return {
      pass: firstIdx < secondIdx,
      reason:
        firstIdx < secondIdx
          ? `${first} (index ${firstIdx}) was called before ${second} (index ${secondIdx})`
          : `Expected ${first} before ${second}, but ${first} was at index ${firstIdx} and ${second} at ${secondIdx}`,
    };
  };
}

export function maxCalls(toolName: string, max: number): Grader {
  return (calls: ToolCallRecord[]): GradeResult => {
    const count = calls.filter((c) => c.tool === toolName).length;
    return {
      pass: count <= max,
      reason:
        count <= max
          ? `${toolName} called ${count} time(s) (max: ${max})`
          : `${toolName} called ${count} time(s), exceeds max of ${max}`,
    };
  };
}

export function pausedForInput(): Grader {
  return (_calls: ToolCallRecord[], messages: LLMMessage[]): GradeResult => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) {
      return { pass: false, reason: "No assistant response found" };
    }
    const hasToolCalls = lastAssistant.tool_calls && lastAssistant.tool_calls.length > 0;
    return {
      pass: !hasToolCalls,
      reason: hasToolCalls
        ? "Model continued making tool calls instead of pausing for user input"
        : "Model paused for user input",
    };
  };
}
