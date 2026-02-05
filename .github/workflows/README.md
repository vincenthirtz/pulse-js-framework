# GitHub Actions Workflows

This directory contains automated workflows for the Pulse Framework project.

## Workflows

### 1. CI (Continuous Integration)
**File**: `ci.yml`
**Trigger**: Push to `main` branch or Pull Requests

**Features**:
- ✅ Concurrency control (cancels old runs)
- ✅ Security audit (npm audit)
- ✅ Parallel test matrix (Node.js 18, 20, 22)
- ✅ Coverage tracking with thresholds
- ✅ Bundle size monitoring
- ✅ Artifact compression
- ✅ Smart retention (30 days for main, 7 days for PRs)

**Jobs**:
1. **Security**: npm audit check (runs first, fast-fail)
2. **Test**: Run tests on Node.js 18, 20, 22 (parallel)
3. **Coverage**: Generate coverage report and check threshold (70%)
4. **Lint**: Syntax check for JavaScript files
5. **Build**: Build documentation site with size analysis
6. **Deploy**: Deploy to Netlify (production) on `main` branch

**After successful deployment**, the workflow prompts you to create a release with helpful links.

---

### 2. PR Preview
**File**: `pr-preview.yml`
**Trigger**: Pull Request opened/updated

**Features**:
- 🚀 Automatic preview deployment to Netlify
- 💬 Comments on PR with preview URL
- 🔄 Updates comment on new commits
- ⚡ Fast with node_modules caching

**What it does**:
- Builds the documentation site
- Deploys to unique Netlify preview URL
- Comments on PR with preview link
- Updates comment on each new push

**Example PR Comment**:
```
🚀 Preview Deployment Ready!

| Name    | Link                          |
|---------|-------------------------------|
| 🔍 Preview | Visit Preview               |
| 📝 Commit  | a1b2c3d                      |

Built with Netlify • Updated: Fri, 06 Feb 2026 12:34:56 GMT
```

---

### 3. Auto Label
**File**: `auto-label.yml`
**Trigger**: Pull Request opened/updated

**Features**:
- 🏷️ Auto-labels based on changed files
- 📊 PR analysis (files, lines, types)
- ⚠️ Breaking change detection
- 📏 Size labels (XS, S, M, L, XL)

**Labels Added**:
- **Area**: `documentation`, `tests`, `compiler`, `runtime`, `cli`, `examples`, `ci/cd`
- **Size**: `size/XS` (<10 lines), `size/S` (10-50), `size/M` (50-200), `size/L` (200-500), `size/XL` (>500)
- **Special**: `dependencies`, `security`, `performance`, `accessibility`, `breaking-change`

---

### 4. Setup Labels
**File**: `setup-labels.yml`
**Trigger**: Manual (workflow_dispatch)

**Purpose**: Create or update all standard labels for the repository.

**Usage**:
1. Go to Actions > Setup Labels
2. Click "Run workflow"
3. All labels are created/updated automatically

**Labels Created**:
- Type: `bug`, `enhancement`, `documentation`, `breaking-change`
- Area: `runtime`, `compiler`, `cli`, `tests`, `examples`, `ci/cd`
- Priority: `priority: high`, `priority: medium`, `priority: low`
- Size: `size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`
- Special: `dependencies`, `security`, `performance`, `accessibility`, `automated`, `good first issue`, `help wanted`

---

### 5. Create Release
**File**: `create-release.yml`
**Trigger**: Manual (workflow_dispatch)

**Purpose**: Automated release creation with version bumping and changelog generation.

**Usage**:
1. Go to [Actions > Create Release](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/create-release.yml)
2. Click **Run workflow**
3. Select options:
   - **Version type**: `patch`, `minor`, or `major`
   - **Title**: Optional release title (e.g., "Bug Fixes", "New Features")
   - **Auto-extract changelog**: Use git commits since last tag
   - **Skip docs test**: Skip documentation validation
   - **Discord webhook**: Optional Discord notification URL

**What it does**:
- ✅ Bumps version in `package.json`
- ✅ Updates `CHANGELOG.md`
- ✅ Updates docs changelog page
- ✅ Creates git commit and tag
- ✅ Pushes to GitHub
- ✅ Creates GitHub release (via `gh` CLI)
- ✅ Comments on recent PRs included in release
- ✅ Sends Discord notification (if webhook provided)

**Example**: After a successful Netlify deployment, you'll see:
```
✅ Deployment Successful!
📦 Netlify URL: https://deploy-preview-123--pulse-js.netlify.app

🚀 Ready to Create a Release?
- 🐛 Patch Release (bug fixes)
- ✨ Minor Release (new features)
- 💥 Major Release (breaking changes)
```

---

### 6. Release (Tag-based)
**File**: `release.yml`
**Trigger**: Push of version tags (e.g., `v1.7.34`)

**Jobs**:
- **Test**: Run all tests
- **Build**: Build for production
- **Release**: Create GitHub release with CHANGELOG.md content
- **Publish**: Publish to npm registry

**Usage**: This workflow is automatically triggered when the `create-release.yml` workflow pushes a tag.

---

## Dependabot

**File**: `.github/dependabot.yml`

Automatically checks for dependency updates:
- **npm dependencies**: Weekly (Monday 9am)
- **GitHub Actions**: Monthly
- Groups minor/patch updates
- Auto-labels with `dependencies` and `automated`

**Configuration**:
- Max 5 npm PRs at once
- Max 3 GitHub Actions PRs at once
- Commits prefixed with `chore(deps)` or `chore(ci)`

---

## Workflow Integration

### Full Release Flow

```
1. Push to main
   ↓
2. CI workflow runs
   ↓
3. Tests pass
   ↓
4. Build succeeds
   ↓
5. Deploy to Netlify ✅
   ↓
6. Summary shows "Ready to Create a Release?"
   ↓
7. Click link to trigger Create Release workflow
   ↓
8. Select version type (patch/minor/major)
   ↓
9. Create Release workflow runs
   ↓
10. Version bumped, changelog updated, tag created
    ↓
11. Tag pushed to GitHub
    ↓
12. Release workflow triggers (tag-based)
    ↓
13. GitHub release created, npm package published ✅
```

---

## Required Secrets

These must be configured in GitHub Settings > Secrets:

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `NETLIFY_AUTH_TOKEN` | Netlify authentication | CI (deploy) |
| `NETLIFY_SITE_ID` | Netlify site identifier | CI (deploy) |
| `NPM_TOKEN` | npm publish authentication | Release (publish) |
| `CODECOV_TOKEN` | Codecov upload (optional) | CI (coverage) |

---

## Local Testing

You can test the release command locally:

```bash
# Dry run (no changes)
node cli/index.js release patch --dry-run --from-commits

# Create patch release
node cli/index.js release patch --title "Bug Fixes" --from-commits --yes

# Create minor release with manual changelog
node cli/index.js release minor --title "New Features"
# (then enter changelog items interactively)

# Create major release with Discord notification
node cli/index.js release major --title "Breaking Changes" \
  --from-commits --yes \
  --discord-webhook "https://discord.com/api/webhooks/..."
```

---

## Tips

### Quick Release After Deployment

After a successful Netlify deployment:
1. Check the Actions summary for the deployment run
2. Click the appropriate release link (Patch/Minor/Major)
3. Click "Run workflow"
4. Release is created automatically!

### Auto-Extract Changelog from Commits

Use `--from-commits` flag or enable "Auto-extract changelog" option. The workflow will:
- Find all commits since last tag
- Parse conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
- Categorize into Added/Changed/Fixed/Removed
- Generate CHANGELOG.md entries automatically

### Discord Notifications

Add your Discord webhook URL to send release announcements:
```
🚀 Pulse Framework v1.7.34
Bug Fixes and Improvements

✨ Added
• New feature A
• New feature B

🐛 Fixed
• Bug fix 1
• Bug fix 2
```

---

## Troubleshooting

### "gh CLI not available"
The workflow installs `gh` CLI automatically. If you see this error locally:
```bash
# Install gh CLI
brew install gh  # macOS
# or
sudo apt install gh  # Ubuntu/Debian
```

### Release workflow fails
- Check that `GITHUB_TOKEN` has write permissions
- Verify `package.json` version is valid semver
- Ensure CHANGELOG.md is properly formatted

### Netlify deployment fails
- Verify `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` secrets
- Check build command in `package.json`: `npm run build:netlify`
- Ensure `dist/` directory is created

---

## Contributing

When adding or modifying workflows:
1. Test locally with `act` (GitHub Actions local runner) if possible
2. Use `workflow_dispatch` triggers for testing before merging
3. Add clear descriptions in workflow YAML files
4. Update this README with any changes
