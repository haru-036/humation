# Releasing

Packages are published to npm by GitHub Actions with provenance, using npm Trusted Publishing
(OIDC). Nobody runs `npm publish` locally, and no npm token is stored anywhere.

## Steps

1. On `main`, bump every package and run the checks:

   ```bash
   bun run release:prepare -- 1.0.3 --write
   bun run test && bun run pack:smoke && bun run release:check
   ```

2. Commit as `Release v1.0.3` and push `main`.
3. Push the tag. This is what triggers the publish:

   ```bash
   git tag v1.0.3 && git push origin v1.0.3
   ```

   `.github/workflows/release.yml` runs typecheck, tests and the pack smoke test, verifies the
   tag matches every `packages/*/package.json` version, then publishes `@humation/core`,
   `@humation/assets-humation-1`, `@humation/react` and `@humation/web-component` with
   `--provenance`.

4. Create the GitHub Release for the tag (this is what the repository's "Latest" badge reads):

   ```bash
   gh release create v1.0.3 --title v1.0.3 --notes "..."
   ```

## Trusted publishers

Each of the four packages lists this repository and `release.yml` as its trusted publisher on
npmjs.com (package → Settings → Trusted Publisher). If the workflow file is renamed or moved to
another repository, update those four entries first or the publish step is rejected.

Provenance-published versions (1.0.3 and later) appear in this repository's **Packages** sidebar
and carry the provenance badge on npm.
