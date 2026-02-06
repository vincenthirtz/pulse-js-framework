# Release Process

## Overview

The Pulse Framework uses a **two-step release process** to avoid redundant CI runs:

1. **Manual Release** workflow - Bumps version and creates tag (fast, no tests)
2. **Release** workflow - Automatically triggered by tag push (runs tests, creates GitHub release, publishes to npm)

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:** Push to `main` or `develop`, Pull Requests

**Jobs:**
- Security audit
- Tests (Node 18, 20, 22)
- Coverage
- Syntax check
- Build
- Deploy to Netlify (main branch only)

**Purpose:** Continuous integration for all code changes

---

### 2. Manual Release Workflow (`manual-release.yml`)

**Trigger:** Manual via GitHub Actions UI

**Input:** `release_type` (patch | minor | major)

**What it does:**
1. ✅ Bumps version in `package.json`
2. ✅ Updates `CHANGELOG.md` with commits since last tag
3. ✅ Commits changes to `main` branch
4. ✅ Creates and pushes git tag (e.g., `v0.1.5`)

**Duration:** ~30 seconds (no tests, no build)

**Purpose:** Quickly prepare a new release version

---

### 3. Release Workflow (`release.yml`)

**Trigger:** Automatically when a git tag `v*` is pushed

**What it does:**
1. ✅ Runs tests
2. ✅ Builds the project
3. ✅ Creates GitHub Release with changelog
4. ✅ Publishes to npm (requires `NPM_TOKEN` secret)

**Duration:** ~3-5 minutes

**Purpose:** Validate, package, and publish the release

---

## How to Create a Release

### Step 1: Run Manual Release

1. Go to **Actions** → **Manual Release**
2. Click **Run workflow**
3. Select branch: `main`
4. Choose release type:
   - **patch** - Bug fixes (0.1.4 → 0.1.5)
   - **minor** - New features (0.1.4 → 0.2.0)
   - **major** - Breaking changes (0.1.4 → 1.0.0)
5. Click **Run workflow**

This will:
- Bump version
- Update CHANGELOG.md
- Commit to main
- Create and push tag

### Step 2: Automatic Release (no action needed)

Once the tag is pushed, the **Release** workflow automatically:
- Runs all tests
- Builds the project
- Creates GitHub Release
- Publishes to npm

### Step 3: Verify

Check that:
- GitHub Release is created: https://github.com/vincenthirtz/pulse-js-framework/releases
- npm package is published: https://www.npmjs.com/package/pulse-js-framework

---

## Why Two Workflows?

**Problem:** Running all CI jobs (tests, build, deploy) just to bump a version is wasteful.

**Solution:**
- **Manual Release** only does version bumping (fast)
- **Release** workflow reuses existing CI infrastructure when tag is pushed
- No redundant test runs
- Clear separation of concerns

---

## Emergency: Manual Release

If workflows fail, you can release manually:

```bash
# 1. Bump version
npm version patch  # or minor, or major

# 2. Update CHANGELOG.md manually

# 3. Commit and push
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to X.Y.Z"
git push origin main

# 4. Create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The Release workflow will still trigger automatically from the tag.

---

## Rollback a Release

If you need to rollback:

```bash
# Delete remote tag
git push --delete origin vX.Y.Z

# Delete local tag
git tag -d vX.Y.Z

# Revert version commit
git revert HEAD
git push origin main
```

Then manually unpublish from npm (if already published):

```bash
npm unpublish pulse-js-framework@X.Y.Z
```

---

## Secrets Required

| Secret | Purpose | Where to get |
|--------|---------|--------------|
| `GITHUB_TOKEN` | Create releases | Auto-provided by GitHub Actions |
| `NETLIFY_AUTH_TOKEN` | Deploy docs | https://app.netlify.com/user/applications |
| `NETLIFY_SITE_ID` | Deploy docs | Netlify site settings |
| `NPM_TOKEN` | Publish to npm | https://www.npmjs.com/settings/~/tokens |
| `CODECOV_TOKEN` | Upload coverage | https://codecov.io |

---

## Troubleshooting

### "Tag already exists"

**Cause:** You're trying to create a tag that already exists.

**Fix:** Delete the tag first:
```bash
git push --delete origin vX.Y.Z
git tag -d vX.Y.Z
```

### "No changes to commit"

**Cause:** Version was already bumped manually.

**Fix:** Skip Manual Release workflow and push the tag directly:
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Release workflow fails tests

**Cause:** Tests are failing in the codebase.

**Fix:**
1. Fix the tests on `main` branch
2. Delete the tag: `git push --delete origin vX.Y.Z`
3. Re-run Manual Release workflow

### npm publish fails

**Cause:** Invalid or expired `NPM_TOKEN`.

**Fix:**
1. Generate new token at https://www.npmjs.com/settings/~/tokens
2. Update `NPM_TOKEN` secret in GitHub repository settings
3. Re-run the failed Release workflow

---

## Best Practices

1. **Always release from `main`** - Never from `develop` or feature branches
2. **Test thoroughly before release** - Ensure CI is green on `main`
3. **Follow semantic versioning**:
   - `patch` - Backwards-compatible bug fixes
   - `minor` - Backwards-compatible new features
   - `major` - Breaking changes
4. **Review CHANGELOG.md** - Ensure it accurately reflects changes
5. **Coordinate with team** - Announce releases in team chat

---

## Automation Future Improvements

Potential enhancements:

- [ ] Auto-generate release notes from conventional commits
- [ ] Pre-release versions (alpha, beta, rc)
- [ ] Release branches for major versions
- [ ] Automated changelog generation
- [ ] Slack/Discord notifications on release
- [ ] Automated deprecation warnings
