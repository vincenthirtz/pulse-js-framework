/**
 * Documentation Tests
 * Verifies docs structure, files, and deployment readiness
 *
 * Note: These tests verify file structure and content without
 * dynamically importing docs files (which use browser-specific paths).
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');

// Simple test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

console.log('\n--- Documentation Tests ---\n');

// ============================================================================
// File Structure Tests
// ============================================================================

console.log('File Structure:');

test('docs/index.html exists', () => {
  assert(existsSync(join(docsDir, 'index.html')), 'index.html should exist');
});

test('docs/src/main.js exists', () => {
  assert(existsSync(join(docsDir, 'src/main.js')), 'main.js should exist');
});

test('docs/src/state.js exists', () => {
  assert(existsSync(join(docsDir, 'src/state.js')), 'state.js should exist');
});

test('docs/src/styles.js exists', () => {
  assert(existsSync(join(docsDir, 'src/styles.js')), 'styles.js should exist');
});

test('docs/src/highlighter.js exists', () => {
  assert(existsSync(join(docsDir, 'src/highlighter.js')), 'highlighter.js should exist');
});

// ============================================================================
// Required Pages Tests
// ============================================================================

console.log('\nRequired Pages:');

const requiredPages = [
  'HomePage.js',
  'GettingStartedPage.js',
  'CoreConceptsPage.js',
  'ApiReferencePage.js',
  'ExamplesPage.js',
  'PlaygroundPage.js',
  'ChangelogPage.js',
  'MobilePage.js',
  'DebuggingPage.js'
];

for (const page of requiredPages) {
  test(`docs/src/pages/${page} exists`, () => {
    assert(existsSync(join(docsDir, 'src/pages', page)), `${page} should exist`);
  });
}

// ============================================================================
// Required Components Tests
// ============================================================================

console.log('\nRequired Components:');

const requiredComponents = [
  'Header.js',
  'Footer.js'
];

for (const component of requiredComponents) {
  test(`docs/src/components/${component} exists`, () => {
    assert(existsSync(join(docsDir, 'src/components', component)), `${component} should exist`);
  });
}

// ============================================================================
// index.html Content Tests
// ============================================================================

console.log('\nindex.html Content:');

test('index.html has DOCTYPE', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
});

test('index.html has html lang attribute', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('lang="en"'), 'Should have lang attribute');
});

test('index.html has charset', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('charset="UTF-8"'), 'Should have charset');
});

test('index.html has viewport meta tag', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('viewport'), 'Should have viewport meta');
  assert(content.includes('width=device-width'), 'Viewport should be responsive');
});

test('index.html has title', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('<title>'), 'Should have title tag');
  assert(content.includes('Pulse'), 'Title should mention Pulse');
});

test('index.html has app container', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('id="app"'), 'Should have app container');
});

test('index.html loads main.js', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('main.js'), 'Should load main.js');
  assert(content.includes('type="module"'), 'Should use ES modules');
});

test('index.html has Open Graph meta tags', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('og:title'), 'Should have og:title');
  assert(content.includes('og:description'), 'Should have og:description');
  assert(content.includes('og:type'), 'Should have og:type');
  assert(content.includes('og:url'), 'Should have og:url');
});

test('index.html has Twitter card meta tags', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('twitter:card'), 'Should have twitter:card');
  assert(content.includes('twitter:title'), 'Should have twitter:title');
});

// ============================================================================
// SEO Tests
// ============================================================================

console.log('\nSEO:');

test('index.html has meta description', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('name="description"'), 'Should have meta description');
});

test('index.html has meta keywords', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('name="keywords"'), 'Should have meta keywords');
});

test('index.html has canonical URL', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('rel="canonical"'), 'Should have canonical URL');
});

test('index.html has structured data (JSON-LD)', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('application/ld+json'), 'Should have JSON-LD');
  assert(content.includes('@context'), 'JSON-LD should have @context');
  assert(content.includes('schema.org'), 'Should use schema.org');
});

test('index.html has theme-color meta', () => {
  const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
  assert(content.includes('theme-color'), 'Should have theme-color');
});

// ============================================================================
// Version Sync Tests
// ============================================================================

console.log('\nVersion Synchronization:');

test('docs version matches package.json', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const stateContent = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');

  const versionMatch = stateContent.match(/export const version = '([^']+)'/);
  assert(versionMatch, 'Should have version export in state.js');

  assertEqual(versionMatch[1], pkg.version, 'Docs version should match package.json');
});

// ============================================================================
// Page Content Tests
// ============================================================================

console.log('\nPage Content:');

for (const page of requiredPages) {
  test(`${page} exports a function`, () => {
    const content = readFileSync(join(docsDir, 'src/pages', page), 'utf-8');
    const funcName = page.replace('.js', '');
    assert(content.includes(`export function ${funcName}`), `Should export ${funcName} function`);
  });
}

test('ChangelogPage has version entries', () => {
  const content = readFileSync(join(docsDir, 'src/pages/ChangelogPage.js'), 'utf-8');
  assert(content.includes('v1.'), 'Should have version entries');
  assert(content.includes('changelog-section'), 'Should have changelog sections');
});

// ============================================================================
// Component Content Tests
// ============================================================================

console.log('\nComponent Content:');

test('Header.js exports Header function', () => {
  const content = readFileSync(join(docsDir, 'src/components/Header.js'), 'utf-8');
  assert(content.includes('export function Header'), 'Should export Header');
});

test('Header.js uses version from state', () => {
  const content = readFileSync(join(docsDir, 'src/components/Header.js'), 'utf-8');
  assert(content.includes('version'), 'Should use version');
});

test('Footer.js exports Footer function', () => {
  const content = readFileSync(join(docsDir, 'src/components/Footer.js'), 'utf-8');
  assert(content.includes('export function Footer'), 'Should export Footer');
});

// ============================================================================
// State Module Content Tests
// ============================================================================

console.log('\nState Module:');

test('state.js exports theme', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const theme'), 'Should export theme');
});

test('state.js exports version', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const version'), 'Should export version');
});

test('state.js exports navigation', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const navigation'), 'Should export navigation');
  assert(content.includes('export const navigationFlat'), 'Should export navigationFlat');
});

test('state.js exports initRouter', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export function initRouter'), 'Should export initRouter');
});

test('state.js has all required routes', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  const requiredPaths = ['/', '/getting-started', '/core-concepts', '/api-reference', '/examples'];
  for (const path of requiredPaths) {
    assert(content.includes(`path: '${path}'`), `Should have route for ${path}`);
  }
});

// ============================================================================
// Changelog Tests
// ============================================================================

console.log('\nChangelog:');

test('CHANGELOG.md exists', () => {
  assert(existsSync(join(root, 'CHANGELOG.md')), 'CHANGELOG.md should exist');
});

test('CHANGELOG.md has proper format', () => {
  const content = readFileSync(join(root, 'CHANGELOG.md'), 'utf-8');
  assert(content.includes('# Changelog'), 'Should have changelog header');
  assert(content.includes('Keep a Changelog'), 'Should reference Keep a Changelog');
  assert(content.includes('Semantic Versioning'), 'Should reference Semantic Versioning');
});

test('CHANGELOG.md has version entries', () => {
  const content = readFileSync(join(root, 'CHANGELOG.md'), 'utf-8');
  assert(content.includes('## ['), 'Should have version entries');
  // Check for standard sections
  const hasSections = content.includes('### Added') ||
                      content.includes('### Changed') ||
                      content.includes('### Fixed');
  assert(hasSections, 'Should have standard changelog sections');
});

// ============================================================================
// Styles Tests
// ============================================================================

console.log('\nStyles:');

test('styles.js exports injectStyles', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('export function injectStyles') || content.includes('export default'),
    'Should export styles function');
});

test('styles.js has responsive styles', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('@media'), 'Should have media queries for responsive design');
});

test('styles.js has dark mode support', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('dark') || content.includes('theme'), 'Should support dark mode');
});

// ============================================================================
// main.js Tests
// ============================================================================

console.log('\nmain.js:');

test('main.js imports router', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('router') || content.includes('Router'), 'Should use router');
});

test('main.js imports pages', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('HomePage'), 'Should import HomePage');
});

test('main.js mounts to app', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('#app') || content.includes('app'), 'Should mount to app container');
});

// ============================================================================
// Results
// ============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
