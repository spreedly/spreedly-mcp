import { tokenReuseScenarios } from "./token-reuse.js";
import { policyEnforcementScenarios } from "./policy-enforcement.js";
import { wastefulPatternScenarios } from "./wasteful-patterns.js";
import type { Scenario } from "../lib/types.js";

export const allScenarios: Scenario[] = [
  ...tokenReuseScenarios,
  ...policyEnforcementScenarios,
  ...wastefulPatternScenarios,
];

export const scenarioGroups: Record<string, Scenario[]> = {
  "token-reuse": tokenReuseScenarios,
  "policy-enforcement": policyEnforcementScenarios,
  "wasteful-patterns": wastefulPatternScenarios,
};
