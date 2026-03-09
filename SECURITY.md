# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in this package, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email <security@spreedly.com> with details
3. Include steps to reproduce the issue
4. We will respond within 48 hours

## Security Design

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

## Dependencies

This package has two runtime dependencies:

- `@modelcontextprotocol/sdk` -- MCP protocol implementation
- `zod` -- Input validation

Both are widely used, actively maintained, and regularly audited.
