import { tokenReuseScenarios } from "./token-reuse.js";
import { policyEnforcementScenarios } from "./policy-enforcement.js";
import { wastefulPatternScenarios } from "./wasteful-patterns.js";
import { operatorFidelityScenarios } from "./operator-fidelity.js";
import { toolSelectionScenarios } from "./tool-selection.js";
import { multiStepWorkflows } from "./multi-step-workflows.js";
import { parameterSelection } from "./parameter-selection.js";
import { errorHandlingScenarios } from "./error-handling.js";
import type { Scenario } from "../lib/types.js";

export const allScenarios: Scenario[] = [
  ...tokenReuseScenarios,
  ...policyEnforcementScenarios,
  ...wastefulPatternScenarios,
  ...operatorFidelityScenarios,
  ...errorHandlingScenarios,
  ...toolSelectionScenarios,
  ...multiStepWorkflows,
  ...parameterSelection,
];

export const scenarioGroups: Record<string, Scenario[]> = {
  "token-reuse": tokenReuseScenarios,
  "policy-enforcement": policyEnforcementScenarios,
  "wasteful-patterns": wastefulPatternScenarios,
  "operator-fidelity": operatorFidelityScenarios,
  "error-handling": errorHandlingScenarios,
  "tool-selection": toolSelectionScenarios,
  "multi-step-workflows": multiStepWorkflows,
  "parameter-selection": parameterSelection,
};
