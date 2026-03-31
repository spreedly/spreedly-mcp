# Security Guide

This guide covers the security architecture, credential management, shared responsibility model, and deployment recommendations for the Spreedly MCP server. For vulnerability reporting, see [SECURITY.md](../SECURITY.md).

## Security Architecture

### Credential Isolation

API credentials (environment key and access secret) are stored in a closure, not as object properties. They cannot be accessed via `JSON.stringify()`, prototype traversal, or error serialization.

### Input Sanitization

All tool inputs pass through a sanitization layer that:

- Strips invisible Unicode characters (zero-width spaces, directional overrides)
- Rejects inputs containing MCP protocol injection fragments
- Enforces field length limits
- Validates token format (alphanumeric, hyphens, underscores only)

### Error Redaction

Before any error reaches the MCP host:

- Credential patterns (Basic auth, Bearer tokens, long base64 strings) are replaced with `[REDACTED]`
- Stack traces are excluded
- Raw HTTP response bodies are not exposed

### Tool Description Hardening

All tool descriptions are static string constants frozen at build time. They explicitly state the scope and boundaries of each tool to prevent prompt injection via tool shadowing.

### Context Pollution Protection

- No dynamic content in tool descriptions
- Input validation rejects embedded protocol fragments
- Per-field length limits prevent payload inflation
- Strict Zod schemas reject unexpected fields

### Dependencies

This package has two runtime dependencies:

- `@modelcontextprotocol/sdk` -- MCP protocol implementation
- `zod` -- Input validation

Both are widely used, actively maintained, and regularly audited.

## Credential Management

Spreedly API credentials consist of two parts:

- **Environment Key** -- An identifier for your Spreedly environment. Not a secret; safe to include in logs.
- **Access Secret** -- A sensitive credential that grants API access when combined with the environment key. Must be protected.

### When to Rotate

Rotate your access secret:

- Immediately if you suspect it has been compromised or exposed
- When a team member with access leaves the organization
- Every 60--90 days as a matter of routine ([Spreedly recommends this cadence](https://support.spreedly.com/hc/en-us/articles/4401990647579-How-do-I-rotate-my-Access-Secret))

### How to Rotate

Spreedly supports multiple concurrent access secrets, so you can rotate without downtime:

1. In the [Spreedly Dashboard](https://app.spreedly.com/), create a new access secret for your environment
2. Copy the new secret immediately -- it will not be visible again after creation
3. Update the `SPREEDLY_ACCESS_SECRET` environment variable in your MCP client configuration
4. Restart the MCP server so it picks up the new credential
5. Verify the server is working with the new secret
6. Delete the old access secret in the Spreedly Dashboard

For the full walkthrough, see [How do I rotate my Access Secret?](https://support.spreedly.com/hc/en-us/articles/4401990647579-How-do-I-rotate-my-Access-Secret) and [Create and manage your Access Secrets](https://support.spreedly.com/hc/en-us/articles/360002679214-Create-and-manage-your-Access-Secrets).

### Access Secret Scoping

Spreedly offers two types of access secrets:

- **Environment-scoped** -- Can only authenticate against a single environment. Use these whenever possible.
- **Organization-scoped** -- Can authenticate against any environment in your organization. Avoid unless you have a specific need.

Environment-scoped secrets follow the principle of least privilege and limit blast radius if compromised.

## Shared Responsibility Model

The Spreedly MCP server is a client-side component that runs in your infrastructure and calls the Spreedly API on your behalf. Security is a shared responsibility between the MCP server and your organization.

| Category                | Spreedly MCP Server                                                                   | Customer                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Credential security** | Isolates credentials in closure; never serializable, never logged                     | Provisions, rotates, and secures credential storage (env vars, secret managers)                     |
| **Transport security**  | Enforces HTTPS for all Spreedly API calls; redacts credentials from errors            | Network segmentation, firewall rules, restricting who can reach the MCP server                      |
| **Input validation**    | Validates and sanitizes tool inputs                                                   | Configures [Tool Access Policy](../README.md#tool-access-policy) to limit available tool categories |
| **Audit logging**       | Emits structured JSON audit events to stderr for every tool invocation                | Captures stderr, routes to SIEM/log aggregator; retention, monitoring, and alerting                 |
| **AI provider**         | Hardens tool descriptions against prompt injection and tool shadowing                 | Selects AI provider; evaluates data handling, privacy policies, and jurisdictional requirements     |
| **Deployment**          | Ships with minimal dependencies; publishes with npm provenance attestation            | Isolates MCP server process, restricts access, keeps package updated                                |
| **PCI compliance**      | Does not store, process, or transmit cardholder data outside of API calls to Spreedly | Maintains own PCI compliance posture; see [Spreedly PCI guidance](https://www.spreedly.com/pci)     |

For audit logging responsibilities in detail, see the [Audit Logging](../README.md#audit-logging) section of the README.

For Spreedly's platform-level security posture (PCI DSS Level 1, SOC 2 Type 2, encryption standards), see [Spreedly Security & Compliance](https://www.spreedly.com/security-compliance).

For legal disclaimers covering AI integration, operational risk, and liability boundaries, see [DISCLAIMER.md](../DISCLAIMER.md).

## Deployment Recommendations

### Use Environment-Scoped Access Secrets

Organization-scoped secrets can authenticate against any environment. Use environment-scoped secrets to limit access to a single environment. See [Access Secret Scoping](#access-secret-scoping) above.

### Apply Least-Privilege Tool Access

The server defaults to read-only mode. Only enable the tool categories you need:

- `TRANSACTION_INITIATION_ENABLED` -- for processing payments
- `PAYMENT_METHOD_TOKENIZATION_ENABLED` -- for tokenizing card data
- `ADMINISTRATIVE_ENABLED` -- for creating gateways and environments (disable after setup)

See [Tool Access Policy](../README.md#tool-access-policy) for configuration details.

### Isolate the MCP Server

Run the MCP server in an environment where only authorized MCP clients can connect to it. The MCP protocol uses stdio transport -- the server communicates over stdin/stdout with the host process. Restrict which processes can launch the server.

### Keep the Package Updated

Subscribe to releases of `@spreedly/spreedly-mcp` and update promptly. Security fixes will be noted in the changelog.

### Enable Audit Logging

Audit logging is enabled by default. Do not disable it in production or PCI-scoped environments. Route the stderr output to your SIEM for monitoring and retention. See [Audit Logging](../README.md#audit-logging) for configuration and log format.

### Evaluate Your AI Provider

The MCP server sends tool call parameters and receives results through your AI provider. Consider:

- What data the AI provider retains from tool calls
- Where the provider processes and stores data (jurisdictional requirements)
- Whether the provider's data handling meets your compliance obligations

## References

- [Spreedly Credentials Documentation](https://docs.spreedly.com/basics/credentials/)
- [How do I rotate my Access Secret?](https://support.spreedly.com/hc/en-us/articles/4401990647579-How-do-I-rotate-my-Access-Secret)
- [Create and manage your Access Secrets](https://support.spreedly.com/hc/en-us/articles/360002679214-Create-and-manage-your-Access-Secrets)
- [Spreedly Security & Compliance](https://www.spreedly.com/security-compliance)
- [Spreedly PCI Compliance](https://www.spreedly.com/pci)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [SECURITY.md](../SECURITY.md) -- Vulnerability reporting
- [DISCLAIMER.md](../DISCLAIMER.md) -- Legal disclaimers
