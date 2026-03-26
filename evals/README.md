# Spreedly MCP Behavioral Evals

LLM-in-the-loop evaluation suite that verifies AI agents make correct decisions about token reuse, tool access policy enforcement, wasteful resource creation patterns, and operator-fidelity.

## Architecture

Evals run through the **real MCP server** with a mocked Spreedly HTTP transport. This means every eval exercises the full production stack: server creation, tool registration, `wrapHandler` middleware (Zod validation, input sanitization, error formatting, audit logging), `SERVER_INSTRUCTIONS` delivery, and MCP-native tool annotations. The only mock is the Spreedly API itself.

```
LLM (OpenAI)  <-->  Eval Runner  <-->  MCP Client  <-->  MCP Server (real)  <-->  Mock Spreedly Transport
```

Each scenario spins up a fresh MCP server/client pair via `InMemoryTransport` from the MCP SDK. The runner converts MCP tool definitions to OpenAI function-calling format and routes tool calls back through `client.callTool()`.

`SERVER_INSTRUCTIONS` is always delivered to the LLM as a system message -- there is no "descriptions-only" mode, because production always delivers instructions.

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

To avoid hitting TPM rate limits, you can control both concurrency and pacing:

```bash
# Limit how many scenarios run in parallel (default: 5)
export EVAL_CONCURRENCY=2

# Add a minimum gap (in ms) between LLM API calls (default: 0, no throttle)
export EVAL_PAUSE_MS=2000
```

These can also be set via CLI flags (`--concurrency` / `-c` and `--pause` / `-p`), which take precedence over the env vars. The pause applies globally across all concurrent scenarios -- LLM calls are serialized through a shared throttle.

## Running evals

```bash
# Run all scenarios (defaults to gpt-5-nano)
npm run test:evals

# Run a specific scenario group
npm run test:evals -- --scenario token-reuse
npm run test:evals -- --scenario policy-enforcement
npm run test:evals -- --scenario wasteful-patterns
npm run test:evals -- --scenario operator-fidelity
npm run test:evals -- --scenario error-handling
npm run test:evals -- --scenario tool-selection
npm run test:evals -- --scenario multi-step-workflows
npm run test:evals -- --scenario parameter-selection

# Use a different model
npm run test:evals -- --model gpt-4o

# Limit concurrency to avoid rate limits (default: 5)
npm run test:evals -- --concurrency 2

# Add a 2-second pause between LLM calls (combines with concurrency)
npm run test:evals -- --concurrency 1 --pause 2000

# Show help
npm run test:evals -- --help
```

## How it works

Each eval scenario:

1. Creates a real **MCP server** (`createServer`) with the scenario's tool access policy and mock responses
2. Connects an **MCP client** via `InMemoryTransport` -- the client receives `SERVER_INSTRUCTIONS` and tool definitions (with annotations and JSON Schema) exactly as a production client would
3. Sends the **instructions + user prompt** to the LLM along with the tool definitions
4. Runs an **agent loop** where the LLM makes tool calls, routed through `client.callTool()` (full middleware stack), and results feed back
5. **Grades** the recorded tool call sequence using deterministic checks

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

The eval runner enforces this by design: scenarios define their own `mockResponses`, and the MCP server is wired to a mock Spreedly transport that never contacts the real API.

## Interpreting results

- **PASS**: All graders for the scenario passed
- **FAIL**: One or more graders failed -- check the `- ` lines for details
- Each scenario shows the tool call sequence so you can trace the AI's reasoning

Exit code is `0` if all scenarios pass, `1` if any fail.
