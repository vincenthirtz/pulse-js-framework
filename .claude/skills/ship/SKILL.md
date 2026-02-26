# Ship Skill

Run tests, commit, and push to develop in one step.

## Steps

1. Run the full test suite: `npm test`
2. If any tests fail, fix them before proceeding
3. Stage all changes: `git add -A`
4. Generate a descriptive commit message based on the staged changes (use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)
5. Commit the changes
6. Pull with rebase: `git pull --rebase origin develop`
7. Push to origin/develop: `git push origin develop`
8. Report: files changed, tests passed, commit hash
