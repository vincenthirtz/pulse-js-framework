# CI/CD & Release - GitHub Actions workflows, release process, branch protection, and PR automation.

## Workflows Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `ci.yml` | Push to main/develop, PRs | Tests, coverage, lint, build, deploy |
| PR Preview | `pr-preview.yml` | PR opened/updated | Netlify preview deployment |
| Auto Label | `auto-label.yml` | PR opened/updated | Auto-label by files changed |
| Setup Labels | `setup-labels.yml` | Manual | Create/update all repo labels |
| Manual Release | `manual-release.yml` | Manual | Bump version + create tag |
| Release | `release.yml` | Tag push `v*` | Test, build, GitHub release, npm publish |

## CI Pipeline Jobs

1. **Security** — `npm audit` (fast-fail)
2. **Test** — Node.js 18, 20, 22 (parallel matrix)
3. **Coverage** — Report with 70% threshold
4. **Lint** — Syntax check
5. **Build** — Build docs site + size analysis
6. **Deploy** — Netlify (main branch only)

## Release Process

### Two-Step Release

1. **Manual Release** workflow: bumps version, updates CHANGELOG.md, commits to main, creates+pushes tag (~30s)
2. **Release** workflow: auto-triggered by tag → runs tests, builds, creates GitHub Release, publishes to npm (~3-5 min)

### How to Release

1. Go to **Actions → Manual Release → Run workflow**
2. Select branch `main`, choose type: `patch` | `minor` | `major`
3. Tag is auto-created → Release workflow triggers automatically

### Emergency Manual Release

```bash
npm version patch  # or minor/major
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to X.Y.Z"
git push origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Rollback

```bash
git push --delete origin vX.Y.Z
git tag -d vX.Y.Z
git revert HEAD && git push origin main
npm unpublish pulse-js-framework@X.Y.Z  # if published
```

## Branch Protection

| Branch | Required Approvals | Status Checks | Force Push |
|--------|-------------------|---------------|------------|
| `main` | 1 | CI must pass | Blocked |
| `develop` | 0 | CI must pass | Blocked |

### Git Flow

- `feature/*` → `develop` → `main`
- `bugfix/*` → `develop`
- `hotfix/*` → `main` (direct)

## PR Automation

### Auto-Labels

| Category | Labels |
|----------|--------|
| Area | `documentation`, `tests`, `compiler`, `runtime`, `cli`, `examples`, `ci/cd` |
| Size | `size/XS` (<10), `size/S` (10-50), `size/M` (50-200), `size/L` (200-500), `size/XL` (>500) |
| Special | `dependencies`, `security`, `performance`, `accessibility`, `breaking-change` |
| Priority | `priority: high`, `priority: medium`, `priority: low` |

### PR Preview

- Auto-deploys to Netlify preview URL
- Comments on PR with preview link
- Updates on each push

## Conventional Commits

```
feat: new feature          → minor release
fix: bug fix               → patch release
feat!: breaking change     → major release
chore: maintenance         → no release
docs: documentation        → no release
```

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | Auto-provided, creates releases |
| `NETLIFY_AUTH_TOKEN` | Deploy to Netlify |
| `NETLIFY_SITE_ID` | Netlify site ID |
| `NPM_TOKEN` | Publish to npm |
| `CODECOV_TOKEN` | Coverage upload (optional) |

## Dependabot

- npm: Weekly (Monday 9am), max 5 PRs
- GitHub Actions: Monthly, max 3 PRs
- Commits prefixed `chore(deps)` / `chore(ci)`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tag already exists | `git push --delete origin vX.Y.Z && git tag -d vX.Y.Z` |
| No changes to commit | Push tag directly: `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z` |
| npm publish fails | Regenerate NPM_TOKEN in npm settings, update GitHub secret |
| Netlify deploy fails | Verify NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID secrets |
