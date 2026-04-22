# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-04-22

### Changed

- Replaced example token-shaped audit log values in the README with explicit placeholders to avoid false positives from secret scanners
- Bumped package metadata after `v0.1.0` was already tagged on origin
- Removed public GitHub Issues references from package metadata

## [0.1.0] - 2025-03-04

### Added

- Initial release with 82 MCP tools across 13 domains
- Gateways: create, list, show, update, redact, retain, authorize, purchase, verify, store, general credit, list supported, list transactions
- Transactions: list, show, update, capture, void, credit, complete, confirm, transcript, workflow authorize/purchase/verify
- Payment Methods: create, list, show, update, retain, redact, recache, list transactions, list events, delete metadata, update gratis, show event, list all events
- Receivers: list supported, create, list, show, update, redact, deliver, export
- Certificates: create, generate, list, update
- Environments: create, list, show, update, access secret CRUD, regenerate signing secret
- Merchant Profiles: create, list, show, update
- Sub-Merchants: create, list, show, update
- Events: list, show
- Protection: forward claim, list events, show event, create/show provider
- SCA: authenticate, create/show provider
- Card Refresher: inquiry, show inquiry, list inquiries
- Network Tokenization: card metadata, token status
- Credential isolation via closure-based transport
- Input sanitization against Unicode injection and MCP protocol fragments
- Error redaction preventing credential leakage
- Hardened tool descriptions against prompt injection
- Comprehensive test suite (123 tests)
- Documentation: README, AGENTS.md, llms.txt, SECURITY.md
