# Spreedly MCP Behavioral Evals

LLM-in-the-loop evaluation suite that verifies AI agents make correct decisions about token reuse, tool access policy enforcement, and wasteful resource creation patterns.

## Prerequisites

- An OpenAI API key (or any OpenAI-compatible provider)

## Configuration

Add your API key to a `.env` file in the project root (gitignored):

```bash
cp .env.example .env
# Then edit .env and set:
#   OPENAI_API_KEY=sk-...
```

Or export it in your shell:

```bash
export OPENAI_API_KEY=sk-...
```

## Running evals

```bash
# Run all scenarios (defaults to gpt-5-nano)
npm run test:evals

# Run a specific scenario group
npm run test:evals -- --scenario token-reuse
npm run test:evals -- --scenario policy-enforcement
npm run test:evals -- --scenario wasteful-patterns

# Use a different model
npm run test:evals -- --model gpt-4o

# Show help
npm run test:evals -- --help
```

## How it works

Each eval scenario:

1. Configures a **tool access policy** (`ToolPolicyConfig`) that controls which tools are available
2. Sets up **mock API responses** so no real Spreedly API calls are made
3. Sends a **user prompt** to the LLM along with the available tools and the `AGENTS.md` system prompt
4. Runs an **agent loop** where the LLM makes tool calls, the mock server responds, and results feed back
5. **Grades** the recorded tool call sequence using deterministic checks

## Scenario groups

### token-reuse

Verifies correct token handling:

- Different `payment_method_token` for different customers
- Reusing `gateway_token` when routing to the same processor
- Using `transaction_token` from authorize response for capture

### policy-enforcement

Verifies the AI respects disabled tool categories:

- Cannot process payments when `TRANSACTION_INITIATION_ENABLED=false`
- Cannot create gateways when `ADMINISTRATIVE_ENABLED=false`
- Cannot tokenize cards when `PAYMENT_METHOD_TOKENIZATION_ENABLED=false`

### wasteful-patterns

Verifies the AI avoids unnecessary resource creation:

- Lists gateways before creating when one exists
- Does not create a gateway for every transaction
- Checks for existing resources before creating duplicates

## Adding a scenario

Create or edit a file in `evals/scenarios/`. Each scenario is a typed `Scenario` object:

```typescript
import type { Scenario } from "../lib/types.js";
import { toolCalled, toolNotCalled } from "../lib/graders.js";
import { fakeGateway } from "../../tests/helpers/fixtures.js";

export const myScenario: Scenario = {
  name: "Descriptive name",
  description: "What this tests",
  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },
  mockResponses: new Map([["GET /gateways.json", { data: { gateways: [fakeGateway().gateway] } }]]),
  messages: [{ role: "user", content: "Your prompt to the AI" }],
  graders: [toolCalled("spreedly_gateway_purchase"), toolNotCalled("spreedly_gateway_create")],
};
```

Then add it to the appropriate array in the scenario file, and re-export from `evals/scenarios/index.ts` if it's a new group.

## Available graders

| Grader                                  | Description                                      |
| --------------------------------------- | ------------------------------------------------ |
| `toolCalled(name, { times? })`          | Tool was called (optionally exactly N times)     |
| `toolNotCalled(name)`                   | Tool was never called                            |
| `toolCalledWith(name, args)`            | Tool was called with specific argument values    |
| `argumentSameAcrossCalls(name, arg)`    | Argument has same value across all calls to tool |
| `argumentDiffersAcrossCalls(name, arg)` | Argument differs across calls to tool            |
| `callOrder(first, second)`              | First tool was called before second tool         |
| `maxCalls(name, max)`                   | Tool was called at most N times                  |
| `pausedForInput()`                      | Model's last turn was text, not tool calls       |

## Using a different LLM provider

By default, evals use OpenAI (`https://api.openai.com/v1`). To use any OpenAI-compatible provider (e.g. Ollama, Azure OpenAI), override the base URL:

```bash
OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_API_KEY=ollama npm run test:evals -- --model qwen2.5:32b
```

## Mock data only

Eval output includes the full arguments of every tool call the model makes. This is intentional — it lets you verify exactly which tokens, amounts, and parameters the model chose.

Because arguments are logged in full, **evals must only use synthetic/mock data**. Never use real Spreedly credentials, real card numbers, or real gateway API keys in scenario definitions or mock responses. All tokens (e.g. `GW_stripe_us`, `PM_alice_visa`, `TXN_auth_001`) should be obviously fake identifiers that carry no real-world meaning.

The eval runner enforces this by design: scenarios define their own `mockResponses` and never contact the Spreedly API.

## Interpreting results

- **PASS**: All graders for the scenario passed
- **FAIL**: One or more graders failed -- check the `- ` lines for details
- Each scenario shows the tool call sequence so you can trace the AI's reasoning

Exit code is `0` if all scenarios pass, `1` if any fail.
