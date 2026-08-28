# Releasing @spreedly/spreedly-mcp

How releases of `@spreedly/spreedly-mcp` are cut, versioned, and corrected.

## Versioning

- Versions follow [Semantic Versioning 2.0.0](https://semver.org/).
- Each release is tagged `v<version>`, matching `package.json` exactly.
  CI rejects a tag push if these disagree.
- Pre-releases use semver identifiers (e.g. `v1.5.0-rc.1`). CI publishes
  them under the `next` dist-tag; `latest` never points at a pre-release.

## Publishing

CI publishes to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers).
The `Release` workflow (`release.yml`) authenticates via GitHub OIDC and
uses no npm token. CI rejects a tag whose commit is not on `main`. Note
the workflow runs from the tagged commit, so its checks guard against
mistakes, not against a malicious tagger; the release environment's
required review is the control.

The publish job runs in the `release` GitHub Environment: a required
reviewer approves each release, and deployments are restricted to `v*`
tags (plus `main` for the manual dry run).

The trusted publisher on npmjs.com is pinned to org `spreedly`, repo
`spreedly-mcp`, workflow filename `release.yml`, and environment
`release`. Renaming the workflow file or the environment without
matching the npm-side setting fails publish until the two configs
agree again.

OIDC is not yet the only publish path. Until the npm-side teardown
completes (revoke the legacy automation token, enable the package
setting that disallows token publishes, and reduce npm package owners
to the service account), token-based and interactive publishes remain
possible.

The publish step passes `--provenance` explicitly. npm auto-enables
provenance on the trusted-publishing path, but that auto-enable is
best-effort; the explicit flag turns a provenance-less publish into a
hard failure. Provenance attests that this workflow run at this ref
produced this tarball digest, not that the tarball matches the source
tree.

To verify the trusted-publisher config without publishing, run the
`Release` workflow manually (workflow_dispatch). It performs the full
OIDC token exchange and a `--dry-run` publish, and fails unless the
exchange succeeds.

## Immutability

- All tags are protected against deletion, update, and non-fast-forward
  moves via a GitHub ruleset.
- Published npm versions are not unpublished.
- CI creates each GitHub Release as a draft with the tarball, SBOM, and
  checksums attached. A maintainer reviews and publishes the draft.
  Attached assets are not replaced after that. Release notes text may be
  edited, e.g. to add a deprecation banner.
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
