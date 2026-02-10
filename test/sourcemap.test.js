/**
 * Pulse Source Map Tests
 *
 * Tests for compiler/sourcemap.js - Source map generation and consumption
 *
 * @module test/sourcemap
 */

import { SourceMapGenerator, SourceMapConsumer, encodeVLQ } from '../compiler/sourcemap.js';
import { compile } from '../compiler/index.js';
import { test, describe } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// VLQ Encoding Tests
// =============================================================================

describe('VLQ Encoding Tests', () => {
  test('encodes zero', () => {
    const encoded = encodeVLQ(0);
    assert.strictEqual(encoded, 'A', 'Zero should encode to A');
  });

  test('encodes positive numbers', () => {
    assert.strictEqual(encodeVLQ(1), 'C', '1 should encode to C');
    assert.strictEqual(encodeVLQ(2), 'E', '2 should encode to E');
    assert.strictEqual(encodeVLQ(15), 'e', '15 should encode to e');
  });

  test('encodes negative numbers', () => {
    assert.strictEqual(encodeVLQ(-1), 'D', '-1 should encode to D');
    assert.strictEqual(encodeVLQ(-2), 'F', '-2 should encode to F');
  });

  test('encodes large numbers with continuation', () => {
    const encoded = encodeVLQ(16);
    assert.ok(encoded.length > 1, 'Large numbers should use continuation bits');
  });

  test('VLQ decode reverses encode', () => {
    const testValues = [0, 1, -1, 5, -5, 16, -16, 100, -100, 1000];

    for (const value of testValues) {
      const encoded = encodeVLQ(value);
      const decoded = SourceMapConsumer.decodeVLQ(encoded);
      assert.strictEqual(decoded[0], value, `Should round-trip ${value}`);
    }
  });
});

// =============================================================================
// SourceMapGenerator Tests
// =============================================================================

describe('SourceMapGenerator Tests', () => {
  test('creates generator with options', () => {
    const gen = new SourceMapGenerator({
      file: 'output.js',
      sourceRoot: '/src/'
    });

    const map = gen.toJSON();
    assert.strictEqual(map.version, 3, 'Should be version 3');
    assert.strictEqual(map.file, 'output.js', 'Should have file name');
    assert.strictEqual(map.sourceRoot, '/src/', 'Should have source root');
  });

  test('adds source files', () => {
    const gen = new SourceMapGenerator();

    const idx1 = gen.addSource('file1.pulse');
    const idx2 = gen.addSource('file2.pulse');
    const idx1Again = gen.addSource('file1.pulse');

    assert.strictEqual(idx1, 0, 'First source should be index 0');
    assert.strictEqual(idx2, 1, 'Second source should be index 1');
    assert.strictEqual(idx1Again, 0, 'Duplicate source should return existing index');

    const map = gen.toJSON();
    assert.strictEqual(map.sources.length, 2, 'Should have 2 sources');
    assert.deepStrictEqual(map.sources, ['file1.pulse', 'file2.pulse'], 'Sources should match');
  });

  test('adds source content', () => {
    const gen = new SourceMapGenerator();
    const content = 'const x = 1;';

    gen.addSource('file.pulse', content);

    const map = gen.toJSON();
    assert.strictEqual(map.sourcesContent[0], content, 'Should have source content');
  });

  test('adds names', () => {
    const gen = new SourceMapGenerator();

    const idx1 = gen.addName('foo');
    const idx2 = gen.addName('bar');
    const idx1Again = gen.addName('foo');

    assert.strictEqual(idx1, 0, 'First name should be index 0');
    assert.strictEqual(idx2, 1, 'Second name should be index 1');
    assert.strictEqual(idx1Again, 0, 'Duplicate name should return existing index');

    const map = gen.toJSON();
    assert.deepStrictEqual(map.names, ['foo', 'bar'], 'Names should match');
  });

  test('adds basic mapping', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse'
    });

    const map = gen.toJSON();
    assert.ok(map.mappings.length > 0, 'Should have mappings');
    assert.strictEqual(map.mappings, 'AAAA', 'First mapping should be AAAA');
  });

  test('adds multiple mappings on same line', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse'
    });

    gen.addMapping({
      generated: { line: 0, column: 10 },
      original: { line: 0, column: 5 },
      source: 'input.pulse'
    });

    const map = gen.toJSON();
    assert.ok(map.mappings.includes(','), 'Should have comma-separated segments');
  });

  test('adds mappings on multiple lines', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse'
    });

    gen.addMapping({
      generated: { line: 1, column: 0 },
      original: { line: 1, column: 0 },
      source: 'input.pulse'
    });

    const map = gen.toJSON();
    assert.ok(map.mappings.includes(';'), 'Should have semicolon between lines');
  });

  test('adds mapping with name', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse',
      name: 'myFunction'
    });

    const map = gen.toJSON();
    assert.deepStrictEqual(map.names, ['myFunction'], 'Should have name');
    // 5 fields: genCol, sourceIdx, origLine, origCol, nameIdx
    const decoded = SourceMapConsumer.decodeVLQ(map.mappings);
    assert.strictEqual(decoded.length, 5, 'Should have 5 VLQ values for named mapping');
  });

  test('generates JSON string', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    const json = gen.toString();
    assert.ok(typeof json === 'string', 'Should return string');

    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.version, 3, 'Should be valid JSON');
  });

  test('generates inline comment', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    const comment = gen.toComment();
    assert.ok(comment.startsWith('//# sourceMappingURL=data:application/json'), 'Should have data URI prefix');
    assert.ok(comment.includes('base64'), 'Should be base64 encoded');
  });

  test('generates URL comment', () => {
    const comment = SourceMapGenerator.toURLComment('output.js.map');
    assert.strictEqual(comment, '//# sourceMappingURL=output.js.map', 'Should generate URL comment');
  });
});

// =============================================================================
// SourceMapConsumer Tests
// =============================================================================

describe('SourceMapConsumer Tests', () => {
  test('parses source map object', () => {
    const map = {
      version: 3,
      file: 'out.js',
      sourceRoot: '',
      sources: ['input.pulse'],
      sourcesContent: ['const x = 1;'],
      names: [],
      mappings: 'AAAA'
    };

    const consumer = new SourceMapConsumer(map);
    assert.ok(consumer.map !== null, 'Should have parsed map');
  });

  test('parses source map JSON string', () => {
    const map = {
      version: 3,
      file: 'out.js',
      sourceRoot: '',
      sources: ['input.pulse'],
      sourcesContent: [],
      names: [],
      mappings: 'AAAA'
    };

    const consumer = new SourceMapConsumer(JSON.stringify(map));
    assert.strictEqual(consumer.map.version, 3, 'Should parse JSON string');
  });

  test('finds original position for simple mapping', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 5, column: 10 },
      source: 'input.pulse'
    });

    const consumer = new SourceMapConsumer(gen.toJSON());
    const original = consumer.originalPositionFor({ line: 0, column: 0 });

    assert.strictEqual(original.source, 'input.pulse', 'Should find source');
    assert.strictEqual(original.line, 5, 'Should find original line');
    assert.strictEqual(original.column, 10, 'Should find original column');
  });

  test('finds closest mapping for column', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse'
    });

    gen.addMapping({
      generated: { line: 0, column: 20 },
      original: { line: 0, column: 15 },
      source: 'input.pulse'
    });

    const consumer = new SourceMapConsumer(gen.toJSON());

    // Query column 10 - should find mapping at column 0
    const original = consumer.originalPositionFor({ line: 0, column: 10 });
    assert.strictEqual(original.column, 0, 'Should find closest mapping before column');
  });

  test('returns null for unmapped position', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse'
    });

    const consumer = new SourceMapConsumer(gen.toJSON());

    // Query line that doesn't exist
    const original = consumer.originalPositionFor({ line: 10, column: 0 });
    assert.strictEqual(original, null, 'Should return null for unmapped line');
  });

  test('finds mapping with name', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('input.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 2, column: 5 },
      source: 'input.pulse',
      name: 'increment'
    });

    const consumer = new SourceMapConsumer(gen.toJSON());
    const original = consumer.originalPositionFor({ line: 0, column: 0 });

    assert.strictEqual(original.name, 'increment', 'Should find name');
  });

  test('handles multiple sources', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('a.pulse');
    gen.addSource('b.pulse');

    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'a.pulse'
    });

    gen.addMapping({
      generated: { line: 1, column: 0 },
      original: { line: 5, column: 0 },
      source: 'b.pulse'
    });

    const consumer = new SourceMapConsumer(gen.toJSON());

    const pos0 = consumer.originalPositionFor({ line: 0, column: 0 });
    assert.strictEqual(pos0.source, 'a.pulse', 'Should find first source');

    const pos1 = consumer.originalPositionFor({ line: 1, column: 0 });
    assert.strictEqual(pos1.source, 'b.pulse', 'Should find second source');
  });
});

// =============================================================================
// Compiler Source Map Integration Tests
// =============================================================================

describe('Compiler Source Map Integration', () => {
  test('compile generates source map when enabled', () => {
    const source = `
@page Test

state {
  count: 0
}

view {
  div "Hello"
}`;

    const result = compile(source, {
      sourceMap: true,
      sourceFileName: 'test.pulse'
    });

    assert.ok(result.success, 'Should compile successfully');
    assert.ok(result.sourceMap !== null, 'Should generate source map');
    assert.strictEqual(result.sourceMap.version, 3, 'Should be V3 source map');
    assert.ok(result.sourceMap.sources.includes('test.pulse'), 'Should include source file');
  });

  test('compile does not generate source map when disabled', () => {
    const source = `
@page Test

view {
  div "Hello"
}`;

    const result = compile(source, {
      sourceMap: false
    });

    assert.ok(result.success, 'Should compile successfully');
    assert.strictEqual(result.sourceMap, null, 'Should not generate source map');
  });

  test('compile includes inline source map when requested', () => {
    const source = `
@page Test

view {
  div "Hello"
}`;

    const result = compile(source, {
      sourceMap: true,
      inlineSourceMap: true,
      sourceFileName: 'test.pulse'
    });

    assert.ok(result.success, 'Should compile successfully');
    assert.ok(result.code.includes('//# sourceMappingURL=data:'), 'Should have inline source map');
    assert.ok(result.code.includes('base64'), 'Should be base64 encoded');
  });

  test('source map includes source content', () => {
    const source = `@page Test

view {
  div "Content"
}`;

    const result = compile(source, {
      sourceMap: true,
      sourceFileName: 'test.pulse'
    });

    assert.ok(result.success, 'Should compile successfully');
    assert.ok(result.sourceMap.sourcesContent !== null, 'Should have sources content');
    assert.ok(result.sourceMap.sourcesContent.length > 0, 'Should have at least one source content');
  });

  test('source map has valid structure', () => {
    const source = `
@page Counter

state {
  count: 0
}

view {
  div {
    span "Count: {count}"
    button @click(count++) "+"
  }
}`;

    const result = compile(source, {
      sourceMap: true,
      sourceFileName: 'counter.pulse'
    });

    assert.ok(result.success, 'Should compile successfully');
    assert.strictEqual(result.sourceMap.version, 3, 'Should be version 3');
    assert.ok(Array.isArray(result.sourceMap.sources), 'Should have sources array');
    assert.ok(Array.isArray(result.sourceMap.names), 'Should have names array');
    assert.strictEqual(typeof result.sourceMap.mappings, 'string', 'Mappings should be string');

    // Validate we can consume the source map
    const consumer = new SourceMapConsumer(result.sourceMap);
    assert.ok(consumer !== null, 'Should be consumable');
  });

  test('source map file name is transformed', () => {
    const source = `@page Test
view { div "Hello" }`;

    const result = compile(source, {
      sourceMap: true,
      sourceFileName: 'component.pulse'
    });

    assert.ok(result.success, 'Should compile successfully');
    assert.strictEqual(result.sourceMap.file, 'component.js', 'Should transform .pulse to .js');
  });
});
