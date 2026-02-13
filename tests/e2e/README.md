# E2E Tests for Pulse Framework Documentation

Automated end-to-end tests using Playwright to ensure the documentation site has no console errors, warnings, or broken functionality.

**Note**: These tests run **only in GitHub Actions** (CI/CD). Playwright is not installed locally to keep the project lightweight.

## What's Tested

✅ **Console Errors**: All pages checked for JavaScript errors
✅ **Network Errors**: Failed HTTP requests (404, 500, etc.)
✅ **Console Warnings**: JavaScript warnings
✅ **Multi-language**: Sample of localized pages (fr, es, de, pt, ja)
✅ **Interactive Features**: Search modal, mobile navigation, code playground
✅ **Basic Accessibility**: Missing alt text, aria-labels

## Running Tests (CI Only)

Tests run automatically on:
- **PR Previews**: After Netlify deployment completes
- **Scheduled**: Weekly on production (Monday 2 AM UTC)
- **Manual**: Via GitHub Actions `workflow_dispatch`

### Manual Test Run

1. Go to **Actions** → **E2E Tests**
2. Click **Run workflow**
3. Enter the base URL (e.g., `https://pulse-js.fr`)
4. Click **Run workflow**

### Running Locally (Optional)

If you need to run tests locally for debugging:

```bash
# Install Playwright (one-time)
npm install -D @playwright/test
npx playwright install chromium firefox

# Run tests
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test

# Or against deployed site
PLAYWRIGHT_BASE_URL=https://your-preview.netlify.app npx playwright test
```

**Note**: This is not required for normal development. Only use for debugging test failures.

## CI/CD Integration

Tests run automatically on:
- **PR Previews**: After Netlify deployment completes
- **Browsers Tested**: Chromium, Firefox (WebKit optional)

Results are:
- ✅ Posted as comment on PR
- 📊 Uploaded as GitHub Actions artifact
- 📋 Included in deployment summary

## Test Structure

```
tests/e2e/
├── console-errors.spec.js   # Main test file
└── README.md                # This file
```

## Configuration

See [`playwright.config.js`](../../playwright.config.js) for:
- Browser configurations
- Timeout settings
- Reporter options
- Parallel execution

## Adding New Routes

When adding new documentation pages:

1. Add route to `ROUTES` array in `console-errors.spec.js`:
   ```js
   const ROUTES = [
     // ... existing routes
     '/your-new-page',
   ];
   ```

2. Run tests to verify:
   ```bash
   npm run test:e2e
   ```

## Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.js`
- Check if dev server is running
- Verify page loads in browser manually

### False positives
- Some warnings are expected (e.g., experimental features)
- Filter out known warnings in `console-errors.spec.js`

### Network errors
- Check if external resources (CDNs, APIs) are accessible
- Verify CORS configuration

## Resources

- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Playwright](https://playwright.dev/docs/ci-intro)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
