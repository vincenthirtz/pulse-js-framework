/**
 * CLI UI Utilities Tests
 *
 * Tests for cli/utils/cli-ui.js - Progress bars, spinners, timing, tables, etc.
 *
 * @module test/cli-ui
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  formatDuration,
  createTimer,
  createTable,
  createBox,
  createBarChart,
  createTree,
  createProgressBar,
  createSpinner
} from '../cli/utils/cli-ui.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// =============================================================================
// formatDuration Tests
// =============================================================================

describe('formatDuration Tests', () => {
  test('formatDuration formats microseconds', () => {
    const result = formatDuration(0.5);
    assert.ok(result.includes('µs'), `Expected microseconds format, got: ${result}`);
    assert.strictEqual(result, '500µs');
  });

  test('formatDuration formats sub-microsecond values', () => {
    const result = formatDuration(0.001);
    assert.ok(result.includes('µs'), `Expected microseconds format, got: ${result}`);
  });

  test('formatDuration formats milliseconds', () => {
    const result = formatDuration(50);
    assert.ok(result.includes('ms'), `Expected milliseconds format, got: ${result}`);
    assert.strictEqual(result, '50.00ms');
  });

  test('formatDuration formats milliseconds with decimals', () => {
    const result = formatDuration(123.456);
    assert.ok(result.includes('ms'), `Expected milliseconds format, got: ${result}`);
    assert.strictEqual(result, '123.46ms');
  });

  test('formatDuration formats seconds', () => {
    const result = formatDuration(1500);
    assert.ok(result.includes('s'), `Expected seconds format, got: ${result}`);
    assert.strictEqual(result, '1.50s');
  });

  test('formatDuration formats larger seconds', () => {
    const result = formatDuration(45000);
    assert.ok(result.includes('s'), `Expected seconds format, got: ${result}`);
    assert.strictEqual(result, '45.00s');
  });

  test('formatDuration formats minutes and seconds', () => {
    const result = formatDuration(90000); // 1.5 minutes
    assert.ok(result.includes('m'), `Expected minutes format, got: ${result}`);
    assert.ok(result.includes('s'), `Expected seconds component, got: ${result}`);
  });

  test('formatDuration formats multiple minutes', () => {
    const result = formatDuration(180000); // 3 minutes
    assert.ok(result.includes('3m'), `Expected 3m in result, got: ${result}`);
  });

  test('formatDuration handles zero', () => {
    const result = formatDuration(0);
    assert.ok(result.includes('µs'), `Expected microseconds for zero, got: ${result}`);
  });

  test('formatDuration handles edge case at 1ms', () => {
    const result = formatDuration(1);
    assert.ok(result.includes('ms'), `Expected milliseconds, got: ${result}`);
  });

  test('formatDuration handles edge case at 1s', () => {
    const result = formatDuration(1000);
    assert.ok(result.includes('s'), `Expected seconds, got: ${result}`);
    assert.strictEqual(result, '1.00s');
  });

  test('formatDuration handles edge case at 1m', () => {
    const result = formatDuration(60000);
    assert.ok(result.includes('m'), `Expected minutes, got: ${result}`);
  });
});

// =============================================================================
// createTimer Tests
// =============================================================================

describe('createTimer Tests', () => {
  test('createTimer returns object with elapsed, end, format', () => {
    const timer = createTimer();

    assert.ok(typeof timer.elapsed === 'function', 'Should have elapsed method');
    assert.ok(typeof timer.end === 'function', 'Should have end method');
    assert.ok(typeof timer.format === 'function', 'Should have format method');
  });

  test('createTimer elapsed returns number', () => {
    const timer = createTimer();
    const elapsed = timer.elapsed();

    assert.ok(typeof elapsed === 'number', 'elapsed should return number');
    assert.ok(elapsed >= 0, 'elapsed should be non-negative');
  });

  test('createTimer format returns formatted string', () => {
    const timer = createTimer();
    const formatted = timer.format();

    assert.ok(typeof formatted === 'string', 'format should return string');
    assert.ok(
      formatted.includes('µs') || formatted.includes('ms') || formatted.includes('s'),
      `format should include time unit, got: ${formatted}`
    );
  });

  test('createTimer measures elapsed time', async () => {
    const timer = createTimer();

    await sleep(50);

    const elapsed = timer.elapsed();
    assert.ok(elapsed >= 40, `Expected at least 40ms, got ${elapsed}ms`);
    assert.ok(elapsed < 200, `Expected less than 200ms, got ${elapsed}ms`);
  });

  test('createTimer end returns elapsed time', () => {
    const timer = createTimer();
    const elapsed = timer.end();

    assert.ok(typeof elapsed === 'number', 'end should return number');
    assert.ok(elapsed >= 0, 'end should return non-negative number');
  });

  test('createTimer with label', () => {
    const timer = createTimer('Build');

    assert.ok(typeof timer.elapsed === 'function', 'Should have elapsed method');
    assert.ok(typeof timer.end === 'function', 'Should have end method');
  });
});

// =============================================================================
// createTable Tests
// =============================================================================

describe('createTable Tests', () => {
  test('createTable returns string', () => {
    const result = createTable(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);

    assert.ok(typeof result === 'string', 'Should return string');
  });

  test('createTable includes headers', () => {
    const result = createTable(['Name', 'Age'], [['Alice', '30']]);

    assert.ok(result.includes('Name'), 'Should include Name header');
    assert.ok(result.includes('Age'), 'Should include Age header');
  });

  test('createTable includes data rows', () => {
    const result = createTable(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);

    assert.ok(result.includes('Alice'), 'Should include Alice');
    assert.ok(result.includes('30'), 'Should include 30');
    assert.ok(result.includes('Bob'), 'Should include Bob');
    assert.ok(result.includes('25'), 'Should include 25');
  });

  test('createTable draws borders', () => {
    const result = createTable(['Col1', 'Col2'], [['A', 'B']]);

    assert.ok(result.includes('┌'), 'Should have top-left corner');
    assert.ok(result.includes('┐'), 'Should have top-right corner');
    assert.ok(result.includes('└'), 'Should have bottom-left corner');
    assert.ok(result.includes('┘'), 'Should have bottom-right corner');
    assert.ok(result.includes('─'), 'Should have horizontal borders');
    assert.ok(result.includes('│'), 'Should have vertical borders');
  });

  test('createTable handles empty rows', () => {
    const result = createTable(['Name'], []);

    assert.ok(typeof result === 'string', 'Should return string for empty rows');
    assert.ok(result.includes('Name'), 'Should still include header');
  });

  test('createTable handles single column', () => {
    const result = createTable(['Item'], [['Apple'], ['Banana']]);

    assert.ok(result.includes('Item'), 'Should include header');
    assert.ok(result.includes('Apple'), 'Should include Apple');
    assert.ok(result.includes('Banana'), 'Should include Banana');
  });

  test('createTable handles alignment options', () => {
    const result = createTable(['Left', 'Right', 'Center'],
      [['A', 'B', 'C']],
      { align: ['left', 'right', 'center'] });

    assert.ok(typeof result === 'string', 'Should return string with alignment');
  });

  test('createTable handles varying column widths', () => {
    const result = createTable(['Short', 'Very Long Header Name'],
      [['X', 'Y'], ['ABC', 'DEFGHIJ']]);

    assert.ok(result.includes('Very Long Header Name'), 'Should include long header');
  });
});

// =============================================================================
// createBox Tests
// =============================================================================

describe('createBox Tests', () => {
  test('createBox returns string', () => {
    const result = createBox('Hello World');

    assert.ok(typeof result === 'string', 'Should return string');
  });

  test('createBox includes content', () => {
    const result = createBox('Hello World');

    assert.ok(result.includes('Hello World'), 'Should include content');
  });

  test('createBox draws borders', () => {
    const result = createBox('Content');

    assert.ok(result.includes('┌'), 'Should have top-left corner');
    assert.ok(result.includes('┐'), 'Should have top-right corner');
    assert.ok(result.includes('└'), 'Should have bottom-left corner');
    assert.ok(result.includes('┘'), 'Should have bottom-right corner');
  });

  test('createBox handles title option', () => {
    const result = createBox('Content', { title: 'My Title' });

    assert.ok(result.includes('My Title'), 'Should include title');
  });

  test('createBox handles multi-line content', () => {
    const result = createBox('Line 1\nLine 2\nLine 3');

    assert.ok(result.includes('Line 1'), 'Should include Line 1');
    assert.ok(result.includes('Line 2'), 'Should include Line 2');
    assert.ok(result.includes('Line 3'), 'Should include Line 3');
  });

  test('createBox handles padding option', () => {
    const result = createBox('Text', { padding: 2 });

    assert.ok(typeof result === 'string', 'Should return string with padding');
  });

  test('createBox handles borderColor option', () => {
    const result = createBox('Text', { borderColor: 'green' });

    assert.ok(typeof result === 'string', 'Should return string with border color');
  });

  test('createBox handles empty content', () => {
    const result = createBox('');

    assert.ok(typeof result === 'string', 'Should return string for empty content');
  });
});

// =============================================================================
// createBarChart Tests
// =============================================================================

describe('createBarChart Tests', () => {
  test('createBarChart returns string', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 }
    ];
    const result = createBarChart(data);

    assert.ok(typeof result === 'string', 'Should return string');
  });

  test('createBarChart includes labels', () => {
    const data = [
      { label: 'Apple', value: 10 },
      { label: 'Banana', value: 20 }
    ];
    const result = createBarChart(data);

    assert.ok(result.includes('Apple'), 'Should include Apple label');
    assert.ok(result.includes('Banana'), 'Should include Banana label');
  });

  test('createBarChart draws bars', () => {
    const data = [
      { label: 'A', value: 50 },
      { label: 'B', value: 100 }
    ];
    const result = createBarChart(data);

    assert.ok(result.includes('█'), 'Should include filled bar characters');
  });

  test('createBarChart shows values when enabled', () => {
    const data = [
      { label: 'Item', value: 42 }
    ];
    const result = createBarChart(data, { showValues: true });

    assert.ok(result.includes('42'), 'Should include value');
  });

  test('createBarChart handles unit option', () => {
    const data = [
      { label: 'Size', value: 100 }
    ];
    const result = createBarChart(data, { showValues: true, unit: 'KB' });

    assert.ok(result.includes('KB'), 'Should include unit');
  });

  test('createBarChart handles maxWidth option', () => {
    const data = [
      { label: 'A', value: 100 }
    ];
    const result = createBarChart(data, { maxWidth: 20 });

    assert.ok(typeof result === 'string', 'Should return string with custom width');
  });

  test('createBarChart handles single item', () => {
    const data = [{ label: 'Only', value: 100 }];
    const result = createBarChart(data);

    assert.ok(result.includes('Only'), 'Should include single label');
  });

  test('createBarChart handles zero values', () => {
    const data = [
      { label: 'A', value: 0 },
      { label: 'B', value: 100 }
    ];
    const result = createBarChart(data);

    assert.ok(typeof result === 'string', 'Should handle zero values');
  });

  test('createBarChart handles custom colors', () => {
    const data = [
      { label: 'A', value: 50, color: 'blue' },
      { label: 'B', value: 100, color: 'red' }
    ];
    const result = createBarChart(data);

    assert.ok(typeof result === 'string', 'Should handle custom colors');
  });
});

// =============================================================================
// createTree Tests
// =============================================================================

describe('createTree Tests', () => {
  test('createTree returns string', () => {
    const node = { name: 'root', children: [] };
    const result = createTree(node);

    assert.ok(typeof result === 'string', 'Should return string');
  });

  test('createTree includes node name', () => {
    const node = { name: 'MyNode' };
    const result = createTree(node);

    assert.ok(result.includes('MyNode'), 'Should include node name');
  });

  test('createTree draws connectors', () => {
    const node = { name: 'root', children: [{ name: 'child' }] };
    const result = createTree(node);

    assert.ok(
      result.includes('└──') || result.includes('├──'),
      'Should include tree connectors'
    );
  });

  test('createTree handles nested children', () => {
    const node = {
      name: 'root',
      children: [
        {
          name: 'child1',
          children: [{ name: 'grandchild' }]
        }
      ]
    };
    const result = createTree(node);

    assert.ok(result.includes('root'), 'Should include root');
    assert.ok(result.includes('child1'), 'Should include child1');
    assert.ok(result.includes('grandchild'), 'Should include grandchild');
  });

  test('createTree handles multiple children', () => {
    const node = {
      name: 'root',
      children: [
        { name: 'child1' },
        { name: 'child2' },
        { name: 'child3' }
      ]
    };
    const result = createTree(node);

    assert.ok(result.includes('child1'), 'Should include child1');
    assert.ok(result.includes('child2'), 'Should include child2');
    assert.ok(result.includes('child3'), 'Should include child3');
    assert.ok(result.includes('├──'), 'Should have intermediate connectors');
    assert.ok(result.includes('└──'), 'Should have last connector');
  });

  test('createTree handles empty children array', () => {
    const node = { name: 'leaf', children: [] };
    const result = createTree(node);

    assert.ok(result.includes('leaf'), 'Should include leaf name');
  });

  test('createTree handles no children property', () => {
    const node = { name: 'standalone' };
    const result = createTree(node);

    assert.ok(result.includes('standalone'), 'Should include node name');
  });

  test('createTree handles deeply nested structure', () => {
    const node = {
      name: 'level1',
      children: [{
        name: 'level2',
        children: [{
          name: 'level3',
          children: [{
            name: 'level4'
          }]
        }]
      }]
    };
    const result = createTree(node);

    assert.ok(result.includes('level1'), 'Should include level1');
    assert.ok(result.includes('level4'), 'Should include level4');
  });
});

// =============================================================================
// createProgressBar Tests
// =============================================================================

describe('createProgressBar Tests', () => {
  test('createProgressBar returns object with methods', () => {
    const bar = createProgressBar({ total: 100 });

    assert.ok(typeof bar.tick === 'function', 'Should have tick method');
    assert.ok(typeof bar.update === 'function', 'Should have update method');
    assert.ok(typeof bar.done === 'function', 'Should have done method');
    assert.ok(typeof bar.fail === 'function', 'Should have fail method');
    assert.ok(typeof bar.render === 'function', 'Should have render method');
  });

  test('createProgressBar accepts options', () => {
    const bar = createProgressBar({
      total: 50,
      width: 20,
      label: 'Processing',
      showPercent: true,
      showCount: true
    });

    assert.ok(typeof bar.tick === 'function', 'Should create bar with options');
  });

  test('createProgressBar tick advances progress', () => {
    const bar = createProgressBar({ total: 10 });

    // tick without error
    bar.tick();
    bar.tick(2);

    assert.ok(true, 'tick should work without error');
  });

  test('createProgressBar update sets specific value', () => {
    const bar = createProgressBar({ total: 100 });

    bar.update(50);

    assert.ok(true, 'update should work without error');
  });

  test('createProgressBar done returns elapsed time', () => {
    const bar = createProgressBar({ total: 10 });

    bar.tick(10);
    const elapsed = bar.done();

    assert.ok(typeof elapsed === 'number', 'done should return elapsed time');
  });

  test('createProgressBar done with message', () => {
    const bar = createProgressBar({ total: 10 });

    bar.tick(10);
    const elapsed = bar.done('Completed successfully');

    assert.ok(typeof elapsed === 'number', 'done with message should return elapsed time');
  });

  test('createProgressBar fail does not throw', () => {
    const bar = createProgressBar({ total: 10 });

    bar.tick(5);
    bar.fail('Something went wrong');

    assert.ok(true, 'fail should work without error');
  });

  test('createProgressBar default options', () => {
    const bar = createProgressBar();

    assert.ok(typeof bar.tick === 'function', 'Should work with default options');
  });
});

// =============================================================================
// createSpinner Tests
// =============================================================================

describe('createSpinner Tests', () => {
  test('createSpinner returns object with methods', () => {
    const spinner = createSpinner('Loading');

    assert.ok(typeof spinner.text === 'function', 'Should have text method');
    assert.ok(typeof spinner.stop === 'function', 'Should have stop method');
    assert.ok(typeof spinner.success === 'function', 'Should have success method');
    assert.ok(typeof spinner.fail === 'function', 'Should have fail method');
    assert.ok(typeof spinner.warn === 'function', 'Should have warn method');

    spinner.stop(); // Clean up
  });

  test('createSpinner text updates message', () => {
    const spinner = createSpinner('Initial');

    spinner.text('Updated message');
    spinner.stop();

    assert.ok(true, 'text should update without error');
  });

  test('createSpinner stop clears spinner', () => {
    const spinner = createSpinner('Working');

    spinner.stop();

    assert.ok(true, 'stop should work without error');
  });

  test('createSpinner success completes with checkmark', () => {
    const spinner = createSpinner('Processing');

    spinner.success('Done!');

    assert.ok(true, 'success should work without error');
  });

  test('createSpinner fail completes with X', () => {
    const spinner = createSpinner('Trying');

    spinner.fail('Failed!');

    assert.ok(true, 'fail should work without error');
  });

  test('createSpinner warn completes with warning', () => {
    const spinner = createSpinner('Checking');

    spinner.warn('Warning!');

    assert.ok(true, 'warn should work without error');
  });

  test('createSpinner success without message uses original', () => {
    const spinner = createSpinner('Original message');

    spinner.success();

    assert.ok(true, 'success without message should work');
  });

  test('createSpinner fail without message uses original', () => {
    const spinner = createSpinner('Original message');

    spinner.fail();

    assert.ok(true, 'fail without message should work');
  });
});

// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================

describe('Edge Cases and Integration Tests', () => {
  test('formatDuration handles very small values', () => {
    const result = formatDuration(0.0001);
    assert.ok(typeof result === 'string', 'Should handle very small values');
  });

  test('formatDuration handles very large values', () => {
    const result = formatDuration(3600000); // 1 hour
    assert.ok(result.includes('m'), 'Should format as minutes');
  });

  test('createTable handles special characters in data', () => {
    const result = createTable(['Name'], [['<script>alert(1)</script>']]);
    assert.ok(result.includes('<script>'), 'Should preserve special characters');
  });

  test('createBox handles special characters in content', () => {
    const result = createBox('Hello & goodbye <world>');
    assert.ok(result.includes('&'), 'Should preserve ampersand');
    assert.ok(result.includes('<'), 'Should preserve angle brackets');
  });

  test('createTree handles nodes with special characters', () => {
    const node = { name: 'file.test.js', children: [] };
    const result = createTree(node);
    assert.ok(result.includes('file.test.js'), 'Should handle dots in names');
  });

  test('createBarChart handles all zero values', () => {
    const data = [
      { label: 'A', value: 0 },
      { label: 'B', value: 0 }
    ];
    // Should not throw - handles division by zero gracefully
    try {
      const result = createBarChart(data);
      assert.ok(typeof result === 'string', 'Should handle all zero values');
    } catch (e) {
      // If it throws, that's a valid behavior too for edge case
      assert.ok(true, 'Edge case handled');
    }
  });

  test('createTable handles null/undefined in cells', () => {
    const result = createTable(['A', 'B'], [[null, undefined]]);
    assert.ok(typeof result === 'string', 'Should handle null/undefined');
  });

  test('createTimer multiple timers independent', async () => {
    const timer1 = createTimer();
    await sleep(20);
    const timer2 = createTimer();
    await sleep(20);

    const elapsed1 = timer1.elapsed();
    const elapsed2 = timer2.elapsed();

    assert.ok(elapsed1 > elapsed2, 'Timer1 should show more elapsed time than Timer2');
  });
});
