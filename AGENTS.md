# Spreedly MCP -- Agent Reference

This document is for AI agents that interact with the Spreedly MCP server. It describes what each tool does, its constraints, and common multi-step workflows.

## Terminology

Spreedly sits in a payment chain that can involve multiple levels. This document uses precise terms to avoid confusion:

| Term                             | Who they are                                                                                                                            | Example                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Operator**                     | The person or system talking to you (the AI agent) via this MCP server. They manage the Spreedly environment.                           | A developer, a platform engineer, or an automated integration |
| **Merchant**                     | The business on whose behalf a transaction is processed. May be the operator themselves, or a sub-merchant under a payment facilitator. | An online retailer, a SaaS company                            |
| **Payment facilitator** (PayFac) | An operator who processes payments on behalf of multiple merchants. Each merchant is represented as a sub-merchant in Spreedly.         | A marketplace platform, a merchant aggregator                 |
| **Customer** (cardholder)        | The person whose payment method is being charged. They are the end consumer.                                                            | A shopper buying a product                                    |

The operator may be any of these: a direct merchant using Spreedly for their own payments, a payment facilitator managing many merchants, or a developer building an integration. When reasoning about tokens and operations, always consider which level of this chain the current operation targets.

## Authentication

The server requires two environment variables:

- `SPREEDLY_ENVIRONMENT_KEY` -- Your Spreedly environment key
- `SPREEDLY_ACCESS_SECRET` -- Your Spreedly access secret

These are set in the MCP client configuration, not passed as tool parameters. If authentication fails, you will receive an error with code `AUTH_ERROR`.

## Tool Naming Convention

All tools follow the pattern: `spreedly_<domain>_<action>`

Domains: `gateway`, `transaction`, `payment_method`, `receiver`, `certificate`, `environment`, `merchant_profile`, `sub_merchant`, `event`, `protection`, `sca`, `card_refresher`, `network_tokenization`

## Error Handling

Errors follow a structured format:

- `AUTH_ERROR` (401) -- Invalid credentials
- `FORBIDDEN` (403) -- Insufficient permissions
- `NOT_FOUND` (404) -- Resource does not exist
- `VALIDATION_ERROR` (422) -- Invalid input, includes field-level details
- `RATE_LIMITED` (429) -- Too many requests
- `GATEWAY_ERROR` (502/503/504) -- Spreedly API temporarily unavailable
- `PAYMENT_ERROR` (402) -- Payment declined

When you receive an error, the message is actionable. Do not retry auth errors; verify credentials instead.

## Tool Access Policy

The server uses three environment variable flags to control which tool categories are available. All default to `false` (disabled). Tools in a disabled category are not registered and cannot be called.

| Variable                              | Default | Controls                                                                                       |
| ------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `PAYMENT_METHOD_TOKENIZATION_ENABLED` | `false` | Tools that send sensitive card data (PAN/CVV) to Spreedly                                      |
| `TRANSACTION_INITIATION_ENABLED`      | `false` | Tools that initiate action on a payment method with a third party                              |
| `ADMINISTRATIVE_ENABLED`              | `false` | Tools that create or modify configuration objects (gateways, environments, certificates, etc.) |

Read-only tools (list, show, transcript) are always available regardless of flag settings. Some tools (receivers, access secrets, workflow transactions, redact operations) are always disabled.

If a tool you expect is missing, the corresponding flag has not been enabled in the MCP client configuration.

## Tool Capabilities and Constraints

**Note:** The tools listed below may not all be available depending on the Tool Access Policy configuration. If a tool is not registered, it will not appear in your tool list.

### Read-Only Tools (always available)

- All `_list` and `_show` tools
- `spreedly_gateway_list_supported`
- `spreedly_transaction_transcript`
- `spreedly_network_tokenization_card_metadata`
- `spreedly_network_tokenization_token_status`

### Write Tools (create or modify resources)

- `_create`, `_update`, `_retain` tools
- `spreedly_gateway_authorize`, `_purchase`, `_verify`, `_store`, `_general_credit`
- `spreedly_transaction_capture`, `_void`, `_credit`, `_complete`, `_confirm`
- `spreedly_payment_method_recache`, `_update_gratis`, `_delete_metadata`
- `spreedly_receiver_deliver`, `_export`

### Destructive Tools (irreversible)

- `spreedly_gateway_redact` -- Permanently removes gateway credentials
- `spreedly_payment_method_redact` -- Permanently removes payment data
- `spreedly_receiver_redact` -- Permanently removes receiver data
- `spreedly_transaction_void` -- Voids a transaction (cannot be undone)
- `spreedly_environment_delete_access_secret` -- Deletes an access secret
- `spreedly_environment_regenerate_signing_secret` -- Invalidates old secret

## Should I Reuse a Token?

Spreedly uses tokens to identify resources. Before reusing any token from a previous operation, ask: **"Is this the right resource for what I am doing right now?"** No token should be blindly reused -- every token requires you to consider whether the current context matches the context in which the token was obtained.

### How to think about each token type

| Token                    | What it represents                                                    | When to reuse                                                                        | When NOT to reuse                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway_token`          | A connection to a specific payment processor (e.g. Stripe, Braintree) | The current transaction should be routed to the same processor                       | The operator wants to use a different processor, or the environment has multiple gateways for different purposes (e.g. one for US, another for EU) |
| `sca_provider_key`       | A 3D Secure authentication provider                                   | The same SCA provider applies to this transaction                                    | A different SCA provider is needed (e.g. different provider for different card networks or regions)                                                |
| `merchant_profile_token` | A set of merchant business details                                    | The transaction is on behalf of the same merchant                                    | The transaction is on behalf of a different merchant (common when the operator is a payment facilitator)                                           |
| `sub_merchant_key`       | A sub-merchant within a payment facilitator                           | The transaction is for the same sub-merchant                                         | The transaction is for a different sub-merchant -- each sub-merchant represents a distinct merchant under the payment facilitator                  |
| `payment_method_token`   | A specific customer's (cardholder's) card or bank account             | You are transacting for the **same customer** who owns this payment method           | You are transacting for a **different customer** -- using the wrong token means charging the wrong person                                          |
| `transaction_token`      | A specific authorization, purchase, or other transaction              | You are performing a follow-up on **that exact transaction** (capture, void, refund) | You are working with a different transaction -- using the wrong token means voiding or refunding the wrong operation                               |

### Key principles

1. **Never assume -- verify.** If you have a token from a previous step, confirm it still applies. Did the operator switch customers? Switch merchants? Ask for a different gateway?
2. **When in doubt, ask the operator.** It is always safer to confirm than to guess, especially for `payment_method_token` and `transaction_token` where mistakes have direct financial consequences.
3. **Do not recreate what already exists.** If the context has not changed and you have the right token, use it. Do not re-list gateways or recreate configuration objects for each transaction.
4. **Do not create configuration objects per-transaction.** Gateways, SCA providers, merchant profiles, and sub-merchants are long-lived. If you need one and don't have the token, use the corresponding `_list` tool to find an existing one before creating a new one.

## Best Practices

- **Never repeat a successful transaction.** Authorizations, purchases, captures, voids, and credits have real financial consequences. If a transaction tool call returns a successful result, that operation is done -- do not call it again with the same parameters. A duplicate call means a duplicate charge, hold, or refund.
- **Perform only the operations requested.** When the operator asks for a set of transactions, execute each one exactly once and stop. Do not add extra operations, retry successful calls, or re-verify completed work.
- **Use the minimum permissions needed.** If you are only processing transactions, only `TRANSACTION_INITIATION_ENABLED` needs to be set to `"true"`.
- **Check for existing configuration resources before creating.** If you need a `gateway_token` you don't already have, use `spreedly_gateway_list` to find an existing one before calling `spreedly_gateway_create`.

## Common Workflows

### Process a Payment (authorize + capture)

1. Determine the correct `gateway_token` for this transaction. If you don't have one, use `spreedly_gateway_list` to find a suitable gateway. Only use `spreedly_gateway_create` if no suitable gateway exists.
2. `spreedly_gateway_authorize` with `gateway_token`, `payment_method_token`, `amount`, `currency_code`
3. Use the `transaction.token` from the response
4. `spreedly_transaction_capture` with `transaction_token`

### One-Step Purchase

1. Determine the correct `gateway_token` for this transaction. If you don't have one, use `spreedly_gateway_list` to find a suitable gateway. Only use `spreedly_gateway_create` if no suitable gateway exists.
2. `spreedly_gateway_purchase` with `gateway_token`, `payment_method_token`, `amount`, `currency_code`

### Refund a Transaction

1. `spreedly_transaction_credit` with `transaction_token` and optional `amount` for partial refund

### Tokenize a Card

1. `spreedly_payment_method_create` with card details in `payment_method.credit_card`
2. The response contains `payment_method.token` for future use

### Verify a Card Without Charging

1. Determine the correct `gateway_token` for this verification. If you don't have one, use `spreedly_gateway_list` to find a suitable gateway. Only use `spreedly_gateway_create` if no suitable gateway exists.
2. `spreedly_gateway_verify` with `gateway_token`, `payment_method_token`, `currency_code`

## Pagination

List endpoints support pagination via `since_token`. Pass the token of the last item from the previous page to get the next page. Use `order: "desc"` for newest-first.

## Amount Format

All amounts are in **cents** (integer). For example, $10.00 USD = `1000`. Currency codes are ISO 4217 (e.g., `"USD"`, `"EUR"`, `"GBP"`).
