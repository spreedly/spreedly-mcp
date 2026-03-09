# Contributing to Spreedly MCP

Thank you for your interest in contributing! This guide covers how to set up a local development environment and run the MCP server against a real Spreedly environment.

## Prerequisites

- Node.js >= 18
- npm
- A Spreedly **test** environment with an environment key and access secret ([docs](https://docs.spreedly.com/basics/credentials/))

## Getting Started

```bash
git clone https://github.com/spreedly/spreedly-mcp.git
cd spreedly-mcp
npm install
npm run build
```

## Running Locally with an MCP Client

Before the package is published to npm, `npx @spreedly/spreedly-mcp@latest` won't work. Instead, point your MCP client at the locally built binary.

### 1. Build the project

```bash
npm run build
```

This compiles `src/` into `dist/bin.js`, which is the MCP server entry point.

Rebuild after every source change you want to test. For a faster feedback loop, you can keep a rebuild watcher running in a separate terminal:

```bash
npx tsup --watch
```

### 2. Configure your MCP client

Replace `<absolute-path-to-repo>` with the full path to your local clone (e.g. `/Users/you/repos/spreedly-mcp`).

#### Cursor

Create `.cursor/mcp.json` **in the project you're testing from** (not in this repo):

```json
{
  "mcpServers": {
    "spreedly": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/dist/bin.js"],
      "env": {
        "SPREEDLY_ENVIRONMENT_KEY": "<your-test-environment-key>",
        "SPREEDLY_ACCESS_SECRET": "<your-test-access-secret>"
      }
    }
  }
}
```

Alternatively, use the Cursor global MCP config at `~/.cursor/mcp.json` to avoid per-project files.

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "spreedly": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/dist/bin.js"],
      "env": {
        "SPREEDLY_ENVIRONMENT_KEY": "<your-test-environment-key>",
        "SPREEDLY_ACCESS_SECRET": "<your-test-access-secret>"
      }
    }
  }
}
```

#### VS Code

Edit `.vscode/mcp.json` in the project you're testing from:

```json
{
  "servers": {
    "spreedly": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/dist/bin.js"],
      "env": {
        "SPREEDLY_ENVIRONMENT_KEY": "<your-test-environment-key>",
        "SPREEDLY_ACCESS_SECRET": "<your-test-access-secret>"
      }
    }
  }
}
```

### 3. Restart your MCP client

Most MCP clients need a restart (or a "reload MCP servers" action) to pick up configuration changes.

## Security Guidelines for Contributors

### Use a test environment only

**Never** use production Spreedly credentials for development. Create a dedicated test environment from the [Spreedly dashboard](https://app.spreedly.com/). Test environments use simulated gateways and cannot process real payments.

### Never commit credentials

Credentials must stay out of version control. This repo's `.gitignore` excludes:

- `.env` and `.env.*` (except `.env.example`)
- `.cursor/` and `.vscode/` directories (which may contain MCP configs with credentials)

Before committing, verify you aren't including secrets:

```bash
git diff --cached  # review staged changes
```

### Where to store credentials

| Approach                                                 | Risk level         | Notes                                               |
| -------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| User-level MCP config (e.g. `~/.cursor/mcp.json`)        | Low                | Outside any repo, won't be committed                |
| Per-project `.cursor/mcp.json` in a **separate** project | Low                | Gitignored in that project too                      |
| Environment variables in your shell profile              | Low                | `export SPREEDLY_ENVIRONMENT_KEY=...` in `~/.zshrc` |
| Per-project `.cursor/mcp.json` **in this repo**          | Medium             | Gitignored here, but double-check before committing |
| Hardcoded in source                                      | **Do not do this** | Will be committed and exposed                       |

### If credentials are exposed

If you accidentally commit credentials:

1. **Rotate them immediately** in the [Spreedly dashboard](https://app.spreedly.com/)
2. Remove the commit from history (`git rebase` or `git filter-branch`)
3. Force-push the cleaned branch
4. Notify the team if it reached a shared branch

## Running Tests

```bash
npm test            # run all tests (uses mocks, no credentials needed)
npm run test:watch  # re-run on file changes
npm run typecheck   # type-check without emitting
npm run lint        # lint with ESLint
```

Tests use Vitest with mocked HTTP transport, so they don't require Spreedly credentials and don't make real API calls.

## Submitting Changes

1. Fork the repository
2. Create a feature branch from `main`
3. Write tests for your changes
4. Ensure all checks pass: `npm test && npm run typecheck && npm run lint`
5. Submit a pull request with a clear description of the change

## Project Structure

```
src/
├── bin.ts                 # CLI entry point (reads env vars, starts stdio server)
├── server.ts              # MCP server creation and tool registration
├── domains/               # One folder per Spreedly API domain
│   ├── index.ts           # Aggregates all tools
│   ├── gateways/          # Gateway tools, schemas, descriptions
│   ├── transactions/      # Transaction tools
│   ├── paymentMethods/    # Payment method tools
│   └── ...
├── security/              # Input sanitization, error redaction, middleware
└── transport/             # HTTP transport abstraction for the Spreedly API
```

Each domain folder contains:

- `tools.ts` -- tool definitions (name, handler, schema)
- `schemas.ts` -- Zod schemas for input validation
- `descriptions.ts` -- static tool description strings
