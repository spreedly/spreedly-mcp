# Spreedly MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that provides AI assistants with direct access to the [Spreedly](https://www.spreedly.com/) payments API. Enables LLMs to manage gateways, process transactions, tokenize payment methods, and more -- all through structured, validated tool calls.

## Quick Start

Add this to your MCP client configuration:

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "spreedly": {
      "command": "npx",
      "args": ["-y", "@spreedly/spreedly-mcp@latest"],
      "env": {
        "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
        "SPREEDLY_ACCESS_SECRET": "<your-access-secret>"
      }
    }
  }
}
```

### Cursor

Edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "spreedly": {
      "command": "npx",
      "args": ["-y", "@spreedly/spreedly-mcp@latest"],
      "env": {
        "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
        "SPREEDLY_ACCESS_SECRET": "<your-access-secret>"
      }
    }
  }
}
```

### VS Code

Edit `.vscode/mcp.json`:

```json
{
  "servers": {
    "spreedly": {
      "command": "npx",
      "args": ["-y", "@spreedly/spreedly-mcp@latest"],
      "env": {
        "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
        "SPREEDLY_ACCESS_SECRET": "<your-access-secret>"
      }
    }
  }
}
```

## Getting Your Credentials

1. Log into the [Spreedly Dashboard](https://app.spreedly.com/)
2. Your **Environment Key** is shown on your environment's settings page
3. Create or find an **Access Secret** under your environment's access secrets

For details, see [Spreedly Credentials Documentation](https://docs.spreedly.com/basics/credentials/).

## Tool Access Policy

The server controls which tools are available through three environment variable flags. **All default to `false`** -- only read-only tools are available out of the box. Enable the categories you need:

| Variable                              | Default | What it enables                                                                                         |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `PAYMENT_METHOD_TOKENIZATION_ENABLED` | `false` | Creating and recaching payment methods (sends PAN/CVV data)                                             |
| `TRANSACTION_INITIATION_ENABLED`      | `false` | Authorizing, purchasing, capturing, voiding, refunding, and other third-party actions                   |
| `ADMINISTRATIVE_ENABLED`              | `false` | Creating/updating gateways, environments, certificates, merchant profiles, SCA providers, sub-merchants |

### Recommended Configuration Profiles

**Read-only / monitoring** (default -- no flags needed):

```json
"env": {
  "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
  "SPREEDLY_ACCESS_SECRET": "<your-access-secret>"
}
```

Only list/show tools are available. Good for dashboards, reporting, and investigating transactions.

**Transaction processing** (recommended for AI-assisted payments):

```json
"env": {
  "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
  "SPREEDLY_ACCESS_SECRET": "<your-access-secret>",
  "TRANSACTION_INITIATION_ENABLED": "true"
}
```

Enables authorizing, capturing, voiding, and refunding against existing gateways. Does not allow creating gateways or tokenizing raw card data -- the safest profile for conducting transactions.

**Administrative setup:**

```json
"env": {
  "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
  "SPREEDLY_ACCESS_SECRET": "<your-access-secret>",
  "ADMINISTRATIVE_ENABLED": "true"
}
```

For initial environment setup -- creating gateways, merchant profiles, SCA providers. Disable once configuration is complete.

**Full access:**

```json
"env": {
  "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",
  "SPREEDLY_ACCESS_SECRET": "<your-access-secret>",
  "PAYMENT_METHOD_TOKENIZATION_ENABLED": "true",
  "TRANSACTION_INITIATION_ENABLED": "true",
  "ADMINISTRATIVE_ENABLED": "true"
}
```

All tool categories enabled. Use only in controlled environments or during initial setup.

## Available Tools

### Gateways (12 tools)

| Tool                                 | Description                         |
| ------------------------------------ | ----------------------------------- |
| `spreedly_gateway_create`            | Create a new gateway connection     |
| `spreedly_gateway_list`              | List all gateways                   |
| `spreedly_gateway_show`              | Get gateway details                 |
| `spreedly_gateway_update`            | Update gateway configuration        |
| `spreedly_gateway_retain`            | Mark gateway for retention          |
| `spreedly_gateway_list_supported`    | List all supported gateway types    |
| `spreedly_gateway_list_transactions` | List transactions for a gateway     |
| `spreedly_gateway_authorize`         | Authorize a payment (hold funds)    |
| `spreedly_gateway_purchase`          | Authorize and capture in one step   |
| `spreedly_gateway_verify`            | Verify a payment method             |
| `spreedly_gateway_store`             | Store a payment method at a gateway |
| `spreedly_gateway_general_credit`    | Issue a non-referenced credit       |

### Transactions (9 tools)

| Tool                              | Description                       |
| --------------------------------- | --------------------------------- |
| `spreedly_transaction_list`       | List transactions                 |
| `spreedly_transaction_show`       | Get transaction details           |
| `spreedly_transaction_update`     | Update transaction metadata       |
| `spreedly_transaction_capture`    | Capture an authorized transaction |
| `spreedly_transaction_void`       | Void a transaction                |
| `spreedly_transaction_credit`     | Refund a transaction              |
| `spreedly_transaction_complete`   | Complete a pending transaction    |
| `spreedly_transaction_confirm`    | Confirm a pending transaction     |
| `spreedly_transaction_transcript` | Get raw gateway transcript        |

### Payment Methods (12 tools)

| Tool                                        | Description                            |
| ------------------------------------------- | -------------------------------------- |
| `spreedly_payment_method_create`            | Tokenize a new payment method          |
| `spreedly_payment_method_list`              | List payment methods                   |
| `spreedly_payment_method_show`              | Get payment method details             |
| `spreedly_payment_method_update`            | Update payment method metadata         |
| `spreedly_payment_method_retain`            | Retain a payment method                |
| `spreedly_payment_method_recache`           | Recache CVV                            |
| `spreedly_payment_method_list_transactions` | List transactions for a payment method |
| `spreedly_payment_method_list_events`       | List events for a payment method       |
| `spreedly_payment_method_delete_metadata`   | Delete payment method metadata         |
| `spreedly_payment_method_update_gratis`     | Update without gateway interaction     |
| `spreedly_payment_method_show_event`        | Show a payment method event            |
| `spreedly_payment_method_list_all_events`   | List all payment method events         |

### Certificates (4 tools)

`spreedly_certificate_create`, `spreedly_certificate_generate`, `spreedly_certificate_list`, `spreedly_certificate_update`

### Environments (4 tools)

`spreedly_environment_create`, `spreedly_environment_list`, `spreedly_environment_show`, `spreedly_environment_update`

### Merchant Profiles (4 tools)

`spreedly_merchant_profile_create`, `spreedly_merchant_profile_list`, `spreedly_merchant_profile_show`, `spreedly_merchant_profile_update`

### Sub-Merchants (4 tools)

`spreedly_sub_merchant_create`, `spreedly_sub_merchant_list`, `spreedly_sub_merchant_show`, `spreedly_sub_merchant_update`

### Events (2 tools)

`spreedly_event_list`, `spreedly_event_show`

### Protection (5 tools)

`spreedly_protection_forward_claim`, `spreedly_protection_list_events`, `spreedly_protection_show_event`, `spreedly_protection_create_provider`, `spreedly_protection_show_provider`

### SCA (3 tools)

`spreedly_sca_authenticate`, `spreedly_sca_create_provider`, `spreedly_sca_show_provider`

### Card Refresher (3 tools)

`spreedly_card_refresher_inquiry`, `spreedly_card_refresher_show_inquiry`, `spreedly_card_refresher_list_inquiries`

### Network Tokenization (2 tools)

`spreedly_network_tokenization_card_metadata`, `spreedly_network_tokenization_token_status`

## Common Workflows

### Tokenize and Charge a Card

1. Create a payment method: `spreedly_payment_method_create`
2. Authorize against a gateway: `spreedly_gateway_authorize`
3. Capture the authorization: `spreedly_transaction_capture`

### Authorize Then Capture (Two-Step)

1. Authorize: `spreedly_gateway_authorize` (holds funds)
2. Capture later: `spreedly_transaction_capture` (collects funds)

### Refund a Transaction

1. Find the transaction: `spreedly_transaction_show`
2. Issue a refund: `spreedly_transaction_credit`

## Audit Logging

When audit logging is enabled (the default), the MCP server emits structured audit log entries to **stderr** for every tool invocation. Logs use one-line JSON format for easy SIEM ingestion and comply with PCI DSS v4.0.1 Requirement 10.2.2. stderr is the [MCP-specified channel for logging](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio) — stdout is reserved for protocol traffic and must not contain non-MCP messages.

### Example Output

```json
{"timestamp":"2026-03-05T18:30:00.000Z","eventId":"f47ac10b-58cc-4372-a567-0e02b2c3d479","component":"spreedly-mcp","tool":"spreedly_gateway_list","environmentKey":"Abc123XyzLongKey","status":"success","durationMs":142,"requestId":"a1b2c3d4e5","httpStatusCode":200}
{"timestamp":"2026-03-05T18:30:01.000Z","eventId":"7c9e6679-7425-40de-944b-e07fc1f90ae7","component":"spreedly-mcp","tool":"spreedly_payment_method_create","environmentKey":"Abc123XyzLongKey","status":"error","durationMs":89,"requestId":"f6g7h8i9j0","httpStatusCode":422}
```

Each entry includes: timestamp, event ID, component identifier, tool name, environment key, success/failure status, duration, and HTTP metadata. The `environmentKey` is the full `SPREEDLY_ENVIRONMENT_KEY` (safe to log — it is not a secret). The `requestId` and `httpStatusCode` fields reflect the Spreedly API response (`x-request-id` header and HTTP status), enabling correlation with Spreedly's server-side logs. Both are present whenever a Spreedly API call was made. On error, `httpStatusCode` is `null` when the failure occurred before any HTTP request (e.g. input validation). On success without an API call, `httpStatusCode` is absent. Request and response bodies are **never** logged.

### De-duplicating Logs

The server emits exactly **one** audit entry per tool invocation. However, MCP hosts (Claude Desktop, Cursor, VS Code, etc.) capture and display stderr independently from one another, and some hosts may render the same stderr line more than once in their log UI. Each entry includes a unique `eventId` (UUIDv4) so that downstream log pipelines can safely de-duplicate: discard any entry whose `eventId` you have already seen.

### Configuration

| Environment Variable     | Values           | Default | Description                                                                                                                                                                                                                                         |
| ------------------------ | ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SPREEDLY_MCP_LOG_LEVEL` | `info`, `silent` | `info`  | Set to `silent` to disable audit logging. **Note:** Disabling audit logs means this component will not satisfy PCI DSS Requirement 10.2.1 (audit logs enabled for all system components). Use `silent` only in development or non-PCI environments. |

### Shared Responsibility

| Responsibility                                              | Owner                   |
| ----------------------------------------------------------- | ----------------------- |
| Emit structured audit events to stderr                      | Spreedly MCP server     |
| Capture stderr and route to SIEM/log aggregator             | Customer infrastructure |
| Retain logs for 12+ months (3 months immediately available) | Customer infrastructure |
| Monitor and alert on suspicious audit events                | Customer infrastructure |

## Security

- Credentials are isolated in a closure -- never stored as object properties, never serializable
- All inputs are sanitized for invisible Unicode characters and injection attempts
- Error messages are redacted to prevent credential leakage
- Tool descriptions are static constants hardened against prompt injection
- Audit logs never contain request/response bodies, full keys, or secrets
- See [SECURITY.md](SECURITY.md) for vulnerability reporting
- See [Security Guide](docs/security-guide.md) for architecture details, credential management, and deployment recommendations

## Shared Responsibility

The MCP server runs in your infrastructure. Security is shared between the server and your organization:

| Category                | Spreedly MCP Server                                | Customer                                 |
| ----------------------- | -------------------------------------------------- | ---------------------------------------- |
| **Credential security** | Isolates in closure; never serializable or logged  | Provisions, rotates, secures storage     |
| **Transport security**  | Enforces HTTPS; redacts credentials from errors    | Network segmentation, access controls    |
| **Input validation**    | Validates and sanitizes tool inputs                | Configures Tool Access Policy            |
| **Audit logging**       | Emits structured JSON to stderr                    | Routes to SIEM; retention, monitoring    |
| **AI provider**         | Hardens tool descriptions against prompt injection | Selects provider, evaluates data privacy |
| **Deployment**          | Minimal dependencies; npm provenance attestation   | Isolates server process, keeps updated   |
| **PCI compliance**      | No cardholder data stored outside API calls        | Maintains own PCI posture                |

For credential rotation procedures, deployment hardening, and the full model, see the [Security Guide](docs/security-guide.md).

## Development

```bash
git clone https://github.com/spreedly/spreedly-mcp.git
cd spreedly-mcp
npm install
npm test          # Run all tests
npm run typecheck # Type-check
npm run build     # Build for distribution
```

To run the MCP server locally against a real Spreedly test environment (e.g. during development before the package is published), see [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and security guidelines.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, including local MCP client configuration and credential handling.

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all checks pass: `npm test && npm run typecheck && npm run lint`
5. Submit a pull request

## Disclaimer

See [DISCLAIMER.md](DISCLAIMER.md) for information on third-party AI integration, shared responsibility, and operational risk.

## License

MIT -- see [LICENSE](LICENSE)
