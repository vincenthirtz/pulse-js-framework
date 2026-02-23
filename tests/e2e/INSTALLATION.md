# E2E Test Dependencies Installation

This guide explains how to install dependencies for running e2e tests.

## CI Environment (Already Configured)

E2E tests run automatically in GitHub Actions with all dependencies pre-installed. **No local installation required for normal development.**

## Local Development Setup (Optional)

If you need to run tests locally for debugging:

### 1. Install Playwright

```bash
npm install -D @playwright/test
```

### 2. Install Browsers

```bash
npx playwright install chromium firefox
```

Or install all browsers:

```bash
npx playwright install
```

### 3. Install Accessibility Testing

```bash
npm install -D @axe-core/playwright
```

### 4. Install Performance Testing (Optional)

```bash
npm install -D playwright-lighthouse
```

**Note:** Lighthouse requires Chrome/Chromium and may have additional system dependencies.

## package.json Dependencies

Add to `devDependencies` section:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@axe-core/playwright": "^4.8.0",
    "playwright-lighthouse": "^3.2.0"
  }
}
```

## Verification

After installation, verify everything works:

```bash
# Check Playwright version
npx playwright --version

# List installed browsers
npx playwright install --list

# Run a simple test
npx playwright test accessibility.spec.js --headed
```

## System Requirements

- **Node.js**: >= 20.0.0
- **OS**: macOS, Linux, Windows (WSL)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: ~1GB for browsers

## CI-Only Installation

For CI environments (GitHub Actions), use this workflow step:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium firefox

- name: Install E2E dependencies
  run: npm install -D @playwright/test @axe-core/playwright
```

## Troubleshooting

### Browser Installation Fails

**Problem:** `npx playwright install` fails.

**Solution:**
```bash
# Install system dependencies first (Linux)
npx playwright install-deps

# Then install browsers
npx playwright install
```

### Permission Errors (macOS)

**Problem:** Permission denied during installation.

**Solution:**
```bash
# Fix permissions
sudo chown -R $(whoami) ~/.cache/ms-playwright

# Reinstall
npx playwright install
```

### Slow Installation

**Problem:** Browser downloads are slow.

**Solution:**
```bash
# Install only needed browsers
npx playwright install chromium firefox

# Skip browser download (use system browser)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -D @playwright/test
```

## Uninstallation

To remove Playwright and free up space:

```bash
# Remove npm packages
npm uninstall @playwright/test @axe-core/playwright playwright-lighthouse

# Remove installed browsers
rm -rf ~/.cache/ms-playwright
```

## Alternative: Docker

Run tests in Docker without local installation:

```bash
# Build container
docker build -t pulse-e2e -f tests/e2e/Dockerfile .

# Run tests
docker run -e PLAYWRIGHT_BASE_URL=http://host.docker.internal:3000 pulse-e2e
```

**Dockerfile example:**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tests/e2e ./tests/e2e

CMD ["npx", "playwright", "test"]
```

## Next Steps

After installation:
1. Start documentation dev server: `npm run docs`
2. Run tests: `npx playwright test`
3. View report: `npx playwright show-report`
4. Debug failing tests: `npx playwright test --debug`

For more information, see [README.md](./README-UPDATED.md).
