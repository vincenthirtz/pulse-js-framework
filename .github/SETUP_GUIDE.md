# Setup Guide - Git Flow & Branch Protection

Quick guide to complete the repository setup with branch protection.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Labels

Go to GitHub Actions and run the workflow:

```
Actions > Setup Labels > Run workflow
```

This creates all standard labels (25+ labels including area, size, priority).

### Step 2: Enable Branch Protection

#### Option A: Via GitHub UI (Recommended)

1. Go to **Settings** > **Branches**
2. Click **Add branch protection rule**

**For `main` branch**:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
  - Required approvals: 1
  - ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Required checks:
    - `test (18)`
    - `test (20)`
    - `test (22)`
    - `coverage`
    - `lint`
    - `build`
    - `security`
- ✅ Require conversation resolution before merging
- ✅ Require linear history
- ✅ Do not allow bypassing the above settings
- ❌ Allow force pushes: **Disabled**
- ❌ Allow deletions: **Disabled**

**For `develop` branch**:
- Branch name pattern: `develop`
- ✅ Require a pull request before merging
  - Required approvals: 0 (or 1 if you want stricter)
  - ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Required checks: (same as main)
    - `test (18)`, `test (20)`, `test (22)`
    - `coverage`
    - `lint`
    - `build`
    - `security`
- ✅ Require conversation resolution before merging
- ✅ Require linear history
- ❌ Allow force pushes: **Disabled**
- ❌ Allow deletions: **Disabled**

#### Option B: Via GitHub CLI

```bash
# Make sure gh CLI is installed and authenticated
gh auth login

# Navigate to repository
cd /path/to/pulse-js-framework

# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{
    "strict": true,
    "contexts": [
      "test (18)",
      "test (20)",
      "test (22)",
      "coverage",
      "lint",
      "build",
      "security"
    ]
  }' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  }' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true

# Protect develop branch
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{
    "strict": true,
    "contexts": [
      "test (18)",
      "test (20)",
      "test (22)",
      "coverage",
      "lint",
      "build",
      "security"
    ]
  }' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  }' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true
```

### Step 3: Verify Protection

Test that protection is working:

```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push origin main
# Expected: Error - protected branch

# Try to force push (should fail)
git push --force origin main
# Expected: Error - protected branch
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Labels created (check Issues > Labels)
- [ ] Branch protection active for `main`
- [ ] Branch protection active for `develop`
- [ ] Direct push to `main` blocked
- [ ] Direct push to `develop` blocked
- [ ] Force push blocked for both branches
- [ ] PR creation works
- [ ] PR preview deployment works
- [ ] Auto-labeling works on PRs
- [ ] CI runs on both branches

---

## 🎯 Usage Examples

### Creating a Feature

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/awesome-feature

# Make changes
git add .
git commit -m "feat: add awesome feature"

# Push
git push -u origin feature/awesome-feature

# Create PR on GitHub: feature/awesome-feature → develop
```

### Promoting to Production

**Option 1: Automated (Recommended)**

```bash
# Go to GitHub
# Actions > Promote to Main > Run workflow
# Select version type if creating release
```

**Option 2: Manual**

```bash
# Create PR on GitHub: develop → main
# Review changes
# Merge PR
# Production deploys automatically
```

### Creating a Release

After merging to `main`:

```bash
# Go to GitHub
# Actions > Create Release > Run workflow
# Select: patch, minor, or major
# Fill in release title (optional)
# Check "Auto-extract from commits" (optional)
# Run workflow

# Automated:
# - Version bumped in package.json
# - CHANGELOG.md updated
# - Git tag created
# - GitHub release created
# - npm package published
```

---

## 📊 Monitoring

### View Branch Protection Status

```bash
# Check main protection
gh api repos/:owner/:repo/branches/main/protection

# Check develop protection
gh api repos/:owner/:repo/branches/develop/protection
```

### View Workflow Runs

```bash
# List recent workflows
gh run list

# View specific run
gh run view <run-id>

# Watch current run
gh run watch
```

### View PRs

```bash
# List open PRs
gh pr list

# View specific PR
gh pr view <pr-number>

# Check PR status
gh pr checks <pr-number>
```

---

## 🔧 Troubleshooting

### "Status check not found"

If GitHub can't find required status checks:

1. Create a test PR to trigger workflows
2. Wait for checks to run
3. Check names match exactly in branch protection
4. Update branch protection rule with correct names

### "Required reviews not met"

If you're the only maintainer:

1. Go to branch protection settings
2. Uncheck "Include administrators"
3. Or reduce required reviews to 0
4. (Not recommended for team projects)

### "Outdated branch"

If PR is behind base branch:

```bash
# Update feature branch
git checkout feature/my-feature
git fetch origin
git merge origin/develop
git push
```

Or use GitHub's "Update branch" button on PR.

---

## 📚 Additional Resources

- [Branch Protection Guide](.github/BRANCH_PROTECTION.md)
- [Workflow README](.github/workflows/README.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [CI Improvements](CI_IMPROVEMENTS.md)

---

**Setup complete!** 🎉

Your repository now has:
- ✅ Protected `main` and `develop` branches
- ✅ Automated CI/CD pipeline
- ✅ PR previews and auto-labeling
- ✅ Security audits and dependency updates
- ✅ Release automation
- ✅ Comprehensive documentation

Happy coding! 🚀
