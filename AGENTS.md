# Spreedly MCP -- Agent Reference

This document is for AI agents that interact with the Spreedly MCP server. It describes what each tool does, its constraints, and common multi-step workflows.

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

## Tool Capabilities and Constraints

### Read-Only Tools (safe to call anytime)

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

## Common Workflows

### Process a Payment (authorize + capture)

1. `spreedly_gateway_authorize` with `gateway_token`, `payment_method_token`, `amount`, `currency_code`
2. Use the `transaction.token` from the response
3. `spreedly_transaction_capture` with `transaction_token`

### One-Step Purchase

1. `spreedly_gateway_purchase` with `gateway_token`, `payment_method_token`, `amount`, `currency_code`

### Refund a Transaction

1. `spreedly_transaction_credit` with `transaction_token` and optional `amount` for partial refund

### Tokenize a Card

1. `spreedly_payment_method_create` with card details in `payment_method.credit_card`
2. The response contains `payment_method.token` for future use

### Route-Agnostic Authorization (Workflows)

1. `spreedly_transaction_authorize_workflow` with `payment_method_token`, `amount`, `currency_code`
2. Spreedly routes to the appropriate gateway based on configured workflows

### Verify a Card Without Charging

1. `spreedly_gateway_verify` with `gateway_token`, `payment_method_token`, `currency_code`

## Pagination

List endpoints support pagination via `since_token`. Pass the token of the last item from the previous page to get the next page. Use `order: "desc"` for newest-first.

## Amount Format

All amounts are in **cents** (integer). For example, $10.00 USD = `1000`. Currency codes are ISO 4217 (e.g., `"USD"`, `"EUR"`, `"GBP"`).
