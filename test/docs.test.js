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

test('state.js exports translation functions for navigation', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export function getNavigation'), 'Should export getNavigation');
  assert(content.includes('export function getNavigationFlat'), 'Should export getNavigationFlat');
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
// i18n Tests
// ============================================================================

console.log('\ni18n:');

test('i18n/index.js exists', () => {
  assert(existsSync(join(docsDir, 'src/i18n/index.js')), 'i18n/index.js should exist');
});

test('i18n/locales.js exists', () => {
  assert(existsSync(join(docsDir, 'src/i18n/locales.js')), 'i18n/locales.js should exist');
});

const supportedLocales = ['en', 'fr', 'de', 'es', 'ja', 'pt', 'is', 'eo'];

for (const locale of supportedLocales) {
  test(`translations/${locale}/common.js exists`, () => {
    assert(
      existsSync(join(docsDir, `src/i18n/translations/${locale}/common.js`)),
      `${locale}/common.js should exist`
    );
  });
}

// Check that all nav keys exist in translation files
const requiredNavKeys = [
  'nav.home',
  'nav.learn',
  'nav.reference',
  'nav.examples',
  'nav.gettingStarted',
  'nav.coreConcepts',
  'nav.apiReference',
  'nav.debugging',
  'nav.security',
  'nav.performance',
  'nav.errorHandling',
  'nav.mobile',
  'nav.examplesPage',
  'nav.playground'
];

for (const locale of supportedLocales) {
  test(`${locale}/common.js has all nav keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('nav:'), `${locale} should have nav section`);
    assert(content.includes('home:'), `${locale} should have home key`);
    assert(content.includes('learn:'), `${locale} should have learn key`);
    assert(content.includes('reference:'), `${locale} should have reference key`);
    assert(content.includes('gettingStarted:'), `${locale} should have gettingStarted key`);
    assert(content.includes('coreConcepts:'), `${locale} should have coreConcepts key`);
    assert(content.includes('apiReference:'), `${locale} should have apiReference key`);
    assert(content.includes('playground:'), `${locale} should have playground key`);
  });
}

test('locales.js has all supported locales', () => {
  const content = readFileSync(join(docsDir, 'src/i18n/locales.js'), 'utf-8');
  for (const locale of supportedLocales) {
    assert(content.includes(`${locale}:`), `Should have ${locale} locale`);
  }
});

test('locales.js has flags for all locales', () => {
  const content = readFileSync(join(docsDir, 'src/i18n/locales.js'), 'utf-8');
  assert(content.includes('flag:'), 'Should have flag property');
  // Check for SVG flags
  assert(content.includes('<svg'), 'Should have SVG flags');
});

// Check theme keys in all locales
for (const locale of supportedLocales) {
  test(`${locale}/common.js has theme keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('theme:'), `${locale} should have theme section`);
    assert(content.includes('switchToLight:'), `${locale} should have switchToLight key`);
    assert(content.includes('switchToDark:'), `${locale} should have switchToDark key`);
  });
}

// Check apiReference keys in pages.js (pages.js overwrites common.js when merged)
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has apiReference page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('apiReference:'), `${locale} pages.js should have apiReference section`);
    assert(content.includes('searchPlaceholder:'), `${locale} pages.js should have searchPlaceholder key`);
    assert(content.includes('filter:'), `${locale} pages.js should have filter key`);
    assert(content.includes('typescriptSupport:'), `${locale} pages.js should have typescriptSupport key`);
    assert(content.includes('domSection:'), `${locale} pages.js should have domSection key`);
    assert(content.includes('routerSection:'), `${locale} pages.js should have routerSection key`);
    assert(content.includes('storeSection:'), `${locale} pages.js should have storeSection key`);
    assert(content.includes('hmrSection:'), `${locale} pages.js should have hmrSection key`);
    assert(content.includes('nextMobile:'), `${locale} pages.js should have nextMobile key`);
  });
}

// Check pages.js exists for all locales
for (const locale of supportedLocales) {
  test(`translations/${locale}/pages.js exists`, () => {
    assert(
      existsSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`)),
      `${locale}/pages.js should exist`
    );
  });
}

// Check home page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has home page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('home:'), `${locale} pages.js should have home section`);
    assert(content.includes('title:'), `${locale} pages.js should have title key`);
    assert(content.includes('tagline:'), `${locale} pages.js should have tagline key`);
    assert(content.includes('getStarted:'), `${locale} pages.js should have getStarted key`);
  });
}

// Check gettingStarted page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has gettingStarted page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('gettingStarted:'), `${locale} pages.js should have gettingStarted section`);
    assert(content.includes('installation:'), `${locale} pages.js should have installation key`);
  });
}

// Check coreConcepts page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has coreConcepts page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('coreConcepts:'), `${locale} pages.js should have coreConcepts section`);
    assert(content.includes('pulses:'), `${locale} pages.js should have pulses key`);
    assert(content.includes('effects:'), `${locale} pages.js should have effects key`);
  });
}

// Check debugging page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has debugging page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('debugging:'), `${locale} pages.js should have debugging section`);
    assert(content.includes('sourceMaps:'), `${locale} pages.js should have sourceMaps key`);
    assert(content.includes('loggerApi:'), `${locale} pages.js should have loggerApi key`);
    assert(content.includes('reactivityDebugging:'), `${locale} pages.js should have reactivityDebugging key`);
    assert(content.includes('routerDebugging:'), `${locale} pages.js should have routerDebugging key`);
    assert(content.includes('hmrDebugging:'), `${locale} pages.js should have hmrDebugging key`);
    assert(content.includes('commonErrors:'), `${locale} pages.js should have commonErrors key`);
    assert(content.includes('nextApiReference:'), `${locale} pages.js should have nextApiReference key`);
  });
}

// Check security page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has security page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('security:'), `${locale} pages.js should have security section`);
    assert(content.includes('xssPrevention:'), `${locale} pages.js should have xssPrevention key`);
    assert(content.includes('urlSanitization:'), `${locale} pages.js should have urlSanitization key`);
    assert(content.includes('formSecurity:'), `${locale} pages.js should have formSecurity key`);
    assert(content.includes('csp:'), `${locale} pages.js should have csp key`);
  });
}

// Check performance page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has performance page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('performance:'), `${locale} pages.js should have performance section`);
    assert(content.includes('lazyComputed:'), `${locale} pages.js should have lazyComputed key`);
    assert(content.includes('listKeying:'), `${locale} pages.js should have listKeying key`);
    assert(content.includes('batchingUpdates:'), `${locale} pages.js should have batchingUpdates key`);
    assert(content.includes('memoization:'), `${locale} pages.js should have memoization key`);
  });
}

// Check errorHandling page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has errorHandling page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('errorHandling:'), `${locale} pages.js should have errorHandling section`);
    assert(content.includes('effectErrorHandling:'), `${locale} pages.js should have effectErrorHandling key`);
    assert(content.includes('asyncErrorHandling:'), `${locale} pages.js should have asyncErrorHandling key`);
    assert(content.includes('formValidation:'), `${locale} pages.js should have formValidation key`);
  });
}

// Check mobile page keys in pages.js
for (const locale of supportedLocales) {
  test(`${locale}/pages.js has mobile page keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
    assert(content.includes('mobile:'), `${locale} pages.js should have mobile section`);
    assert(content.includes('platformDetection:'), `${locale} pages.js should have platformDetection key`);
    assert(content.includes('nativeStorage:'), `${locale} pages.js should have nativeStorage key`);
    assert(content.includes('deviceInfo:'), `${locale} pages.js should have deviceInfo key`);
    assert(content.includes('appLifecycle:'), `${locale} pages.js should have appLifecycle key`);
  });
}

// Check playground keys in all locales
for (const locale of supportedLocales) {
  test(`${locale}/common.js has playground keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('playground:'), `${locale} should have playground section`);
    assert(content.includes('codeEditor:'), `${locale} should have codeEditor key`);
    assert(content.includes('preview:'), `${locale} should have preview key`);
    assert(content.includes('templates:'), `${locale} should have templates key`);
  });
}

// Check categories keys in all locales
for (const locale of supportedLocales) {
  test(`${locale}/common.js has categories keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('categories:'), `${locale} should have categories section`);
    assert(content.includes('reactivity:'), `${locale} should have reactivity key`);
    assert(content.includes('dom:'), `${locale} should have dom key`);
    assert(content.includes('router:'), `${locale} should have router key`);
    assert(content.includes('store:'), `${locale} should have store key`);
    assert(content.includes('hmr:'), `${locale} should have hmr key`);
  });
}

// Check actions keys in all locales
for (const locale of supportedLocales) {
  test(`${locale}/common.js has actions keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('actions:'), `${locale} should have actions section`);
    assert(content.includes('getStarted:'), `${locale} should have getStarted key`);
    assert(content.includes('viewExamples:'), `${locale} should have viewExamples key`);
    assert(content.includes('copy:'), `${locale} should have copy key`);
    assert(content.includes('copied:'), `${locale} should have copied key`);
  });
}

// Check footer keys in all locales
for (const locale of supportedLocales) {
  test(`${locale}/common.js has footer keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('footer:'), `${locale} should have footer section`);
    assert(content.includes('builtWith:'), `${locale} should have builtWith key`);
    assert(content.includes('github:'), `${locale} should have github key`);
  });
}

// Check errors keys in all locales
for (const locale of supportedLocales) {
  test(`${locale}/common.js has errors keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('errors:'), `${locale} should have errors section`);
    assert(content.includes('notFound:'), `${locale} should have notFound key`);
    assert(content.includes('networkError:'), `${locale} should have networkError key`);
  });
}

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
