# Repository instructions

- Every user-facing change, bug fix, refactor, release, or deployment change must update `README.md` in the same commit or pull request.
- Add the change under the current version's changelog section. Create a new version section when the package version changes.
- Keep older changelog sections intact so release history remains available.
- Preserve compatibility with existing IndexedDB data unless a documented migration and migration test are included.
- Run `npm test`, `npm run typecheck`, and `npm run build` before release when the environment supports dependency installation.
