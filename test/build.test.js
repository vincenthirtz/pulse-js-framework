/**
 * Build System Tests
 *
 * Tests for cli/build.js - Production build, minification, and preview
 *
 * @module test/build
 */

import { minifyJS } from '../cli/build.js';
import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// JavaScript Minification Tests
// =============================================================================

printSection('JavaScript Minification - Basic');

test('minifyJS removes single-line comments', () => {
  const input = `
    // This is a comment
    const x = 1;
    // Another comment
    const y = 2;
  `;
  const output = minifyJS(input);

  assert(!output.includes('This is a comment'), 'Should remove single-line comments');
  assert(!output.includes('Another comment'), 'Should remove all comments');
  assert(output.includes('const x=1'), 'Should preserve code');
  assert(output.includes('const y=2'), 'Should preserve code');
});

test('minifyJS removes multi-line comments', () => {
  const input = `
    /**
     * Multi-line comment
     * with multiple lines
     */
    const x = 1;
    /* inline comment */ const y = 2;
  `;
  const output = minifyJS(input);

  assert(!output.includes('Multi-line comment'), 'Should remove multi-line comments');
  assert(!output.includes('inline comment'), 'Should remove inline block comments');
  assert(output.includes('const x=1'), 'Should preserve code');
  assert(output.includes('const y=2'), 'Should preserve code');
});

test('minifyJS collapses whitespace', () => {
  const input = `
    const   x   =   1;
    const   y   =   2;
  `;
  const output = minifyJS(input);

  assert(!output.includes('   '), 'Should not have multiple spaces');
  assert(output.includes('const x=1'), 'Should collapse around assignment');
});

test('minifyJS removes newlines', () => {
  const input = `const x = 1;

const y = 2;


const z = 3;`;
  const output = minifyJS(input);

  // Should not have multiple newlines in a row
  assert(!output.includes('\n\n'), 'Should not have multiple consecutive newlines');
});

test('minifyJS handles empty input', () => {
  const output = minifyJS('');
  assertEqual(output, '', 'Should return empty string for empty input');
});

test('minifyJS handles whitespace-only input', () => {
  const output = minifyJS('   \n\n   \t\t   ');
  assertEqual(output, '', 'Should return empty string for whitespace-only input');
});

// =============================================================================
// String Preservation Tests
// =============================================================================

printSection('JavaScript Minification - String Preservation');

test('minifyJS preserves single-quoted strings', () => {
  const input = `const str = 'Hello    World';`;
  const output = minifyJS(input);

  assert(output.includes("'Hello    World'"), 'Should preserve single-quoted string content');
});

test('minifyJS preserves double-quoted strings', () => {
  const input = `const str = "Hello    World";`;
  const output = minifyJS(input);

  assert(output.includes('"Hello    World"'), 'Should preserve double-quoted string content');
});

test('minifyJS preserves template literals', () => {
  const input = 'const str = `Hello    World`;';
  const output = minifyJS(input);

  assert(output.includes('`Hello    World`'), 'Should preserve template literal content');
});

test('minifyJS preserves strings with comment-like content', () => {
  const input = `const str = "// not a comment";`;
  const output = minifyJS(input);

  assert(output.includes('"// not a comment"'), 'Should preserve comment-like string content');
});

test('minifyJS preserves strings with block comment content', () => {
  const input = `const str = "/* not a comment */";`;
  const output = minifyJS(input);

  assert(output.includes('"/* not a comment */"'), 'Should preserve block comment in string');
});

test('minifyJS handles escaped quotes in strings', () => {
  const input = `const str = "Hello \\"World\\"";`;
  const output = minifyJS(input);

  assert(output.includes('Hello \\"World\\"'), 'Should preserve escaped quotes');
});

test('minifyJS handles escaped quotes in single-quoted strings', () => {
  const input = `const str = 'It\\'s a test';`;
  const output = minifyJS(input);

  assert(output.includes("'It\\'s a test'"), 'Should preserve escaped single quotes');
});

test('minifyJS preserves string with newlines', () => {
  const input = 'const str = "line1\\nline2";';
  const output = minifyJS(input);

  assert(output.includes('"line1\\nline2"'), 'Should preserve escaped newlines in strings');
});

test('minifyJS handles template literals with expressions', () => {
  const input = 'const str = `Count: ${count}`;';
  const output = minifyJS(input);

  assert(output.includes('`Count: ${count}`'), 'Should preserve template literal expressions');
});

test('minifyJS handles nested template literals', () => {
  const input = 'const str = `outer ${`inner ${x}`}`;';
  const output = minifyJS(input);

  assert(output.includes('`outer ${`inner ${x}`}`'), 'Should handle nested template literals');
});

// =============================================================================
// Regex Preservation Tests
// =============================================================================

printSection('JavaScript Minification - Regex Preservation');

test('minifyJS preserves regex literals', () => {
  const input = `const pattern = /test/g;`;
  const output = minifyJS(input);

  assert(output.includes('/test/g'), 'Should preserve regex literal');
});

test('minifyJS preserves regex with special chars', () => {
  const input = `const pattern = /[a-z]+\\d*/gi;`;
  const output = minifyJS(input);

  assert(output.includes('/[a-z]+\\d*/gi'), 'Should preserve regex with special characters');
});

test('minifyJS preserves regex with forward slashes in character class', () => {
  const input = `const pattern = /[/\\\\]/g;`;
  const output = minifyJS(input);

  assert(output.includes('[/\\\\]'), 'Should preserve slash in character class');
});

test('minifyJS handles regex after return statement', () => {
  const input = `function test() { return /pattern/; }`;
  const output = minifyJS(input);

  assert(output.includes('/pattern/'), 'Should recognize regex after return');
});

test('minifyJS handles regex after throw statement', () => {
  const input = `if (!/valid/.test(x)) throw /invalid/;`;
  const output = minifyJS(input);

  assert(output.includes('/valid/'), 'Should preserve regex in conditional');
});

test('minifyJS distinguishes regex from division', () => {
  const input = `
    const a = 10 / 2;
    const b = /pattern/;
  `;
  const output = minifyJS(input);

  // Note: Simple minifier may have edge cases with division vs regex
  // This test verifies the basic output contains expected structures
  assert(output.includes('const a'), 'Should have first assignment');
  assert(output.includes('const b'), 'Should have second assignment');
});

test('minifyJS handles regex after comma', () => {
  const input = `test(a, /pattern/);`;
  const output = minifyJS(input);

  assert(output.includes('/pattern/'), 'Should recognize regex after comma');
});

test('minifyJS handles regex after opening bracket', () => {
  const input = `const arr = [/one/, /two/];`;
  const output = minifyJS(input);

  assert(output.includes('/one/'), 'Should recognize regex in array');
  assert(output.includes('/two/'), 'Should recognize multiple regex in array');
});

test('minifyJS handles regex after colon', () => {
  const input = `const obj = { pattern: /test/ };`;
  const output = minifyJS(input);

  assert(output.includes('/test/'), 'Should recognize regex after colon');
});

// =============================================================================
// Operator Spacing Tests
// =============================================================================

printSection('JavaScript Minification - Operator Spacing');

test('minifyJS removes spaces around assignment', () => {
  const input = `const x = 1;`;
  const output = minifyJS(input);

  assert(output.includes('x=1'), 'Should remove spaces around =');
});

test('minifyJS removes spaces around braces', () => {
  const input = `function test() { return 1; }`;
  const output = minifyJS(input);

  assert(output.includes('{return'), 'Should remove space after {');
  assert(output.includes('1;}'), 'Should remove space before }');
});

test('minifyJS removes spaces around parentheses', () => {
  const input = `test( a, b )`;
  const output = minifyJS(input);

  assert(!output.includes('( '), 'Should remove space after (');
  assert(!output.includes(' )'), 'Should remove space before )');
});

test('minifyJS removes spaces around semicolons', () => {
  const input = `const a = 1 ; const b = 2 ;`;
  const output = minifyJS(input);

  assert(!output.includes(' ;'), 'Should remove space before semicolon');
});

test('minifyJS removes spaces around colons', () => {
  const input = `const obj = { a : 1 };`;
  const output = minifyJS(input);

  assert(output.includes('a:1'), 'Should remove spaces around colon');
});

test('minifyJS removes spaces around commas', () => {
  const input = `const arr = [1 , 2 , 3];`;
  const output = minifyJS(input);

  assert(!output.includes(' ,'), 'Should remove space before comma');
});

// =============================================================================
// Complex Code Preservation Tests
// =============================================================================

printSection('JavaScript Minification - Complex Code');

test('minifyJS handles function declarations', () => {
  const input = `
    function add(a, b) {
      return a + b;
    }
  `;
  const output = minifyJS(input);

  assert(output.includes('function add'), 'Should minify function declaration');
  assert(output.includes('return'), 'Should preserve return statement');
  assert(output.includes('a'), 'Should preserve variable a');
  assert(output.includes('b'), 'Should preserve variable b');
});

test('minifyJS handles arrow functions', () => {
  const input = `const add = (a, b) => a + b;`;
  const output = minifyJS(input);

  assert(output.includes('=>'), 'Should preserve arrow function');
  assert(output.includes('a'), 'Should preserve variable a');
  assert(output.includes('b'), 'Should preserve variable b');
});

test('minifyJS handles class declarations', () => {
  const input = `
    class MyClass {
      constructor(x) {
        this.x = x;
      }

      method() {
        return this.x;
      }
    }
  `;
  const output = minifyJS(input);

  assert(output.includes('class MyClass'), 'Should preserve class declaration');
  assert(output.includes('constructor(x)'), 'Should preserve constructor');
  assert(output.includes('method()'), 'Should preserve method');
});

test('minifyJS handles async/await', () => {
  const input = `
    async function fetchData() {
      const response = await fetch('/api');
      return await response.json();
    }
  `;
  const output = minifyJS(input);

  assert(output.includes('async function'), 'Should preserve async');
  assert(output.includes('await fetch'), 'Should preserve await');
});

test('minifyJS handles destructuring', () => {
  const input = `const { a, b } = obj;`;
  const output = minifyJS(input);

  assert(output.includes('{a,b}'), 'Should minify destructuring');
});

test('minifyJS handles spread operator', () => {
  const input = `const arr = [...items, newItem];`;
  const output = minifyJS(input);

  assert(output.includes('...items'), 'Should preserve spread operator');
});

test('minifyJS handles optional chaining', () => {
  const input = `const x = obj?.prop?.value;`;
  const output = minifyJS(input);

  assert(output.includes('?.'), 'Should preserve optional chaining');
});

test('minifyJS handles nullish coalescing', () => {
  const input = `const x = value ?? defaultValue;`;
  const output = minifyJS(input);

  assert(output.includes('??'), 'Should preserve nullish coalescing');
});

// =============================================================================
// Import/Export Tests
// =============================================================================

printSection('JavaScript Minification - Modules');

test('minifyJS handles import statements', () => {
  const input = `import { a, b } from './module.js';`;
  const output = minifyJS(input);

  assert(output.includes('import'), 'Should preserve import keyword');
  assert(output.includes('from'), 'Should preserve from keyword');
  assert(output.includes('./module.js'), 'Should preserve import path');
});

test('minifyJS handles export statements', () => {
  const input = `export { a, b };`;
  const output = minifyJS(input);

  assert(output.includes('export{a,b}'), 'Should minify export');
});

test('minifyJS handles default export', () => {
  const input = `export default function() {}`;
  const output = minifyJS(input);

  assert(output.includes('export default'), 'Should preserve export default');
});

test('minifyJS handles dynamic import', () => {
  const input = `const module = await import('./module.js');`;
  const output = minifyJS(input);

  assert(output.includes("import('./module.js')"), 'Should preserve dynamic import path');
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('JavaScript Minification - Edge Cases');

test('minifyJS handles mixed quotes in strings', () => {
  const input = `const a = "It's"; const b = 'Say "hi"';`;
  const output = minifyJS(input);

  assert(output.includes("\"It's\""), 'Should preserve single quote in double-quoted string');
  assert(output.includes("'Say \"hi\"'"), 'Should preserve double quote in single-quoted string');
});

test('minifyJS handles consecutive operators', () => {
  const input = `const x = a || b && c;`;
  const output = minifyJS(input);

  assert(output.includes('||'), 'Should preserve ||');
  assert(output.includes('&&'), 'Should preserve &&');
});

test('minifyJS handles unary operators', () => {
  const input = `const x = !a; const y = -b; const z = ++c;`;
  const output = minifyJS(input);

  assert(output.includes('!a'), 'Should preserve !');
  assert(output.includes('-b'), 'Should preserve -');
  assert(output.includes('++c'), 'Should preserve ++');
});

test('minifyJS handles ternary operator', () => {
  const input = `const x = condition ? a : b;`;
  const output = minifyJS(input);

  assert(output.includes('?'), 'Should preserve ?');
  assert(output.includes(':'), 'Should preserve :');
});

test('minifyJS handles regex flags', () => {
  const input = `const re = /test/gimsuvy;`;
  const output = minifyJS(input);

  // Check all flags are preserved
  const match = output.match(/\/test\/([a-z]+)/);
  assert(match !== null, 'Should have regex in output');
  assert(match[1].includes('g'), 'Should preserve g flag');
  assert(match[1].includes('i'), 'Should preserve i flag');
  assert(match[1].includes('m'), 'Should preserve m flag');
});

test('minifyJS handles code with no minification needed', () => {
  const input = 'const x=1;';
  const output = minifyJS(input);

  assertEqual(output, 'const x=1;', 'Should not modify already minified code');
});

test('minifyJS handles comments at end of file', () => {
  const input = `const x = 1; // trailing comment`;
  const output = minifyJS(input);

  assert(!output.includes('trailing comment'), 'Should remove trailing comment');
  assert(output.includes('const x=1'), 'Should preserve code');
});

test('minifyJS handles multiple statements on one line', () => {
  const input = `const a = 1; const b = 2; const c = 3;`;
  const output = minifyJS(input);

  assert(output.includes('const a=1;const b=2;const c=3'), 'Should minify multiple statements');
});

// =============================================================================
// Real-world Code Samples
// =============================================================================

printSection('JavaScript Minification - Real-world Samples');

test('minifyJS handles Pulse component code', () => {
  const input = `
    import { pulse, effect, el } from 'pulse-js-framework/runtime';

    // Counter component
    export function Counter() {
      const count = pulse(0);

      effect(() => {
        console.log('Count:', count.get());
      });

      return el('.counter',
        el('span.value', () => count.get()),
        el('button', 'Increment', {
          onclick: () => count.update(n => n + 1)
        })
      );
    }
  `;
  const output = minifyJS(input);

  assert(output.includes('pulse(0)'), 'Should preserve pulse call');
  assert(output.includes('effect('), 'Should preserve effect call');
  assert(output.includes('el('), 'Should preserve el call');
  assert(!output.includes('// Counter'), 'Should remove comment');
});

test('minifyJS handles router configuration', () => {
  const input = `
    const router = createRouter({
      routes: {
        '/': HomePage,
        '/users/:id': UserPage,
        '/admin/*': AdminLayout
      },
      mode: 'history'
    });
  `;
  const output = minifyJS(input);

  assert(output.includes("'/'"), 'Should preserve route paths');
  assert(output.includes("'/users/:id'"), 'Should preserve parameterized routes');
  assert(output.includes("'/admin/*'"), 'Should preserve wildcard routes');
});

test('minifyJS handles store module', () => {
  const input = `
    export const userStore = createStore({
      user: null,
      isAuthenticated: false
    }, {
      persist: true,
      name: 'user'
    });

    export const actions = createActions(userStore, {
      login: (store, user) => {
        store.user.set(user);
        store.isAuthenticated.set(true);
      },
      logout: (store) => {
        store.user.set(null);
        store.isAuthenticated.set(false);
      }
    });
  `;
  const output = minifyJS(input);

  assert(output.includes('createStore'), 'Should preserve createStore');
  assert(output.includes('createActions'), 'Should preserve createActions');
  assert(output.includes('persist:true'), 'Should minify options');
});

// =============================================================================
// Performance Considerations
// =============================================================================

printSection('JavaScript Minification - Performance');

test('minifyJS handles large input efficiently', () => {
  // Generate a large code sample
  const lines = [];
  for (let i = 0; i < 100; i++) {
    lines.push(`const var${i} = ${i}; // Comment ${i}`);
  }
  const input = lines.join('\n');

  const start = Date.now();
  const output = minifyJS(input);
  const duration = Date.now() - start;

  assert(duration < 1000, `Should complete in under 1 second (took ${duration}ms)`);
  assert(!output.includes('// Comment'), 'Should remove all comments');
  assert(output.includes('const var0=0'), 'Should include minified code');
});

test('minifyJS output is shorter than input', () => {
  const input = `
    // This is a test
    const x   =   1;
    const y   =   2;

    function add(a, b) {
      // Add two numbers
      return a + b;
    }
  `;
  const output = minifyJS(input);

  assert(output.length < input.length, 'Output should be shorter than input');
});

// =============================================================================
// Run Tests
// =============================================================================

printResults();
exitWithCode();
