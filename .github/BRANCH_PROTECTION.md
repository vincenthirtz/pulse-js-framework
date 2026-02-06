# Branch Protection Configuration

This document describes the branch protection rules that should be configured on GitHub.

## Protected Branches

### `main` - Production Branch

**Purpose**: Stable, production-ready code only. All releases are created from `main`.

**Protection Rules**:

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale pull request approvals when new commits are pushed: ✅
   - Require review from Code Owners: ✅

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✅
   - Required status checks:
     - `test` (Node 18, 20, 22)
     - `coverage`
     - `lint`
     - `build`
     - `security`

3. **Require conversation resolution before merging**: ✅

4. **Require signed commits**: ⚠️ (Optional, recommended for team projects)

5. **Require linear history**: ✅
   - Enforces merge commits or squash merging (no merge bubbles)

6. **Include administrators**: ✅
   - Enforce all configured restrictions for administrators

7. **Restrict pushes that create matching branches**: ✅
   - Only allow via pull requests

8. **Allow force pushes**: ❌ NEVER

9. **Allow deletions**: ❌ NEVER

---

### `develop` - Development Branch

**Purpose**: Integration branch for features. Staging deployments come from here.

**Protection Rules**:

1. **Require pull request reviews before merging**
   - Required approving reviews: 0 (can be 1 for stricter workflow)
   - Dismiss stale pull request approvals when new commits are pushed: ✅

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✅
   - Required status checks:
     - `test` (Node 18, 20, 22)
     - `coverage`
     - `lint`
     - `build`
     - `security`

3. **Require conversation resolution before merging**: ✅

4. **Require linear history**: ✅

5. **Allow force pushes**: ❌ (but can be enabled for maintainers)

6. **Allow deletions**: ❌

---

## Git Flow Strategy

### Branch Types

```
main (production)
  ← develop (staging)
      ← feature/* (new features)
      ← bugfix/* (bug fixes)
      ← hotfix/* (urgent production fixes)
```

### Workflow

1. **Feature Development**
   ```bash
   # Create feature branch from develop
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature

   # Work on feature
   git add .
   git commit -m "feat: add my feature"

   # Push and create PR to develop
   git push -u origin feature/my-feature
   # Create PR: feature/my-feature → develop
   ```

2. **Testing on Staging**
   ```bash
   # After PR is merged to develop
   # Staging is automatically deployed to Netlify
   # URL: https://staging--pulse-js.netlify.app
   ```

3. **Release to Production**
   ```bash
   # Option A: Manual via GitHub UI
   # Go to Actions > Promote to Main > Run workflow

   # Option B: Create PR manually
   git checkout develop
   git pull origin develop
   git checkout main
   git pull origin main
   git checkout -b release/v1.7.34
   git merge develop --no-ff
   git push -u origin release/v1.7.34
   # Create PR: release/v1.7.34 → main
   ```

4. **Hotfix (Emergency)**
   ```bash
   # Create hotfix from main
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug

   # Fix and test
   git add .
   git commit -m "fix: critical security issue"

   # Push and create PR to main
   git push -u origin hotfix/critical-bug
   # Create PR: hotfix/critical-bug → main

   # After merge to main, also merge back to develop
   git checkout develop
   git pull origin develop
   git merge main
   git push origin develop
   ```

---

## Setting Up Branch Protection (GitHub UI)

### Step-by-Step

1. **Go to Repository Settings**
   ```
   https://github.com/vincenthirtz/pulse-js-framework/settings
   ```

2. **Click "Branches" in left sidebar**

3. **Click "Add branch protection rule"**

4. **For `main` branch:**
   - Branch name pattern: `main`
   - Check the boxes as described above
   - Click "Create"

5. **Repeat for `develop` branch:**
   - Branch name pattern: `develop`
   - Check the boxes as described above
   - Click "Create"

---

## Setting Up via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# brew install gh  # macOS
# or visit https://cli.github.com/

# Authenticate
gh auth login

# Navigate to repository
cd /Users/Alicia/Documents/Vincent/pulse-js-framework

# Create branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test","coverage","lint","build","security"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true

# Create branch protection for develop
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test","coverage","lint","build","security"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":0,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true
```

---

## CODEOWNERS (Optional but Recommended)

Create `.github/CODEOWNERS` file:

```
# Default owner for everything
* @vincenthirtz

# Workflow files require review
/.github/workflows/ @vincenthirtz

# Release process
/cli/release.js @vincenthirtz

# Documentation
/docs/ @vincenthirtz
*.md @vincenthirtz
```

---

## Common Scenarios

### "I need to force push to main"
❌ **DON'T!** Branch protection prevents this.

Instead:
1. Create a revert commit
2. Open a PR with the fix
3. Merge through normal process

### "CI is failing but I need to merge urgently"
❌ **DON'T bypass checks!**

Instead:
1. Fix the failing check first
2. Or create a hotfix with proper testing
3. Merge when all checks pass

### "I accidentally committed to main"
If you haven't pushed yet:
```bash
git reset --soft HEAD~1
git checkout develop
git cherry-pick <commit-hash>
```

If you already pushed (and branch protection is not yet enabled):
```bash
git checkout main
git revert <commit-hash>
git push origin main

git checkout develop
git cherry-pick <original-commit-hash>
git push origin develop
```

---

## Verification

After setting up branch protection, verify:

```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push origin main
# Should get: "required status checks" error

# Try to force push (should fail)
git push --force origin main
# Should get: "protected branch" error
```

---

## Monitoring

Check branch protection status:
```bash
gh api repos/:owner/:repo/branches/main/protection
gh api repos/:owner/:repo/branches/develop/protection
```

View protected branches:
```
https://github.com/vincenthirtz/pulse-js-framework/settings/branches
```

---

## Maintenance

### Updating Protection Rules

If you need to add/remove status checks:

1. Go to Settings > Branches
2. Click "Edit" on the branch protection rule
3. Update required status checks
4. Save changes

Or via CLI:
```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test","coverage","lint","build","security","new-check"]}'
```

---

## Resources

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Git Flow Guide](https://nvie.com/posts/a-successful-git-branching-model/)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
