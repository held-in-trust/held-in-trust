# Pull Request Checklist

Thank you for contributing! Please review the following checklist to ensure your PR is ready for review.

## Summary
- [ ] Provide a clear and concise description of the changes.
- [ ] Link to any related issues using `Fixes #issue` or `Related to #issue`.

## Testing
- [ ] All new code is covered by unit tests where applicable.
- [ ] Existing tests pass locally (`cargo test` for contracts — see `CONTRIBUTING.md` for a known toolchain caveat; `npm test` for backend).
- [ ] Added tests for edge cases and error conditions.
- [ ] Updated `e2e/` scripts if you changed a contract's public interface.
- [ ] New migrations tested against a real Postgres instance, not just reviewed by eye.

## Documentation
- [ ] Updated `README.md` / `ARCHITECTURE.md` if changes affect users or the design.
- [ ] Updated `docs/RFC.md` if this changes the compliance-module interface or data model.

## Code Quality
- [ ] Follows the project's coding style and conventions.
- [ ] No commented-out code or debug statements left in the codebase.
- [ ] Variables and functions are named descriptively.
- [ ] Code is properly formatted (`cargo fmt` / `npm run lint`).
- [ ] No new clippy warnings (`cargo clippy`).

## Breaking Changes
- [ ] If this PR introduces breaking changes (compliance-module interface, contract entrypoints, migration schema), describe them and provide migration steps.
- [ ] Updated version in `Cargo.toml` / `package.json` if appropriate (following semver).

## Additional Notes
- [ ] Any other relevant information for reviewers.

Please ensure all checkboxes are checked (or explicitly marked N/A with a reason) before requesting a review.
