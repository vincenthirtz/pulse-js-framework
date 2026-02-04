/**
 * Documentation Navigation Component Tests
 * Tests for Search, TableOfContents, and Breadcrumbs components
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');
const componentsDir = join(docsDir, 'src/components');

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
    console.log(`\u2713 ${name}`);
    passed++;
  } catch (error) {
    console.log(`\u2717 ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

console.log('\n--- Documentation Navigation Tests ---\n');

// ============================================================================
// File Structure Tests
// ============================================================================

console.log('Component Files:');

test('Search.js exists', () => {
  assert(existsSync(join(componentsDir, 'Search.js')), 'Search.js should exist');
});

test('TableOfContents.js exists', () => {
  assert(existsSync(join(componentsDir, 'TableOfContents.js')), 'TableOfContents.js should exist');
});

test('Breadcrumbs.js exists', () => {
  assert(existsSync(join(componentsDir, 'Breadcrumbs.js')), 'Breadcrumbs.js should exist');
});

// ============================================================================
// Search Component Tests
// ============================================================================

console.log('\nSearch Component:');

test('Search.js exports SearchButton', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('export function SearchButton'), 'Should export SearchButton');
});

test('Search.js exports SearchModal', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('export function SearchModal'), 'Should export SearchModal');
});

test('Search.js exports initSearchKeyboard', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('export function initSearchKeyboard'), 'Should export initSearchKeyboard');
});

test('Search.js has keyboard shortcut support (Cmd+K)', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('metaKey') || content.includes('ctrlKey'), 'Should handle meta/ctrl key');
  assert(content.includes("key === 'k'") || content.includes('key === "k"'), 'Should handle K key');
});

test('Search.js has keyboard navigation (arrows)', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('ArrowDown'), 'Should handle ArrowDown');
  assert(content.includes('ArrowUp'), 'Should handle ArrowUp');
  assert(content.includes('Enter'), 'Should handle Enter');
  assert(content.includes('Escape'), 'Should handle Escape');
});

test('Search.js uses navStructureFlat for results', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('navStructureFlat'), 'Should use navStructureFlat for search');
});

test('Search.js has ARIA accessibility attributes', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes("'role', 'dialog'") || content.includes('"role", "dialog"'), 'Should have dialog role');
  assert(content.includes('aria-modal'), 'Should have aria-modal');
  assert(content.includes("'role', 'listbox'") || content.includes('"role", "listbox"'), 'Should have listbox role');
});

test('Search.js imports from state.js', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('searchOpen'), 'Should import searchOpen');
  assert(content.includes('navigateLocale'), 'Should import navigateLocale');
});

test('Search.js has i18n support', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes("t(") || content.includes('t(\''), 'Should use translation function');
});

// ============================================================================
// TableOfContents Component Tests
// ============================================================================

console.log('\nTableOfContents Component:');

test('TableOfContents.js exports TocSidebar', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('export function TocSidebar'), 'Should export TocSidebar');
});

test('TableOfContents.js exports TocMobile', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('export function TocMobile'), 'Should export TocMobile');
});

test('TableOfContents.js exports extractHeadings', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('export function extractHeadings'), 'Should export extractHeadings');
});

test('TableOfContents.js exports updateTocItems', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('export function updateTocItems'), 'Should export updateTocItems');
});

test('TableOfContents.js has slugify function', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('function slugify'), 'Should have slugify function');
});

test('TableOfContents.js has scroll spy with IntersectionObserver', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('IntersectionObserver'), 'Should use IntersectionObserver');
});

test('TableOfContents.js handles h2 and h3 headings', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('h2') && content.includes('h3'), 'Should handle h2 and h3');
});

test('TableOfContents.js has excluded pages', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('EXCLUDED_PATHS') || content.includes('excludedPaths'), 'Should have excluded pages list');
  // Check for common excluded paths
  assert(content.includes("'/'"), 'Should exclude home page');
});

test('TableOfContents.js has smooth scroll', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes("behavior: 'smooth'") || content.includes('behavior: "smooth"'), 'Should have smooth scroll');
});

test('TableOfContents.js imports TOC state', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes('tocItems'), 'Should import tocItems');
  assert(content.includes('currentSection'), 'Should import currentSection');
});

test('TableOfContents.js has i18n support', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  assert(content.includes("t(") || content.includes('t(\''), 'Should use translation function');
});

// ============================================================================
// Breadcrumbs Component Tests
// ============================================================================

console.log('\nBreadcrumbs Component:');

test('Breadcrumbs.js exports Breadcrumbs', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes('export function Breadcrumbs'), 'Should export Breadcrumbs');
});

test('Breadcrumbs.js uses navStructure', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes('navStructure'), 'Should use navStructure for hierarchy');
});

test('Breadcrumbs.js uses navigateLocale for links', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes('navigateLocale'), 'Should use navigateLocale for navigation');
});

test('Breadcrumbs.js has ARIA label', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes('aria-label') || content.includes("aria-label'"), 'Should have aria-label');
});

test('Breadcrumbs.js hides on home page', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes("path === '/'") || content.includes('path === "/"'), 'Should check for home page');
});

test('Breadcrumbs.js has i18n support', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes("t(") || content.includes('t(\''), 'Should use translation function');
});

test('Breadcrumbs.js reacts to route changes', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes('effect'), 'Should use effect for reactivity');
  assert(content.includes('router') || content.includes('path'), 'Should track route changes');
});

// ============================================================================
// State Module Tests
// ============================================================================

console.log('\nState Module (Navigation):');

test('state.js exports searchOpen', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const searchOpen'), 'Should export searchOpen');
});

test('state.js exports tocItems', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const tocItems'), 'Should export tocItems');
});

test('state.js exports currentSection', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const currentSection'), 'Should export currentSection');
});

test('state.js exports tocExpanded', () => {
  const content = readFileSync(join(docsDir, 'src/state.js'), 'utf-8');
  assert(content.includes('export const tocExpanded'), 'Should export tocExpanded');
});

// ============================================================================
// main.js Integration Tests
// ============================================================================

console.log('\nmain.js Integration:');

test('main.js imports Search components', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('SearchModal'), 'Should import SearchModal');
  assert(content.includes('initSearchKeyboard'), 'Should import initSearchKeyboard');
});

test('main.js imports TableOfContents components', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('TocSidebar'), 'Should import TocSidebar');
  assert(content.includes('TocMobile'), 'Should import TocMobile');
  assert(content.includes('updateTocItems'), 'Should import updateTocItems');
});

test('main.js imports Breadcrumbs', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('Breadcrumbs'), 'Should import Breadcrumbs');
});

test('main.js initializes search keyboard', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('initSearchKeyboard()'), 'Should call initSearchKeyboard');
});

test('main.js updates TOC on route change', () => {
  const content = readFileSync(join(docsDir, 'src/main.js'), 'utf-8');
  assert(content.includes('updateTocItems()'), 'Should call updateTocItems');
});

// ============================================================================
// CSS Tests
// ============================================================================

console.log('\nStyles:');

test('styles.js has search styles', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('.search-btn'), 'Should have search button styles');
  assert(content.includes('.search-overlay'), 'Should have search overlay styles');
  assert(content.includes('.search-modal'), 'Should have search modal styles');
  assert(content.includes('.search-input'), 'Should have search input styles');
  assert(content.includes('.search-result'), 'Should have search result styles');
});

test('styles.js has TOC styles', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('.toc-sidebar'), 'Should have TOC sidebar styles');
  assert(content.includes('.toc-mobile'), 'Should have mobile TOC styles');
  assert(content.includes('.toc-link'), 'Should have TOC link styles');
  assert(content.includes('.toc-item'), 'Should have TOC item styles');
});

test('styles.js has breadcrumbs styles', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('.breadcrumbs'), 'Should have breadcrumbs styles');
  assert(content.includes('.breadcrumb-link'), 'Should have breadcrumb link styles');
  assert(content.includes('.breadcrumb-separator'), 'Should have breadcrumb separator styles');
});

test('styles.js has content wrapper styles', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('.content-wrapper'), 'Should have content wrapper styles');
});

test('styles.js has responsive TOC breakpoints', () => {
  const content = readFileSync(join(docsDir, 'src/styles.js'), 'utf-8');
  assert(content.includes('1200px'), 'Should have TOC breakpoint at 1200px');
});

// ============================================================================
// i18n Translation Tests
// ============================================================================

console.log('\ni18n Translations:');

const supportedLocales = ['en', 'fr', 'de', 'es', 'ja', 'pt', 'is', 'eo'];

test('English common.js has toc keys', () => {
  const content = readFileSync(join(docsDir, 'src/i18n/translations/en/common.js'), 'utf-8');
  assert(content.includes('toc:'), 'Should have toc section');
  assert(content.includes('title:'), 'Should have toc.title');
});

test('English common.js has breadcrumbs keys', () => {
  const content = readFileSync(join(docsDir, 'src/i18n/translations/en/common.js'), 'utf-8');
  assert(content.includes('breadcrumbs:'), 'Should have breadcrumbs section');
});

test('English common.js has search keys', () => {
  const content = readFileSync(join(docsDir, 'src/i18n/translations/en/common.js'), 'utf-8');
  assert(content.includes('search:'), 'Should have search section');
  assert(content.includes('noResults'), 'Should have noResults key');
});

// Check all locales have the new translation keys
for (const locale of supportedLocales) {
  test(`${locale}/common.js has toc keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('toc:'), `${locale} should have toc section`);
  });
}

for (const locale of supportedLocales) {
  test(`${locale}/common.js has breadcrumbs keys`, () => {
    const content = readFileSync(join(docsDir, `src/i18n/translations/${locale}/common.js`), 'utf-8');
    assert(content.includes('breadcrumbs:'), `${locale} should have breadcrumbs section`);
  });
}

// ============================================================================
// Header Integration Tests
// ============================================================================

console.log('\nHeader Integration:');

test('Header.js imports SearchButton', () => {
  const content = readFileSync(join(componentsDir, 'Header.js'), 'utf-8');
  assert(content.includes('SearchButton'), 'Should import SearchButton');
});

test('Header.js adds SearchButton to header', () => {
  const content = readFileSync(join(componentsDir, 'Header.js'), 'utf-8');
  assert(content.includes('SearchButton()'), 'Should use SearchButton component');
});

// ============================================================================
// Algorithm Tests (Static Analysis)
// ============================================================================

console.log('\nAlgorithm Patterns:');

test('slugify handles special characters', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  // Check for regex patterns that handle special chars
  assert(content.includes('toLowerCase'), 'slugify should lowercase');
  assert(content.includes('replace'), 'slugify should replace characters');
});

test('Search filters results case-insensitively', () => {
  const content = readFileSync(join(componentsDir, 'Search.js'), 'utf-8');
  assert(content.includes('toLowerCase'), 'Should use toLowerCase for case-insensitive search');
});

test('TOC handles unique IDs', () => {
  const content = readFileSync(join(componentsDir, 'TableOfContents.js'), 'utf-8');
  // Check for duplicate ID handling
  assert(
    content.includes('usedIds') || content.includes('uniqueId') || content.includes('counter'),
    'Should handle duplicate heading IDs'
  );
});

test('Breadcrumbs builds trail from navStructure', () => {
  const content = readFileSync(join(componentsDir, 'Breadcrumbs.js'), 'utf-8');
  assert(content.includes('trail') || content.includes('breadcrumb'), 'Should build breadcrumb trail');
  assert(content.includes('children'), 'Should traverse navStructure children');
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
