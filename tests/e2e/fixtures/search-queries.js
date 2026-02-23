/**
 * Search Query Fixtures
 *
 * Test data for search functionality.
 */

export const VALID_QUERIES = [
  {
    query: 'pulse',
    expectedMinResults: 10,
    description: 'Core concept search'
  },
  {
    query: 'router',
    expectedMinResults: 5,
    description: 'Router documentation'
  },
  {
    query: 'effect',
    expectedMinResults: 5,
    description: 'Reactivity effect'
  },
  {
    query: 'el(',
    expectedMinResults: 5,
    description: 'DOM helper function'
  },
  {
    query: 'ssr',
    expectedMinResults: 3,
    description: 'Server-side rendering'
  },
  {
    query: 'accessibility',
    expectedMinResults: 3,
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
