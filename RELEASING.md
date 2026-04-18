# Releasing @spreedly/spreedly-mcp

How releases of `@spreedly/spreedly-mcp` are cut, versioned, and corrected.

## Versioning

- Versions follow [Semantic Versioning 2.0.0](https://semver.org/).
- Each release is tagged `v<version>`, matching `package.json` exactly.
  CI rejects a tag push if these disagree.
- Pre-releases use semver identifiers (e.g. `v1.5.0-rc.1`).

## Immutability

- Tags matching `v*` are protected against deletion and non-fast-forward
  updates via a GitHub ruleset.
- Published npm versions are not unpublished.
- Release assets attached to a GitHub Release (tarball, SBOM, checksums)
  are not replaced after publish. Release notes text may be edited, e.g.
  to add a deprecation banner.
- `main` is protected against force-push and branch deletion.
- Version numbers are not reused, even after a failed publish.

## Correcting a release

If a published version is broken or insecure, the fix ships as a new
patch version and the old version is deprecated -- not deleted.

1. Publish the fix as a new patch release via the normal tag-push flow.
2. Deprecate the bad version on npm:
   `npm deprecate @spreedly/spreedly-mcp@<bad-version> "<reason and upgrade path>"`
3. Edit the GitHub Release notes of the superseded version to link the
   replacement. Attached assets stay in place.
4. For security issues, also follow [SECURITY.md](SECURITY.md).

Spreedly maintainers: operational step-by-step lives in the internal
**Spreedly MCP Release Runbook**.
