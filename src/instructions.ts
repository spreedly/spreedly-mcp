/**
 * Server instructions delivered to MCP clients during the initialize handshake.
 * This is the canonical guidance for AI agents consuming the Spreedly MCP.
 */
export const SERVER_INSTRUCTIONS = `# Spreedly MCP -- Agent Reference

This document is for AI agents that interact with the Spreedly MCP server. It describes what each tool does, its constraints, and common multi-step workflows.

## Terminology

Spreedly sits in a payment chain that can involve multiple levels. This document uses precise terms to avoid confusion:

| Term | Who they are | Example |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Operator** | The person or system talking to you (the AI agent) via this MCP server. They manage the Spreedly environment. | A developer, a platform engineer, or an automated integration |
| **Merchant** | The business on whose behalf a transaction is processed. May be the operator themselves, or a sub-merchant under a payment facilitator. | An online retailer, a SaaS company |
| **Payment facilitator** (PayFac) | An operator who processes payments on behalf of multiple merchants. Each merchant is represented as a sub-merchant in Spreedly. | A marketplace platform, a merchant aggregator |
| **Customer** (cardholder) | The person whose payment method is being charged. They are the end consumer. | A shopper buying a product |

The operator may be any of these: a direct merchant using Spreedly for their own payments, a payment facilitator managing many merchants, or a developer building an integration. When reasoning about tokens and operations, always consider which level of this chain the current operation targets.

## Authentication

The server requires two environment variables:

- \`SPREEDLY_ENVIRONMENT_KEY\` -- Your Spreedly environment key
- \`SPREEDLY_ACCESS_SECRET\` -- Your Spreedly access secret

These are set in the MCP client configuration, not passed as tool parameters. If authentication fails, you will receive an error with \`httpStatusCode: 401\`.

## Tool Naming Convention

All tools follow the pattern: \`spreedly_<domain>_<action>\`

Domains: \`gateway\`, \`transaction\`, \`payment_method\`, \`certificate\`, \`environment\`, \`merchant_profile\`, \`sub_merchant\`, \`event\`, \`protection\`, \`sca\`, \`card_refresher\`, \`network_tokenization\`

## Response Format

All tool responses include a \`_metadata\` object with operational context:

- \`durationMs\` -- Time the tool call took in milliseconds
- \`httpStatusCode\` -- The HTTP status code from the Spreedly API (when applicable)
- \`requestId\` -- The Spreedly \`x-request-id\` header (when present, useful for support requests)

## Error Handling

Error responses have \`isError: true\` and a structured JSON body:

\`\`\`
{ "error": { "httpStatusCode": 401, "message": "..." }, "_metadata": { ... } }
\`\`\`

\`httpStatusCode\` is a number when the Spreedly API returned a response, or \`null\` when the failure occurred before any HTTP response was received. Pre-HTTP failures may also include \`errorType\` such as \`"timeout"\`, \`"network"\`, or \`"internal"\`.

HTTP status codes and their meaning:

- 401 -- Invalid credentials. Do not retry; verify credentials instead.
- 402 -- Payment declined. May include \`transactionToken\` referencing the failed transaction.
- 403 -- Insufficient permissions.
- 404 -- Resource does not exist.
- 422 -- Invalid input. May include \`fieldErrors\` with per-field details.
- 429 -- Too many requests. Includes \`retryAfterMs\` indicating how long to wait before retrying.
- 502/503/504 -- Spreedly API temporarily unavailable.
- \`null\` -- Failure before any HTTP response was received. Use \`errorType\` when present to distinguish timeout/network/internal failures, report the error to the operator, and do not retry unless the operator already provided fallback instructions.

When you receive an error, the \`message\` is actionable. Use \`httpStatusCode\` to decide behavior: do not retry 401 or 402, report 422 field details to the operator, respect \`retryAfterMs\` on 429, and treat 502/503/504 as transient — if the operator provided fallback instructions (e.g., a different gateway to try), follow them immediately; otherwise report the error.

## Tool Access Policy

The server uses three environment variable flags to control which tool categories are available. All default to \`false\` (disabled). Tools in a disabled category are not registered and cannot be called.

| Variable | Default | Controls |
| ------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| \`PAYMENT_METHOD_TOKENIZATION_ENABLED\` | \`false\` | Dedicated tokenization tools that send raw PAN/CVV to Spreedly for vaulting (\`payment_method_create\`, \`payment_method_recache\`) |
| \`TRANSACTION_INITIATION_ENABLED\` | \`false\` | Tools that initiate action on a payment method with a third party. \`gateway_authorize\`, \`gateway_purchase\`, and \`transaction_confirm\` also accept optional pass-in PAN/CVV data when the Spreedly environment permits it. |
| \`ADMINISTRATIVE_ENABLED\` | \`false\` | Tools that create or modify configuration objects (gateways, environments, certificates, etc.) |

Read-only tools (list, show, transcript) are always available regardless of flag settings.

If a tool you expect is missing, the corresponding flag has not been enabled in the MCP client configuration.

## Discovering Tools

Use the tool list to see what is available -- names, descriptions, and annotations are self-describing. The \`_list\` / \`_show\` suffix indicates read-only tools; action suffixes (\`_authorize\`, \`_purchase\`, \`_capture\`, \`_void\`, etc.) indicate write or financial tools. Check each tool's \`annotations\` for \`readOnlyHint\`, \`destructiveHint\`, and \`idempotentHint\` to understand its behavior.

## Should I Reuse a Token?

Spreedly uses tokens to identify resources. When you have a token from a prior step, ask: **"What changed?"**

- **Operator provided the token in this request** -- use it as given, no verification needed.
- **Nothing changed** (e.g., retrying the same operation on a fallback gateway after a transient error) -- carry forward every parameter from the failed call (\`payment_method_token\`, \`amount\`, \`currency_code\`, etc.) and only change what the operator specified.
- **Context changed** (different customer, merchant, or purpose) -- do not reuse; ask the operator if uncertain, especially for \`payment_method_token\` and \`transaction_token\`.

Use this table to determine whether context has changed for each token type:

| Token | Reuse when | Do not reuse when |
| ------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| \`gateway_token\` | Same processor is correct for this transaction | Operator wants a different processor or region |
| \`payment_method_token\` | Same customer is being charged | Different customer -- wrong token means charging the wrong person |
| \`transaction_token\` | Follow-up on that exact transaction (capture, void, refund) | Different transaction -- wrong token means voiding/refunding the wrong operation |
| \`merchant_profile_token\` | Same merchant | Different merchant (common for payment facilitators) |
| \`sub_merchant_key\` | Same sub-merchant | Different sub-merchant |

## Best Practices

- **Use operator-provided values directly.** When the request contains all required parameters (amount, currency, payment method, gateway token), proceed with the operation. Do not re-confirm values the operator explicitly provided.
- **Never repeat a successful financial operation.** A duplicate call means a duplicate charge, hold, or refund. If a tool call returns a successful result, that operation is done.
- **Financial parameters are immutable.** Never retry a failed operation with altered amount, currency, or payment method. Report the error and wait for instructions unless the failure is clearly transient.
- **Honor pre-authorized fallback instructions.** When the operator's request includes contingency logic (e.g., "if it fails, retry on gateway X"), execute the fallback as your next tool call on the applicable error — do not pause, announce intent, or ask for confirmation. Carry forward every parameter from the failed call (\`payment_method_token\`, \`amount\`, \`currency_code\`, etc.) and only change what the operator specified.
- **Perform only the operations requested.** Execute each requested operation once and stop. Do not add extra operations or re-verify completed work.
- **Check for existing resources before creating.** Gateways, SCA providers, merchant profiles, and sub-merchants are long-lived. Use the corresponding \`_list\` tool before creating a new one.
- **Use all applicable parameters.** Review each tool's full parameter list. If the operator's request maps to an optional parameter (e.g., \`retain_on_success\`, \`order_id\`, \`description\`), include it.

## Common Workflows

### Process a Payment (authorize + capture)

1. Determine the correct \`gateway_token\` for this transaction. If you don't have one, use \`spreedly_gateway_list\` to find a suitable gateway. Only use \`spreedly_gateway_create\` if no suitable gateway exists.
2. \`spreedly_gateway_authorize\` with \`gateway_token\`, \`payment_method_token\`, \`amount\`, \`currency_code\`
3. Use the \`transaction.token\` from the response
4. \`spreedly_transaction_capture\` with \`transaction_token\`

### One-Step Purchase

1. Determine the correct \`gateway_token\` for this transaction. If you don't have one, use \`spreedly_gateway_list\` to find a suitable gateway. Only use \`spreedly_gateway_create\` if no suitable gateway exists.
2. \`spreedly_gateway_purchase\` with \`gateway_token\`, \`payment_method_token\`, \`amount\`, \`currency_code\`

### Refund a Transaction

1. \`spreedly_transaction_credit\` with \`transaction_token\` and optional \`amount\` for partial refund

### Tokenize a Card

1. \`spreedly_payment_method_create\` with card details in \`payment_method.credit_card\`
2. The response contains \`payment_method.token\` for future use

### Verify a Card Without Charging

1. Determine the correct \`gateway_token\` for this verification. If you don't have one, use \`spreedly_gateway_list\` to find a suitable gateway. Only use \`spreedly_gateway_create\` if no suitable gateway exists.
2. \`spreedly_gateway_verify\` with \`gateway_token\`, \`payment_method_token\`, \`currency_code\`

## Pagination

List endpoints support pagination via \`since_token\`. Pass the token of the last item from the previous page to get the next page. Use \`order: "desc"\` for newest-first.

## Amount Format

All amounts are in **cents** (integer). For example, $10.00 USD = \`1000\`. Currency codes are ISO 4217 (e.g., \`"USD"\`, \`"EUR"\`, \`"GBP"\`).
`;
