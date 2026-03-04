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

## Available Tools

### Gateways (13 tools)

| Tool | Description |
|------|-------------|
| `spreedly_gateway_create` | Create a new gateway connection |
| `spreedly_gateway_list` | List all gateways |
| `spreedly_gateway_show` | Get gateway details |
| `spreedly_gateway_update` | Update gateway configuration |
| `spreedly_gateway_redact` | Permanently remove gateway credentials |
| `spreedly_gateway_retain` | Mark gateway for retention |
| `spreedly_gateway_list_supported` | List all supported gateway types |
| `spreedly_gateway_list_transactions` | List transactions for a gateway |
| `spreedly_gateway_authorize` | Authorize a payment (hold funds) |
| `spreedly_gateway_purchase` | Authorize and capture in one step |
| `spreedly_gateway_verify` | Verify a payment method |
| `spreedly_gateway_store` | Store a payment method at a gateway |
| `spreedly_gateway_general_credit` | Issue a non-referenced credit |

### Transactions (12 tools)

| Tool | Description |
|------|-------------|
| `spreedly_transaction_list` | List transactions |
| `spreedly_transaction_show` | Get transaction details |
| `spreedly_transaction_update` | Update transaction metadata |
| `spreedly_transaction_capture` | Capture an authorized transaction |
| `spreedly_transaction_void` | Void a transaction |
| `spreedly_transaction_credit` | Refund a transaction |
| `spreedly_transaction_complete` | Complete a pending transaction |
| `spreedly_transaction_confirm` | Confirm a pending transaction |
| `spreedly_transaction_transcript` | Get raw gateway transcript |
| `spreedly_transaction_authorize_workflow` | Authorize via workflows |
| `spreedly_transaction_purchase_workflow` | Purchase via workflows |
| `spreedly_transaction_verify_workflow` | Verify via workflows |

### Payment Methods (13 tools)

| Tool | Description |
|------|-------------|
| `spreedly_payment_method_create` | Tokenize a new payment method |
| `spreedly_payment_method_list` | List payment methods |
| `spreedly_payment_method_show` | Get payment method details |
| `spreedly_payment_method_update` | Update payment method metadata |
| `spreedly_payment_method_retain` | Retain a payment method |
| `spreedly_payment_method_redact` | Redact a payment method |
| `spreedly_payment_method_recache` | Recache CVV |
| `spreedly_payment_method_list_transactions` | List transactions for a payment method |
| `spreedly_payment_method_list_events` | List events for a payment method |
| `spreedly_payment_method_delete_metadata` | Delete payment method metadata |
| `spreedly_payment_method_update_gratis` | Update without gateway interaction |
| `spreedly_payment_method_show_event` | Show a payment method event |
| `spreedly_payment_method_list_all_events` | List all payment method events |

### Receivers (8 tools)

`spreedly_receiver_list_supported`, `spreedly_receiver_create`, `spreedly_receiver_list`, `spreedly_receiver_show`, `spreedly_receiver_update`, `spreedly_receiver_redact`, `spreedly_receiver_deliver`, `spreedly_receiver_export`

### Certificates (4 tools)

`spreedly_certificate_create`, `spreedly_certificate_generate`, `spreedly_certificate_list`, `spreedly_certificate_update`

### Environments (9 tools)

`spreedly_environment_create`, `spreedly_environment_list`, `spreedly_environment_show`, `spreedly_environment_update`, `spreedly_environment_create_access_secret`, `spreedly_environment_list_access_secrets`, `spreedly_environment_show_access_secret`, `spreedly_environment_delete_access_secret`, `spreedly_environment_regenerate_signing_secret`

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

## Security

- Credentials are isolated in a closure -- never stored as object properties, never serializable
- All inputs are sanitized for invisible Unicode characters and injection attempts
- Error messages are redacted to prevent credential leakage
- Tool descriptions are static constants hardened against prompt injection
- See [SECURITY.md](SECURITY.md) for the full security policy

## Development

```bash
git clone https://github.com/spreedly/spreedly-mcp.git
cd spreedly-mcp
npm install
npm test          # Run all tests
npm run typecheck # Type-check
npm run build     # Build for distribution
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

MIT -- see [LICENSE](LICENSE)
