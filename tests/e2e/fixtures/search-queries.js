/**
 * Search Query Fixtures
 *
 * Test data for search functionality.
 * Expected result counts are conservative minimums based on the search implementation:
 * - Pages are searched by label and description
 * - Quick links (API references) are searched by label, desc, and category
 * - External links are searched by label and desc
 * - Results are capped at 12 total
 */

export const VALID_QUERIES = [
  {
    query: 'pulse',
    expectedMinResults: 3,
    description: 'Core concept search'
  },
  {
    query: 'router',
    expectedMinResults: 1,
    description: 'Router documentation'
  },
  {
    query: 'effect',
    expectedMinResults: 1,
    description: 'Reactivity effect'
  },
  {
    query: 'el(',
    expectedMinResults: 1,
    description: 'DOM helper function'
  },
  {
    query: 'ssr',
    expectedMinResults: 1,
    description: 'Server-side rendering'
  },
  {
    query: 'accessibility',
    expectedMinResults: 1,
    description: 'Accessibility features'
  }
];

export const NO_RESULTS_QUERIES = [
  'zxczxczxczxc',
  'nonexistentfeature123',
  'qwerty12345'
];

export const FUZZY_SEARCH_QUERIES = [
  {
    query: 'routr',  // Typo: router
    shouldFindSomething: true
  },
  {
    query: 'efectt',  // Typo: effect
    shouldFindSomething: true
  }
];
