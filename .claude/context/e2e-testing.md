# E2E Testing - Playwright-based end-to-end tests for the documentation site.

## Overview

- **Framework:** Playwright
- **Location:** `tests/e2e/`
- **Runs in:** GitHub Actions CI/CD only (not required locally)
- **Coverage:** 160+ tests across 6 test files, 100% route coverage

## Test Categories

| File | Category | Tests Cover |
|------|----------|-------------|
| `accessibility.spec.js` | Accessibility | WCAG 2.1 AA compliance, headings, landmarks, color contrast, focus, ARIA |
| `interactive.spec.js` | Interactive Features | Dark mode, navigation, tab switching, code blocks, component interactions |
| `console-errors.spec.js` | Error Detection | Console errors, network errors, warnings across all pages |
| `server-components.spec.js` | Server Components | SSR, hydration, streaming, server actions documentation |
| `performance.spec.js` | Performance | Page load times, resource sizes, Core Web Vitals |
| `existing.spec.js` | Legacy | Original tests for basic page loads and rendering |

## Test Utilities

```javascript
// Common helpers - tests/e2e/utils/helpers.js
waitForPageReady(page)           // Wait for page + network idle
navigateAndWait(page, url)       // Navigate with full wait
getPageTitle(page)               // Extract h1 text
checkNoConsoleErrors(page)       // Assert no console errors

// A11y helpers - tests/e2e/utils/a11y-helpers.js
checkHeadingHierarchy(page)      // Validate heading levels
checkLandmarks(page)             // Check ARIA landmarks
checkColorContrast(page)         // WCAG contrast ratios
checkFocusManagement(page)       // Keyboard navigation
checkAriaAttributes(page)        // ARIA attribute validation

// Performance helpers - tests/e2e/utils/performance-helpers.js
measurePageLoad(page, url)       // Load time measurement
checkResourceSizes(page)         // Asset size validation
measureCoreWebVitals(page)       // LCP, FID, CLS metrics
```

## Installation

### CI (GitHub Actions) — automatic

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium
```

### Local (optional)

```bash
cd tests/e2e
npm install
npx playwright install chromium
```

## Running Tests

```bash
cd tests/e2e
npx playwright test                          # All tests
npx playwright test accessibility.spec.js    # Single suite
npx playwright test --grep "dark mode"       # Filter by name
npx playwright test --headed                 # Show browser
npx playwright test --debug                  # Step through
```

## CI/CD Integration

- Triggered on push to `main` and PRs targeting `main`
- Runs against Netlify deploy preview URLs
- Uses `chromium` only for speed
- Artifacts: HTML report uploaded on failure
- Timeout: 30s per test, 10min total

```yaml
# .github/workflows/e2e.yml (excerpt)
env:
  BASE_URL: ${{ github.event.deployment_status.target_url }}
```

## Adding New Tests

1. Create `tests/e2e/my-feature.spec.js`
2. Import helpers: `import { waitForPageReady } from './utils/helpers.js'`
3. Follow pattern:

```javascript
import { test, expect } from '@playwright/test';
import { navigateAndWait } from './utils/helpers.js';

test.describe('My Feature', () => {
  test('should work', async ({ page }) => {
    await navigateAndWait(page, '/my-page');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

## Phase Summary

| Phase | Status | Tests | Coverage |
|-------|--------|-------|----------|
| Phase 1 | Complete | ~60 | Infrastructure, a11y, interactive |
| Phase 2 | Complete | ~100 | Performance, error handling, server components |
| Phase 3 | Deferred | — | Responsive design, SEO, content validation |
