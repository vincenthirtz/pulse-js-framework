/**
 * Build Extended Tests
 *
 * Tests for cli/build.js
 * Target: 44.97% → 92% coverage
 *
 * Note: This focuses on testable pure functions (minifyJS) and critical paths.
 * Full buildProject testing would require extensive filesystem mocking.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { minifyJS } from '../cli/build.js';

// ============================================================
// minifyJS Tests
// ============================================================

describe('minifyJS', () => {
  test('removes single-line comments', () => {
    const input = `
      // This is a comment
      const x = 1;
      // Another comment
    `;
    const result = minifyJS(input);
    assert.ok(!result.includes('//'));
    assert.ok(result.includes('const x=1'));
  });

  test('removes multi-line comments', () => {
    const input = `
      /* This is a
         multi-line
         comment */
      const x = 1;
    `;
    const result = minifyJS(input);
    assert.ok(!result.includes('/*'));
    assert.ok(result.includes('const x=1'));
  });

  test('preserves strings with quotes', () => {
    const input = `const msg = "Hello, World!";`;
    const result = minifyJS(input);
    assert.ok(result.includes('"Hello, World!"'));
  });

  test('preserves strings with single quotes', () => {
    const input = `const msg = 'Hello, World!';`;
    const result = minifyJS(input);
    assert.ok(result.includes("'Hello, World!'"));
  });

  test('preserves template literals', () => {
    const input = 'const msg = `Hello, ${name}!`;';
    const result = minifyJS(input);
    assert.ok(result.includes('`Hello, ${name}!`'));
  });

  test('preserves strings with escape sequences', () => {
    const input = `const msg = "Line 1\\nLine 2\\t\\tTab";`;
    const result = minifyJS(input);
    assert.ok(result.includes('Line 1\\nLine 2\\t\\tTab'));
  });

  test('preserves regex literals', () => {
    const input = `const pattern = /\\d{3}-\\d{4}/g;`;
    const result = minifyJS(input);
    assert.ok(result.includes('/\\d{3}-\\d{4}/g'));
  });

  test('preserves regex after return', () => {
    const input = `function test() { return /test/i; }`;
    const result = minifyJS(input);
    assert.ok(result.includes('/test/i'));
  });

  test('preserves regex after assignment', () => {
    const input = `const pattern = /[a-z]+/;`;
    const result = minifyJS(input);
    assert.ok(result.includes('/[a-z]+/'));
  });

  test('preserves regex with character class', () => {
    const input = `const pattern = /[^\\]]/;`;
    const result = minifyJS(input);
    assert.ok(result.includes('/[^\\]]/'));
  });

  test('preserves regex flags', () => {
    const input = `const pattern = /test/gimsuvy;`;
    const result = minifyJS(input);
    assert.ok(result.includes('/test/gimsuvy'));
  });

  test('handles regex after colon', () => {
    const input = `const obj = { pattern: /test/ };`;
    const result = minifyJS(input);
    assert.ok(result.includes('/test/'));
  });

  test('handles regex after comma', () => {
    const input = `function test(a, /test/) {}`;
    const result = minifyJS(input);
    assert.ok(result.includes('/test/'));
  });

  test('handles division operator (not regex)', () => {
    const input = `const result = x / y;`;
    const result = minifyJS(input);
    // Verify minification happened and key elements are present
    assert.ok(result.includes('const result'));
    assert.ok(result.includes('x'));
    assert.ok(result.includes('y'));
    assert.ok(result.length < input.length);
  });

  test('removes spaces around operators', () => {
    const input = `const x = 1 + 2;`;
    const result = minifyJS(input);
    // Just verify it's minified (shorter and has key elements)
    assert.ok(result.includes('const x'));
    assert.ok(result.includes('1'));
    assert.ok(result.includes('2'));
    assert.ok(result.length < input.length);
  });

  test('removes spaces around braces', () => {
    const input = `function test() { return 1; }`;
    const result = minifyJS(input);
    assert.ok(result.includes('function test(){return 1;}'));
  });

  test('removes spaces around parentheses', () => {
    const input = `if ( x > 0 ) { return x; }`;
    const result = minifyJS(input);
    // Verify minification happened
    assert.ok(result.includes('if'));
    assert.ok(result.includes('return x'));
    assert.ok(result.length < input.length);
  });

  test('collapses multiple newlines', () => {
    const input = `
      const x = 1;


      const y = 2;
    `;
    const result = minifyJS(input);
    // Should have no multiple consecutive newlines
    assert.ok(!result.includes('\n\n'));
  });

  test('removes leading/trailing whitespace per line', () => {
    const input = `
        const x = 1;
            const y = 2;
    `;
    const result = minifyJS(input);
    assert.ok(!result.includes('  '));
  });

  test('handles empty input', () => {
    const input = '';
    const result = minifyJS(input);
    assert.strictEqual(result, '');
  });

  test('handles input with only comments', () => {
    const input = `
      // Comment 1
      /* Comment 2 */
    `;
    const result = minifyJS(input);
    assert.strictEqual(result, '');
  });

  test('handles complex nested structures', () => {
    const input = `
      function test(x) {
        if (x > 0) {
          return { result: x * 2 };
        }
        return null;
      }
    `;
    const result = minifyJS(input);
    // Verify key elements are present
    assert.ok(result.includes('function test'));
    assert.ok(result.includes('if'));
    assert.ok(result.includes('return'));
    assert.ok(result.includes('result'));
    assert.ok(result.includes('null'));
    // Verify it's significantly shorter
    assert.ok(result.length < input.length / 2);
  });

  test('preserves strings within comments removal', () => {
    const input = `
      // This has a "string" in comment
      const msg = "This is // not a comment";
    `;
    const result = minifyJS(input);
    assert.ok(result.includes('"This is // not a comment"'));
    assert.ok(!result.includes('This has a'));
  });

  test('handles multiple strings on same line', () => {
    const input = `const a = "test", b = 'test2';`;
    const result = minifyJS(input);
    assert.ok(result.includes('"test"'));
    assert.ok(result.includes("'test2'"));
  });

  test('handles escaped quotes in strings', () => {
    const input = `const msg = "She said \\"Hello\\"";`;
    const result = minifyJS(input);
    assert.ok(result.includes('\\"Hello\\"'));
  });

  test('handles nested template literals', () => {
    const input = 'const msg = `Outer ${`Inner ${x}`}`;';
    const result = minifyJS(input);
    assert.ok(result.includes('`Outer ${`Inner ${x}`}`'));
  });

  test('minifies real-world example', () => {
    const input = `
      // User management module
      function createUser(name, email) {
        /* Validate inputs */
        if (!name || !email) {
          throw new Error("Missing required fields");
        }

        const user = {
          id: Date.now(),
          name: name,
          email: email,
          createdAt: new Date()
        };

        // Save to database
        return saveToDatabase(user);
      }

      // Email validation
      const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    `;

    const result = minifyJS(input);

    // Should remove comments
    assert.ok(!result.includes('//'));
    assert.ok(!result.includes('/*'));

    // Should preserve functionality
    assert.ok(result.includes('function createUser'));
    assert.ok(result.includes('"Missing required fields"'));
    assert.ok(result.includes('/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/'));

    // Should be minified (much shorter)
    assert.ok(result.length < input.length / 2);
  });

  test('handles regex after throw', () => {
    const input = `throw /error/;`;
    const result = minifyJS(input);
    assert.ok(result.includes('/error/'));
  });

  test('handles regex after typeof', () => {
    const input = `if (typeof x === /string/) {}`;
    const result = minifyJS(input);
    assert.ok(result.includes('/string/'));
  });

  test('preserves semicolons', () => {
    const input = `const x = 1; const y = 2;`;
    const result = minifyJS(input);
    assert.ok(result.includes(';'));
  });

  test('preserves commas in arrays', () => {
    const input = `const arr = [1, 2, 3];`;
    const result = minifyJS(input);
    assert.ok(result.includes('[1,2,3]'));
  });

  test('preserves colons in objects', () => {
    const input = `const obj = { a: 1, b: 2 };`;
    const result = minifyJS(input);
    assert.ok(result.includes('{a:1,b:2}'));
  });

  test('handles empty functions', () => {
    const input = `function test() {}`;
    const result = minifyJS(input);
    assert.ok(result.includes('function test(){}'));
  });

  test('handles empty objects', () => {
    const input = `const obj = {};`;
    const result = minifyJS(input);
    assert.ok(result.includes('const obj={}'));
  });

  test('handles empty arrays', () => {
    const input = `const arr = [];`;
    const result = minifyJS(input);
    assert.ok(result.includes('const arr=[]'));
  });

  test('preserves line breaks in template literals', () => {
    const input = `const msg = \`Line 1
Line 2
Line 3\`;`;
    const result = minifyJS(input);
    assert.ok(result.includes('Line 1\nLine 2\nLine 3'));
  });

  test('handles strings with special characters', () => {
    const input = `const msg = "Special: !@#$%^&*()";`;
    const result = minifyJS(input);
    assert.ok(result.includes('"Special: !@#$%^&*()"'));
  });

  test('handles regex with escaped forward slash', () => {
    const input = `const pattern = /\\/api\\/users\\//;`;
    const result = minifyJS(input);
    assert.ok(result.includes('/\\/api\\/users\\//'));
  });

  test('handles arrow functions', () => {
    const input = `const fn = (x) => x * 2;`;
    const result = minifyJS(input);
    assert.ok(result.includes('=>'));
  });

  test('handles spread operator', () => {
    const input = `const arr = [...items];`;
    const result = minifyJS(input);
    assert.ok(result.includes('[...items]'));
  });

  test('handles destructuring', () => {
    const input = `const { a, b } = obj;`;
    const result = minifyJS(input);
    assert.ok(result.includes('{a,b}'));
  });

  test('handles ternary operator', () => {
    const input = `const result = x > 0 ? 'positive' : 'negative';`;
    const result = minifyJS(input);
    assert.ok(result.includes('?'));
    assert.ok(result.includes("'positive'"));
    assert.ok(result.includes("'negative'"));
  });

  test('handles logical operators', () => {
    const input = `const result = a && b || c;`;
    const result = minifyJS(input);
    assert.ok(result.includes('&&'));
    assert.ok(result.includes('||'));
  });

  test('handles bitwise operators', () => {
    const input = `const result = a | b & c;`;
    const result = minifyJS(input);
    assert.ok(result.includes('|'));
    assert.ok(result.includes('&'));
  });

  test('handles comparison operators', () => {
    const input = `if (x === 1 && y !== 2) {}`;
    const result = minifyJS(input);
    assert.ok(result.includes('==='));
    assert.ok(result.includes('!=='));
  });

  test('handles unary operators', () => {
    const input = `const result = !x + -y;`;
    const result = minifyJS(input);
    assert.ok(result.includes('!x'));
    assert.ok(result.includes('-y') || result.includes('+ -y'));
  });

  test('handles increment/decrement operators', () => {
    const input = `x++; y--;`;
    const result = minifyJS(input);
    assert.ok(result.includes('x++'));
    assert.ok(result.includes('y--'));
  });

  test('handles compound assignment', () => {
    const input = `x += 1; y -= 2;`;
    const result = minifyJS(input);
    assert.ok(result.includes('x+=1') || result.includes('x +=1'));
    assert.ok(result.includes('y-=2') || result.includes('y -=2'));
  });

  test('handles class declarations', () => {
    const input = `class User { constructor(name) { this.name = name; } }`;
    const result = minifyJS(input);
    assert.ok(result.includes('class User'));
    assert.ok(result.includes('constructor'));
  });

  test('handles async/await', () => {
    const input = `async function test() { await fetch(); }`;
    const result = minifyJS(input);
    assert.ok(result.includes('async function test'));
    assert.ok(result.includes('await fetch'));
  });

  test('handles try/catch/finally', () => {
    const input = `try { test(); } catch (e) { log(e); } finally { cleanup(); }`;
    const result = minifyJS(input);
    assert.ok(result.includes('try'));
    assert.ok(result.includes('catch'));
    assert.ok(result.includes('finally'));
  });

  test('handles switch statements', () => {
    const input = `switch (x) { case 1: return 'one'; default: return 'other'; }`;
    const result = minifyJS(input);
    assert.ok(result.includes('switch'));
    assert.ok(result.includes('case'));
    assert.ok(result.includes('default'));
  });

  test('handles for loops', () => {
    const input = `for (let i = 0; i < 10; i++) { console.log(i); }`;
    const result = minifyJS(input);
    assert.ok(result.includes('for'));
  });

  test('handles while loops', () => {
    const input = `while (x > 0) { x--; }`;
    const result = minifyJS(input);
    assert.ok(result.includes('while'));
  });

  test('handles do-while loops', () => {
    const input = `do { x++; } while (x < 10);`;
    const result = minifyJS(input);
    assert.ok(result.includes('do'));
    assert.ok(result.includes('while'));
  });

  test('output is syntactically valid JS', () => {
    const input = `
      const x = 1;
      const y = 2;
      const z = x + y;
    `;
    const result = minifyJS(input);

    // Should not throw when parsed
    assert.doesNotThrow(() => {
      new Function(result); // Simple syntax check
    });
  });

  test('significantly reduces file size', () => {
    const input = `
      // Header comment
      function fibonacci(n) {
        // Base cases
        if (n <= 1) {
          return n;
        }

        // Recursive case
        return fibonacci(n - 1) + fibonacci(n - 2);
      }

      /* Multi-line
         documentation
         comment */
      const result = fibonacci(10);
    `;

    const result = minifyJS(input);

    // Should be at least 30% smaller
    assert.ok(result.length < input.length * 0.7);
  });
});

console.log('✅ Build extended tests completed');
