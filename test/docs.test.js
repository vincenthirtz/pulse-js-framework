/**
 * Documentation Tests
 * Verifies docs structure, files, and deployment readiness
 *
 * Note: These tests verify file structure and content without
 * dynamically importing docs files (which use browser-specific paths).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');

// ============================================================================
// File Structure Tests
// ============================================================================

describe('File Structure', () => {
  test('docs/index.html exists', () => {
    assert.ok(existsSync(join(docsDir, 'index.html')), 'index.html should exist');
  });

  test('docs/src/main.js exists', () => {
    assert.ok(existsSync(join(docsDir, 'src/main.js')), 'main.js should exist');
  });

  test('docs/src/state.js exists', () => {
    assert.ok(existsSync(join(docsDir, 'src/state.js')), 'state.js should exist');
  });

  test('docs/src/styles.js exists', () => {
    assert.ok(existsSync(join(docsDir, 'src/styles.js')), 'styles.js should exist');
  });

  test('docs/src/highlighter.js exists', () => {
    assert.ok(existsSync(join(docsDir, 'src/highlighter.js')), 'highlighter.js should exist');
  });
});

// ============================================================================
// Required Pages Tests
// ============================================================================

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

describe('Required Pages', () => {
  for (const page of requiredPages) {
    test(`docs/src/pages/${page} exists`, () => {
      assert.ok(existsSync(join(docsDir, 'src/pages', page)), `${page} should exist`);
    });
  }
});

// ============================================================================
// Required Components Tests
// ============================================================================

const requiredComponents = [
  'Header.js',
  'Footer.js',
  'Search.js',
  'TableOfContents.js',
  'Breadcrumbs.js'
];

describe('Required Components', () => {
  for (const component of requiredComponents) {
    test(`docs/src/components/${component} exists`, () => {
      assert.ok(existsSync(join(docsDir, 'src/components', component)), `${component} should exist`);
    });
  }
});

// ============================================================================
// index.html Content Tests
// ============================================================================

describe('index.html Content', () => {
  test('index.html has DOCTYPE', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
  });

  test('index.html has html lang attribute', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('lang="en"'), 'Should have lang attribute');
  });

  test('index.html has charset', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('charset="UTF-8"'), 'Should have charset');
  });

  test('index.html has viewport meta tag', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('viewport'), 'Should have viewport meta');
    assert.ok(content.includes('width=device-width'), 'Viewport should be responsive');
  });

  test('index.html has title', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('<title>'), 'Should have title tag');
    assert.ok(content.includes('Pulse'), 'Title should mention Pulse');
  });

  test('index.html has app container', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('id="app"'), 'Should have app container');
  });

  test('index.html loads main.js', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('main.js'), 'Should load main.js');
    assert.ok(content.includes('type="module"'), 'Should use ES modules');
  });

  test('index.html has Open Graph meta tags', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('og:title'), 'Should have og:title');
    assert.ok(content.includes('og:description'), 'Should have og:description');
    assert.ok(content.includes('og:type'), 'Should have og:type');
    assert.ok(content.includes('og:url'), 'Should have og:url');
  });

  test('index.html has Twitter card meta tags', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('twitter:card'), 'Should have twitter:card');
    assert.ok(content.includes('twitter:title'), 'Should have twitter:title');
  });
});

// ============================================================================
// SEO Tests
// ============================================================================

describe('SEO', () => {
  test('index.html has meta description', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('name="description"'), 'Should have meta description');
  });

  test('index.html has meta keywords', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('name="keywords"'), 'Should have meta keywords');
  });

  test('index.html has canonical URL', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('rel="canonical"'), 'Should have canonical URL');
  });

  test('index.html has structured data (JSON-LD)', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('application/ld+json'), 'Should have JSON-LD');
    assert.ok(content.includes('@context'), 'JSON-LD should have @context');
    assert.ok(/["']https?:\/\/schema\.org["\/]/.test(content), 'Should reference schema.org as a full URL in JSON-LD context');
  });

  test('index.html has theme-color meta', () => {
    const content = readFileSync(join(docsDir, 'index.html'), 'utf-8');
    assert.ok(content.includes('theme-color'), 'Should have theme-color');
  });
});

// ============================================================================
// Version Sync Tests
// ============================================================================

describe('Version Synchronization', () => {
  test('docs version matches package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    const stateContent = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');

    const versionMatch = stateContent.match(/export const version = '([^']+)'/);
    assert.ok(versionMatch, 'Should have version export in state.js');

    assert.strictEqual(versionMatch[1], pkg.version, 'Docs version should match package.json');
  });
});

// ============================================================================
// Page Content Tests
// ============================================================================

describe('Page Content', () => {
  for (const page of requiredPages) {
    test(`${page} exports a function`, () => {
      const content = readFileSync(join(docsDir, 'src/pages', page), 'utf-8');
      const funcName = page.replace('.js', '');
      assert.ok(content.includes(`export function ${funcName}`), `Should export ${funcName} function`);
    });
  }

  test('ChangelogPage has version entries', () => {
    const content = readFileSync(join(docsDir, 'src/pages/ChangelogPage.js'), 'utf-8');
    assert.ok(content.includes('v1.'), 'Should have version entries');
    assert.ok(content.includes('changelog-section'), 'Should have changelog sections');
  });
});

// ============================================================================
// Component Content Tests
// ============================================================================

describe('Component Content', () => {
  test('Header.js exports Header function', () => {
    const content = readFileSync(join(docsDir, 'src/components/Header.js'), 'utf-8');
    assert.ok(content.includes('export function Header'), 'Should export Header');
  });

  test('Header.js uses version from state', () => {
    const content = readFileSync(join(docsDir, 'src/components/Header.js'), 'utf-8');
    assert.ok(content.includes('version'), 'Should use version');
  });

  test('Footer.js exports Footer function', () => {
    const content = readFileSync(join(docsDir, 'src/components/Footer.js'), 'utf-8');
    assert.ok(content.includes('export function Footer'), 'Should export Footer');
  });
});

// ============================================================================
// State Module Content Tests
// ============================================================================

describe('State Module', () => {
  test('state.js exports theme', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export const theme'), 'Should export theme');
  });

  test('state.js exports version', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export const version'), 'Should export version');
  });

  test('state.js exports navigation', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export const navStructure'), 'Should export navStructure');
    assert.ok(content.includes('export const navStructureFlat'), 'Should export navStructureFlat');
  });

  test('state.js exports translation functions for navigation', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export function getNavigation'), 'Should export getNavigation');
    assert.ok(content.includes('export function getNavigationFlat'), 'Should export getNavigationFlat');
  });

  test('state.js exports initRouter', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export function initRouter'), 'Should export initRouter');
  });

  test('state.js exports search state', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export const searchOpen'), 'Should export searchOpen');
  });

  test('state.js exports TOC state', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    assert.ok(content.includes('export const tocItems'), 'Should export tocItems');
    assert.ok(content.includes('export const currentSection'), 'Should export currentSection');
    assert.ok(content.includes('export const tocExpanded'), 'Should export tocExpanded');
  });

  test('state.js has all required routes', () => {
    const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
    const requiredPaths = ['/', '/getting-started', '/core-concepts', '/api-reference', '/examples'];
    for (const path of requiredPaths) {
      assert.ok(content.includes(`path: '${path}'`), `Should have route for ${path}`);
    }
  });
});

// ============================================================================
// i18n Tests
// ============================================================================

const supportedLocales = ['en', 'fr', 'de', 'es', 'ja', 'pt', 'is', 'eo'];

describe('i18n', () => {
  test('i18n/index.js exists', () => {
    assert.ok(existsSync(join(docsDir, 'src/i18n/index.js')), 'i18n/index.js should exist');
  });

  test('i18n/locales.js exists', () => {
    assert.ok(existsSync(join(docsDir, 'src/i18n/locales.js')), 'i18n/locales.js should exist');
  });

  for (const locale of supportedLocales) {
    test(`translations/${locale}/common.js exists`, () => {
      assert.ok(
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
      assert.ok(content.includes('nav:'), `${locale} should have nav section`);
      assert.ok(content.includes('home:'), `${locale} should have home key`);
      assert.ok(content.includes('learn:'), `${locale} should have learn key`);
      assert.ok(content.includes('reference:'), `${locale} should have reference key`);
      assert.ok(content.includes('gettingStarted:'), `${locale} should have gettingStarted key`);
      assert.ok(content.includes('coreConcepts:'), `${locale} should have coreConcepts key`);
      assert.ok(content.includes('apiReference:'), `${locale} should have apiReference key`);
      assert.ok(content.includes('playground:'), `${locale} should have playground key`);
    });
  }

  test('locales.js has all supported locales', () => {
    const content = readFileSync(join(docsDir, 'src/i18n/locales.js'), 'utf-8');
    for (const locale of supportedLocales) {
      assert.ok(content.includes(`${locale}:`), `Should have ${locale} locale`);
    }
  });

  test('locales.js has flags for all locales', () => {
    const content = readFileSync(join(docsDir, 'src/i18n/locales.js'), 'utf-8');
    assert.ok(content.includes('flag:'), 'Should have flag property');
    // Check for SVG flags
    assert.ok(content.includes('<svg'), 'Should have SVG flags');
  });

  // Check theme keys in all locales
  for (const locale of supportedLocales) {
    test(`${locale}/common.js has theme keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      assert.ok(content.includes('theme:'), `${locale} should have theme section`);
      assert.ok(content.includes('switchToLight:'), `${locale} should have switchToLight key`);
      assert.ok(content.includes('switchToDark:'), `${locale} should have switchToDark key`);
    });
  }

  // Check apiReference keys in pages.js (pages.js overwrites common.js when merged)
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has apiReference page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('apiReference:'), `${locale} pages.js should have apiReference section`);
      assert.ok(content.includes('searchPlaceholder:'), `${locale} pages.js should have searchPlaceholder key`);
      assert.ok(content.includes('filter:'), `${locale} pages.js should have filter key`);
      assert.ok(content.includes('typescriptSupport:'), `${locale} pages.js should have typescriptSupport key`);
      assert.ok(content.includes('domSection:'), `${locale} pages.js should have domSection key`);
      assert.ok(content.includes('routerSection:'), `${locale} pages.js should have routerSection key`);
      assert.ok(content.includes('storeSection:'), `${locale} pages.js should have storeSection key`);
      assert.ok(content.includes('hmrSection:'), `${locale} pages.js should have hmrSection key`);
      assert.ok(content.includes('nextMobile:'), `${locale} pages.js should have nextMobile key`);
    });
  }

  // Check pages.js exists for all locales
  for (const locale of supportedLocales) {
    test(`translations/${locale}/pages.js exists`, () => {
      assert.ok(
        existsSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`)),
        `${locale}/pages.js should exist`
      );
    });
  }

  // Check home page keys in pages.js
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has home page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('home:'), `${locale} pages.js should have home section`);
      assert.ok(content.includes('title:'), `${locale} pages.js should have title key`);
      assert.ok(content.includes('tagline:'), `${locale} pages.js should have tagline key`);
      assert.ok(content.includes('getStarted:'), `${locale} pages.js should have getStarted key`);
    });
  }

  // Check gettingStarted page keys in pages.js
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has gettingStarted page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('gettingStarted:'), `${locale} pages.js should have gettingStarted section`);
      assert.ok(content.includes('installation:'), `${locale} pages.js should have installation key`);
    });
  }

  // Check coreConcepts page keys in pages.js (keys used by CoreConceptsPage.js)
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has coreConcepts page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('coreConcepts:'), `${locale} pages.js should have coreConcepts section`);
      assert.ok(content.includes('pulses:'), `${locale} pages.js should have pulses key`);
      assert.ok(content.includes('pulsesDesc:'), `${locale} pages.js should have pulsesDesc key`);
      assert.ok(content.includes('effects:'), `${locale} pages.js should have effects key`);
      assert.ok(content.includes('effectsDesc:'), `${locale} pages.js should have effectsDesc key`);
      assert.ok(content.includes('cssSelectorSyntax:'), `${locale} pages.js should have cssSelectorSyntax key`);
      assert.ok(content.includes('cssSelectorSyntaxDesc:'), `${locale} pages.js should have cssSelectorSyntaxDesc key`);
      assert.ok(content.includes('pulseFileSyntax:'), `${locale} pages.js should have pulseFileSyntax key`);
      assert.ok(content.includes('pulseFileSyntaxDesc:'), `${locale} pages.js should have pulseFileSyntaxDesc key`);
      assert.ok(content.includes('blocks:'), `${locale} pages.js should have blocks key`);
      assert.ok(content.includes('imports:'), `${locale} pages.js should have imports key`);
      assert.ok(content.includes('directives:'), `${locale} pages.js should have directives key`);
      assert.ok(content.includes('slots:'), `${locale} pages.js should have slots key`);
      assert.ok(content.includes('slotsDesc:'), `${locale} pages.js should have slotsDesc key`);
      assert.ok(content.includes('cssScoping:'), `${locale} pages.js should have cssScoping key`);
      assert.ok(content.includes('cssScopingDesc:'), `${locale} pages.js should have cssScopingDesc key`);
      assert.ok(content.includes('advancedRouting:'), `${locale} pages.js should have advancedRouting key`);
      assert.ok(content.includes('advancedRoutingDesc:'), `${locale} pages.js should have advancedRoutingDesc key`);
      assert.ok(content.includes('lazyLoading:'), `${locale} pages.js should have lazyLoading key`);
      assert.ok(content.includes('lazyLoadingDesc:'), `${locale} pages.js should have lazyLoadingDesc key`);
      assert.ok(content.includes('middleware:'), `${locale} pages.js should have middleware key`);
      assert.ok(content.includes('middlewareDesc:'), `${locale} pages.js should have middlewareDesc key`);
    });
  }

  // Check debugging page keys in pages.js
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has debugging page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('debugging:'), `${locale} pages.js should have debugging section`);
      assert.ok(content.includes('sourceMaps:'), `${locale} pages.js should have sourceMaps key`);
      assert.ok(content.includes('loggerApi:'), `${locale} pages.js should have loggerApi key`);
      assert.ok(content.includes('reactivityDebugging:'), `${locale} pages.js should have reactivityDebugging key`);
      assert.ok(content.includes('routerDebugging:'), `${locale} pages.js should have routerDebugging key`);
      assert.ok(content.includes('hmrDebugging:'), `${locale} pages.js should have hmrDebugging key`);
      assert.ok(content.includes('commonErrors:'), `${locale} pages.js should have commonErrors key`);
      assert.ok(content.includes('nextApiReference:'), `${locale} pages.js should have nextApiReference key`);
    });
  }

  // Check security page keys in pages.js
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has security page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('security:'), `${locale} pages.js should have security section`);
      assert.ok(content.includes('xssPrevention:'), `${locale} pages.js should have xssPrevention key`);
      assert.ok(content.includes('urlSanitization:'), `${locale} pages.js should have urlSanitization key`);
      assert.ok(content.includes('formSecurity:'), `${locale} pages.js should have formSecurity key`);
      assert.ok(content.includes('csp:'), `${locale} pages.js should have csp key`);
    });
  }

  // Check performance page keys in pages.js
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has performance page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('performance:'), `${locale} pages.js should have performance section`);
      assert.ok(content.includes('lazyComputed:'), `${locale} pages.js should have lazyComputed key`);
      assert.ok(content.includes('listKeying:'), `${locale} pages.js should have listKeying key`);
      assert.ok(content.includes('batching:'), `${locale} pages.js should have batching key`);
      assert.ok(content.includes('memoization:'), `${locale} pages.js should have memoization key`);
    });
  }

  // Check errorHandling page keys in pages.js (keys used by ErrorHandlingPage.js)
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has errorHandling page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('errorHandling:'), `${locale} pages.js should have errorHandling section`);
      assert.ok(content.includes('effectErrors:'), `${locale} pages.js should have effectErrors key`);
      assert.ok(content.includes('asyncErrors:'), `${locale} pages.js should have asyncErrors key`);
      assert.ok(content.includes('formErrors:'), `${locale} pages.js should have formErrors key`);
      assert.ok(content.includes('routerErrors:'), `${locale} pages.js should have routerErrors key`);
      assert.ok(content.includes('boundaries:'), `${locale} pages.js should have boundaries key`);
      assert.ok(content.includes('logging:'), `${locale} pages.js should have logging key`);
      assert.ok(content.includes('gracefulDegradation:'), `${locale} pages.js should have gracefulDegradation key`);
      assert.ok(content.includes('summary:'), `${locale} pages.js should have summary key`);
    });
  }

  // Check mobile page keys in pages.js (keys used by MobilePage.js)
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has mobile page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('mobile:'), `${locale} pages.js should have mobile section`);
      assert.ok(content.includes('overview:'), `${locale} pages.js should have overview key`);
      assert.ok(content.includes('quickStart:'), `${locale} pages.js should have quickStart key`);
      assert.ok(content.includes('cliCommands:'), `${locale} pages.js should have cliCommands key`);
      assert.ok(content.includes('configuration:'), `${locale} pages.js should have configuration key`);
      assert.ok(content.includes('configurationDesc:'), `${locale} pages.js should have configurationDesc key`);
      assert.ok(content.includes('nativeApis:'), `${locale} pages.js should have nativeApis key`);
      assert.ok(content.includes('requirements:'), `${locale} pages.js should have requirements key`);
      assert.ok(content.includes('requirementsAndroid:'), `${locale} pages.js should have requirementsAndroid key`);
      assert.ok(content.includes('requirementsIos:'), `${locale} pages.js should have requirementsIos key`);
      assert.ok(content.includes('nextExamples:'), `${locale} pages.js should have nextExamples key`);
    });
  }

  // Check playground page keys in pages.js (full translations)
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has full playground page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('playground:'), `${locale} pages.js should have playground section`);
      assert.ok(content.includes('codeEditor:'), `${locale} pages.js should have codeEditor key`);
      assert.ok(content.includes('preview:'), `${locale} pages.js should have preview key`);
      assert.ok(content.includes('run:'), `${locale} pages.js should have run key`);
      assert.ok(content.includes('reset:'), `${locale} pages.js should have reset key`);
      assert.ok(content.includes('share:'), `${locale} pages.js should have share key`);
      assert.ok(content.includes('ready:'), `${locale} pages.js should have ready key`);
      assert.ok(content.includes('running:'), `${locale} pages.js should have running key`);
      assert.ok(content.includes('success:'), `${locale} pages.js should have success key`);
      assert.ok(content.includes('errorPrefix:'), `${locale} pages.js should have errorPrefix key`);
      assert.ok(content.includes('templates:'), `${locale} pages.js should have templates key`);
      assert.ok(content.includes('templateCounter:'), `${locale} pages.js should have templateCounter key`);
      assert.ok(content.includes('templateTodo:'), `${locale} pages.js should have templateTodo key`);
      assert.ok(content.includes('templateTimer:'), `${locale} pages.js should have templateTimer key`);
      assert.ok(content.includes('templateForm:'), `${locale} pages.js should have templateForm key`);
      assert.ok(content.includes('templateCalculator:'), `${locale} pages.js should have templateCalculator key`);
      assert.ok(content.includes('templateTabs:'), `${locale} pages.js should have templateTabs key`);
      assert.ok(content.includes('templateTheme:'), `${locale} pages.js should have templateTheme key`);
      assert.ok(content.includes('templateSearch:'), `${locale} pages.js should have templateSearch key`);
      assert.ok(content.includes('templateCart:'), `${locale} pages.js should have templateCart key`);
      assert.ok(content.includes('templateAnimation:'), `${locale} pages.js should have templateAnimation key`);
    });
  }

  // Check examples page keys in pages.js (full translations with example cards)
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has full examples page keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('examples:'), `${locale} pages.js should have examples section`);
      assert.ok(content.includes('viewDemo:'), `${locale} pages.js should have viewDemo key`);
      assert.ok(content.includes('viewSource:'), `${locale} pages.js should have viewSource key`);
      assert.ok(content.includes('runLocally:'), `${locale} pages.js should have runLocally key`);
      assert.ok(content.includes('runLocallyDesc:'), `${locale} pages.js should have runLocallyDesc key`);
      assert.ok(content.includes('createYourOwn:'), `${locale} pages.js should have createYourOwn key`);
      assert.ok(content.includes('createYourOwnDesc:'), `${locale} pages.js should have createYourOwnDesc key`);
      assert.ok(content.includes('mobileExamples:'), `${locale} pages.js should have mobileExamples key`);
      assert.ok(content.includes('mobileExamplesDesc:'), `${locale} pages.js should have mobileExamplesDesc key`);
    });
  }

  // Check examples page has all example card keys
  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has hmrDemo example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('hmrDemo:'), `${locale} pages.js should have hmrDemo section`);
      assert.ok(content.includes('features:'), `${locale} pages.js should have features array`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has blog example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('blog:'), `${locale} pages.js should have blog section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has todoApp example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('todoApp:'), `${locale} pages.js should have todoApp section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has weatherApp example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('weatherApp:'), `${locale} pages.js should have weatherApp section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has ecommerce example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('ecommerce:'), `${locale} pages.js should have ecommerce section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has chatApp example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('chatApp:'), `${locale} pages.js should have chatApp section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has routerDemo example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('routerDemo:'), `${locale} pages.js should have routerDemo section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has storeDemo example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('storeDemo:'), `${locale} pages.js should have storeDemo section`);
    });
  }

  for (const locale of supportedLocales) {
    test(`${locale}/pages.js has dashboard example keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      assert.ok(content.includes('dashboard:'), `${locale} pages.js should have dashboard section`);
    });
  }

  // Check playground keys in all locales
  for (const locale of supportedLocales) {
    test(`${locale}/common.js has playground keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      assert.ok(content.includes('playground:'), `${locale} should have playground section`);
      assert.ok(content.includes('codeEditor:'), `${locale} should have codeEditor key`);
      assert.ok(content.includes('preview:'), `${locale} should have preview key`);
      assert.ok(content.includes('templates:'), `${locale} should have templates key`);
    });
  }

  // Check categories keys in all locales
  for (const locale of supportedLocales) {
    test(`${locale}/common.js has categories keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      assert.ok(content.includes('categories:'), `${locale} should have categories section`);
      assert.ok(content.includes('reactivity:'), `${locale} should have reactivity key`);
      assert.ok(content.includes('dom:'), `${locale} should have dom key`);
      assert.ok(content.includes('router:'), `${locale} should have router key`);
      assert.ok(content.includes('store:'), `${locale} should have store key`);
      assert.ok(content.includes('hmr:'), `${locale} should have hmr key`);
    });
  }

  // Check actions keys in all locales
  for (const locale of supportedLocales) {
    test(`${locale}/common.js has actions keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      assert.ok(content.includes('actions:'), `${locale} should have actions section`);
      assert.ok(content.includes('getStarted:'), `${locale} should have getStarted key`);
      assert.ok(content.includes('viewExamples:'), `${locale} should have viewExamples key`);
      assert.ok(content.includes('copy:'), `${locale} should have copy key`);
      assert.ok(content.includes('copied:'), `${locale} should have copied key`);
    });
  }

  // Check footer keys in all locales
  for (const locale of supportedLocales) {
    test(`${locale}/common.js has footer keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      assert.ok(content.includes('footer:'), `${locale} should have footer section`);
      assert.ok(content.includes('builtWith:'), `${locale} should have builtWith key`);
      assert.ok(content.includes('github:'), `${locale} should have github key`);
    });
  }

  // Check errors keys in all locales
  for (const locale of supportedLocales) {
    test(`${locale}/common.js has errors keys`, () => {
      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      assert.ok(content.includes('errors:'), `${locale} should have errors section`);
      assert.ok(content.includes('notFound:'), `${locale} should have notFound key`);
      assert.ok(content.includes('networkError:'), `${locale} should have networkError key`);
    });
  }
});

// ============================================================================
// Translation Key Consistency Tests
// ============================================================================

/**
 * Extract top-level section names from translation file
 */
function extractSections(content) {
  const sections = [];
  const sectionPattern = /^\s{2}(\w+)\s*:\s*\{/gm;
  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push(match[1]);
  }
  return sections.sort();
}

/**
 * Extract keys within a specific section
 */
function extractSectionKeys(content, section) {
  const keys = [];
  // Find the section
  const sectionRegex = new RegExp(`^\\s{2}${section}\\s*:\\s*\\{`, 'm');
  const sectionMatch = content.match(sectionRegex);
  if (!sectionMatch) return keys;

  const startIndex = sectionMatch.index + sectionMatch[0].length;
  let braceCount = 1;
  let currentPos = startIndex;
  let sectionContent = '';

  while (braceCount > 0 && currentPos < content.length) {
    const char = content[currentPos];
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    if (braceCount > 0) sectionContent += char;
    currentPos++;
  }

  // Extract keys from section content (first level only for simplicity)
  const keyPattern = /^\s*(['"]?)(\w+)\1\s*:/gm;
  let match;
  while ((match = keyPattern.exec(sectionContent)) !== null) {
    keys.push(match[2]);
  }

  return keys.sort();
}

// Reference locale (English)
const referenceLocale = 'en';

// Key sections to check for consistency
const commonSections = ['nav', 'theme', 'actions', 'footer', 'errors', 'categories', 'playground'];
const pageSections = ['home', 'gettingStarted', 'coreConcepts', 'apiReference', 'examples', 'playground', 'debugging', 'security', 'performance', 'errorHandling', 'mobile', 'changelog'];

describe('Translation Key Consistency', () => {
  // Test that all locales have the same sections in common.js
  test('All locales have same sections in common.js', () => {
    const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/common.js`), 'utf-8');
    const refSections = extractSections(refContent);

    for (const locale of supportedLocales) {
      if (locale === referenceLocale) continue;

      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      const sections = extractSections(content);

      // Check for missing sections
      const missing = refSections.filter(s => !sections.includes(s));
      assert.ok(missing.length === 0, `${locale}/common.js missing sections: ${missing.join(', ')}`);

      // Check for extra sections
      const extra = sections.filter(s => !refSections.includes(s));
      assert.ok(extra.length === 0, `${locale}/common.js has extra sections: ${extra.join(', ')}`);
    }
  });

  // Test that all locales have the same sections in pages.js
  test('All locales have same sections in pages.js', () => {
    const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/pages.js`), 'utf-8');
    const refSections = extractSections(refContent);

    for (const locale of supportedLocales) {
      if (locale === referenceLocale) continue;

      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      const sections = extractSections(content);

      // Check for missing sections
      const missing = refSections.filter(s => !sections.includes(s));
      assert.ok(missing.length === 0, `${locale}/pages.js missing sections: ${missing.join(', ')}`);

      // Check for extra sections
      const extra = sections.filter(s => !refSections.includes(s));
      assert.ok(extra.length === 0, `${locale}/pages.js has extra sections: ${extra.join(', ')}`);
    }
  });

  // Test key consistency for each section in common.js
  for (const section of commonSections) {
    test(`All locales have same keys in common.js ${section} section`, () => {
      const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/common.js`), 'utf-8');
      const refKeys = extractSectionKeys(refContent, section);

      for (const locale of supportedLocales) {
        if (locale === referenceLocale) continue;

        const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
        const keys = extractSectionKeys(content, section);

        // Check for missing keys
        const missing = refKeys.filter(k => !keys.includes(k));
        assert.ok(missing.length === 0, `${locale}/common.js ${section} missing keys: ${missing.join(', ')}`);

        // Check for extra keys
        const extra = keys.filter(k => !refKeys.includes(k));
        assert.ok(extra.length === 0, `${locale}/common.js ${section} has extra keys: ${extra.join(', ')}`);
      }
    });
  }

  // Test key consistency for each section in pages.js
  for (const section of pageSections) {
    test(`All locales have same keys in pages.js ${section} section`, () => {
      const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/pages.js`), 'utf-8');
      const refKeys = extractSectionKeys(refContent, section);

      for (const locale of supportedLocales) {
        if (locale === referenceLocale) continue;

        const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
        const keys = extractSectionKeys(content, section);

        // Check for missing keys
        const missing = refKeys.filter(k => !keys.includes(k));
        assert.ok(missing.length === 0, `${locale}/pages.js ${section} missing keys: ${missing.join(', ')}`);

        // Check for extra keys
        const extra = keys.filter(k => !refKeys.includes(k));
        assert.ok(extra.length === 0, `${locale}/pages.js ${section} has extra keys: ${extra.join(', ')}`);
      }
    });
  }

  // Test total key count consistency
  test('All locales have same number of keys in common.js', () => {
    const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/common.js`), 'utf-8');
    const refKeyCount = (refContent.match(/^\s+\w+\s*:/gm) || []).length;

    for (const locale of supportedLocales) {
      if (locale === referenceLocale) continue;

      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      const keyCount = (content.match(/^\s+\w+\s*:/gm) || []).length;

      // Allow small variance for nested objects
      const diff = Math.abs(keyCount - refKeyCount);
      assert.ok(diff <= 5, `${locale}/common.js has ${keyCount} keys, expected ~${refKeyCount} (diff: ${diff})`);
    }
  });

  test('All locales have same number of keys in pages.js', () => {
    const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/pages.js`), 'utf-8');
    const refKeyCount = (refContent.match(/^\s+\w+\s*:/gm) || []).length;

    for (const locale of supportedLocales) {
      if (locale === referenceLocale) continue;

      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      const keyCount = (content.match(/^\s+\w+\s*:/gm) || []).length;

      // Allow small variance for nested objects
      const diff = Math.abs(keyCount - refKeyCount);
      assert.ok(diff <= 10, `${locale}/pages.js has ${keyCount} keys, expected ~${refKeyCount} (diff: ${diff})`);
    }
  });

  // Test line count consistency for common.js
  test('All locales have same number of lines in common.js', () => {
    const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/common.js`), 'utf-8');
    const refLineCount = refContent.split('\n').length;

    for (const locale of supportedLocales) {
      if (locale === referenceLocale) continue;

      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
      const lineCount = content.split('\n').length;

      // Allow small variance for formatting differences
      const diff = Math.abs(lineCount - refLineCount);
      assert.ok(diff <= 5, `${locale}/common.js has ${lineCount} lines, expected ~${refLineCount} (diff: ${diff})`);
    }
  });

  // Test line count consistency for pages.js
  test('All locales have same number of lines in pages.js', () => {
    const refContent = readFileSync(join(docsDir, `src/i18n/translations/${referenceLocale}/pages.js`), 'utf-8');
    const refLineCount = refContent.split('\n').length;

    for (const locale of supportedLocales) {
      if (locale === referenceLocale) continue;

      const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/pages.js`), 'utf-8');
      const lineCount = content.split('\n').length;

      // Allow larger variance for formatting differences (e.g., single-line vs multi-line arrays)
      // Increased to 70 to accommodate LESS/Stylus example translations
      const diff = Math.abs(lineCount - refLineCount);
      assert.ok(diff <= 70, `${locale}/pages.js has ${lineCount} lines, expected ~${refLineCount} (diff: ${diff})`);
    }
  });
});

// ============================================================================
// Changelog Tests
// ============================================================================

describe('Changelog', () => {
  test('CHANGELOG.md exists', () => {
    assert.ok(existsSync(join(root, 'CHANGELOG.md')), 'CHANGELOG.md should exist');
  });

  test('CHANGELOG.md has proper format', () => {
    const content = readFileSync(join(root, 'CHANGELOG.md'), 'utf-8');
    assert.ok(content.includes('# Changelog'), 'Should have changelog header');
    assert.ok(content.includes('Keep a Changelog'), 'Should reference Keep a Changelog');
    assert.ok(content.includes('Semantic Versioning'), 'Should reference Semantic Versioning');
  });

  test('CHANGELOG.md has version entries', () => {
    const content = readFileSync(join(root, 'CHANGELOG.md'), 'utf-8');
    assert.ok(content.includes('## ['), 'Should have version entries');
    // Check for standard sections
    const hasSections = content.includes('### Added') ||
                        content.includes('### Changed') ||
                        content.includes('### Fixed');
    assert.ok(hasSections, 'Should have standard changelog sections');
  });
});

// ============================================================================
// Styles Tests
// ============================================================================

describe('Styles', () => {
  test('styles.js exports injectStyles', () => {
    const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
    assert.ok(content.includes('export function injectStyles') || content.includes('export default'),
      'Should export styles function');
  });

  test('styles.js has responsive styles', () => {
    const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
    assert.ok(content.includes('@media'), 'Should have media queries for responsive design');
  });

  test('styles.js has dark mode support', () => {
    const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
    assert.ok(content.includes('dark') || content.includes('theme'), 'Should support dark mode');
  });
});

// ============================================================================
// main.js Tests
// ============================================================================

describe('main.js', () => {
  test('main.js imports router', () => {
    const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
    assert.ok(content.includes('router') || content.includes('Router'), 'Should use router');
  });

  test('main.js uses baseRoutes from state.js', () => {
    const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
    assert.ok(content.includes('baseRoutes'), 'Should import baseRoutes from state.js');
  });

  test('main.js mounts to app', () => {
    const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
    assert.ok(content.includes('#app') || content.includes('app'), 'Should mount to app container');
  });
});
