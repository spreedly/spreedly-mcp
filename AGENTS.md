# Spreedly MCP -- Developer Agent Reference

This document is for AI coding agents that work on the Spreedly MCP **codebase itself**. If you are an agent _using_ the MCP tools to process payments, your guidance comes from the server's `instructions` field delivered during the MCP initialize handshake (source: `src/instructions.ts`).

## Project Overview

This is an MCP (Model Context Protocol) server that exposes the Spreedly payments API as tools for AI agents. It runs over stdio and is distributed as an npm package.

## Architecture

### Source Layout

```
src/
├── bin.ts                 # CLI entry point (reads env vars, starts stdio server)
├── server.ts              # MCP server creation, tool registration, passes instructions
├── instructions.ts        # SERVER_INSTRUCTIONS constant -- agent-facing guidance delivered via MCP
├── domains/               # One folder per Spreedly API domain
│   ├── index.ts           # Aggregates allTools from every domain
│   ├── gateways/          # tools.ts, schemas.ts
│   ├── transactions/
│   ├── paymentMethods/
│   ├── certificates/
│   ├── environments/
│   ├── merchantProfiles/
│   ├── subMerchants/
│   ├── events/
│   ├── protection/
│   ├── sca/
│   ├── cardRefresher/
│   └── networkTokenization/
├── security/
│   ├── descriptions.ts    # Per-tool description strings (behavioral guidance lives here)
│   ├── toolPolicy.ts      # Tool categories, access control, CATEGORY_GUIDANCE tags
│   ├── middleware.ts       # wrapHandler -- validation, error formatting, audit logging
│   ├── sanitizer.ts       # Input sanitization
│   └── audit-logger.ts    # Audit logging
├── transport/             # HTTP transport abstraction for the Spreedly API
│   ├── SpreedlyHttpTransport.ts
│   ├── types.ts
│   └── errors.ts
└── types/
    └── shared.ts          # ToolDefinition interface (name, description, schema, annotations, handler, parseError)
```

### Key Patterns

**ToolDefinition** (`src/types/shared.ts`): Every tool is a plain object with `name`, `description`, `schema` (Zod), `annotations` (MCP ToolAnnotations), a `handler` function, and an optional `parseError` hook. Tools are collected in `src/domains/index.ts` as `allTools`. The `parseError` hook lets a tool override how `SpreedlyError` responses are extracted into structured agent-facing output; when omitted, the default parser extracts `fieldErrors`, `transactionToken`, and `retryAfterMs` from typed error subclass properties.

**Tool annotations**: Each tool declares MCP-native `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) directly on its definition. These are per-tool, not per-category. The server passes them to `registerTool`. Each annotation has a comment explaining why it was set. When adding or modifying annotations, apply these principles:

- **`readOnlyHint`**: `true` for any GET endpoint. When set, `destructiveHint` and `idempotentHint` are irrelevant per the MCP spec, so omit them.
- **`destructiveHint`**: `true` if the tool can overwrite or delete existing data. All PUT/PATCH/DELETE endpoints are destructive because they replace existing field values. POST endpoints that only create new resources are _not_ destructive (additive). Financial operations (authorize, capture, void, credit) are destructive because they irreversibly alter transaction state.
- **`idempotentHint`**: `true` only if repeating the call with the same arguments has _no additional effect on Spreedly's state_. PUT/PATCH updates are idempotent (same payload converges to same state). Retain operations are idempotent (flag is already set). POST endpoints that create new records or new transaction objects are _not_ idempotent — this includes `verify` and `store`, which each create a new transaction record even though their external side-effects may seem repeatable.
- **`openWorldHint`**: `true` only if the tool reaches external systems _beyond Spreedly_ (payment processors, card networks, SCA/protection providers). CRUD operations on Spreedly-managed resources (gateways, payment methods, certificates, environments, etc.) are closed-world even though they call the Spreedly API — the domain of interaction is bounded. Vaulting a payment method (`_create`) and recaching CVV (`_recache`) are closed-world because they operate on Spreedly's vault, not an external gateway.

**Descriptions** (`src/security/descriptions.ts`): All behavioral guidance for consuming agents lives in per-tool descriptions. Financial tools include immutability language ("Operator-provided values are immutable. Never retry with altered financial parameters."). This is the primary mechanism for steering agent behavior.

**Categories are purely access control** (`src/security/toolPolicy.ts`): `TOOL_CATEGORIES` maps tool names to one of four categories. `CATEGORY_GUIDANCE` only contains toggle tags like `[Enabled by TRANSACTION_INITIATION_ENABLED=true]` -- it does NOT contain behavioral guidance. Behavioral guidance belongs in per-tool descriptions.

**Server instructions** (`src/instructions.ts`): The `SERVER_INSTRUCTIONS` constant is passed to the MCP SDK's `instructions` option during server creation. It provides high-level guidance (terminology, token reuse, workflows, best practices) to consuming agents. This is the MCP-native equivalent of a system prompt.

### Adding a New Tool

1. Add the Zod schema in `src/domains/<domain>/schemas.ts`
2. Add the tool definition in `src/domains/<domain>/tools.ts` with appropriate `annotations`
3. Add the description in `src/security/descriptions.ts` -- include behavioral guidance if it's a write or financial tool
4. If the tool belongs to a gated category, add its name to `TOOL_CATEGORIES` in `src/security/toolPolicy.ts`
5. Add tests in `tests/domains/<domain>.test.ts`
6. If the tool affects agent behavior, add or update evals in `evals/scenarios/`

### Adding a New Domain

1. Create `src/domains/<domain>/` with `tools.ts` and `schemas.ts`
2. Import and spread the tools array into `allTools` in `src/domains/index.ts`
3. Add descriptions to `src/security/descriptions.ts`
4. Add domain tests in `tests/domains/<domain>.test.ts`

## Testing

Three test layers, each with a distinct role:

- **Unit tests** (`tests/domains/`, `tests/security/`): Vitest tests with mocked HTTP transport. Test individual tool handlers, schemas, middleware, and policy logic in isolation. No credentials needed. Run with `npm test`.
- **MCP integration tests** (`tests/integration/`): Vitest tests that spin up a real `McpServer` + `Client` via `InMemoryTransport` with a mocked Spreedly transport. Verify instructions delivery, tool listings, annotations, JSON Schema conversion, `callTool` through the full middleware stack, and error formatting. No credentials needed. Run with `npm test` (included in the standard suite). These provide code coverage for the full MCP server stack.
- **Behavioral evals** (`evals/`): LLM-in-the-loop tests that verify agent decision-making through the same real MCP server stack. Require an OpenAI API key. Run with `npm run test:evals`.

### MCP Test Harness

`tests/helpers/mcp-harness.ts` provides `createMcpHarness(policy, mockResponses)` which creates a fully-wired MCP client/server pair connected via `InMemoryTransport`. The only mock is the Spreedly HTTP transport. Everything above it -- `createServer`, `wrapHandler`, Zod validation, `sanitizeParams`, error formatting, audit logging -- runs for real. Both integration tests and behavioral evals use this harness. Mock responses with `status >= 400` are routed through `mapHttpStatusToError`, matching the real transport's error path.

### Debugging

- **MCP Inspector**: `npm run inspect` launches a browser UI to call tools and inspect responses interactively. Build first with `npm run build`.

### Eval Architecture

- `evals/lib/types.ts` -- `Scenario` interface (`systemPrompt` is optional; `SERVER_INSTRUCTIONS` always comes from the server)
- `evals/lib/runner.ts` -- creates an MCP harness per scenario, gets tools via `client.listTools()`, routes calls via `client.callTool()`
- `evals/lib/graders.ts` -- assertion functions (`toolCalled`, `toolCalledWith`, `maxCalls`, `pausedForInput`, etc.)
- `evals/scenarios/` -- scenario groups: `token-reuse`, `policy-enforcement`, `wasteful-patterns`, `operator-fidelity`

Evals test the actual MCP server end-to-end: the LLM receives `SERVER_INSTRUCTIONS`, real tool definitions (with annotations), and tool call responses go through the full middleware stack.

## Important Conventions

- **Descriptions are the primary behavioral guardrail.** When an agent must not alter financial parameters, that guidance goes in the tool's description -- not in AGENTS.md, not in category guidance.
- **Annotations are per-tool.** Different tools in the same category can have different annotation values (e.g., `_verify` is not destructive, `_purchase` is). See the "Tool annotations" section above for the decision framework.
- **Never put behavioral guidance in CATEGORY_GUIDANCE.** Categories are for access control (enabling/disabling tool groups). The text appended by `getToolDescription` is only a toggle tag.
- **SERVER_INSTRUCTIONS is for consuming agents.** Changes to `src/instructions.ts` affect every agent that connects to this MCP server. Run evals (`npm run test:evals`) after modifying it.
- **This file (AGENTS.md) is for coding agents.** It should contain project structure, conventions, and development guidance -- not payment processing workflows.
