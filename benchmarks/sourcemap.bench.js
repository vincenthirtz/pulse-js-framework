/**
 * Source Map Benchmarks - Pulse Framework
 *
 * Measures: VLQ encoding, mapping generation, source map consumer lookups
 *
 * @module benchmarks/sourcemap
 */

import { encodeVLQ, SourceMapGenerator, SourceMapConsumer } from '../compiler/sourcemap.js';
import { bench, suite } from './utils.js';

export async function runSourceMapBenchmarks() {
  // Pre-build a source map for consumer benchmarks
  const prebuiltGen = new SourceMapGenerator({ file: 'output.js' });
  const srcIdx = prebuiltGen.addSource('input.pulse', '// source content');
  for (let line = 1; line <= 200; line++) {
    for (let col = 0; col < 5; col++) {
      prebuiltGen.addMapping({
        generated: { line, column: col * 10 },
        original: { line, column: col * 8 },
        source: srcIdx
      });
    }
  }
  const prebuiltMap = prebuiltGen.toJSON();

  return await suite('Source Map', [
    // VLQ encoding
    bench('encodeVLQ() (10000x)', () => {
      for (let i = 0; i < 10000; i++) {
        encodeVLQ(i);
        encodeVLQ(-i);
      }
    }),

    // VLQ edge cases (large values)
    bench('encodeVLQ() large values (1000x)', () => {
      const values = [0, 1, -1, 15, -15, 255, -255, 1023, -1023, 65535, -65535];
      for (let i = 0; i < 1000; i++) {
        for (const v of values) {
          encodeVLQ(v);
        }
      }
    }),

    // Source map generation (small)
    bench('SourceMapGenerator 50 mappings', () => {
      const gen = new SourceMapGenerator({ file: 'out.js' });
      const src = gen.addSource('component.pulse');
      for (let i = 0; i < 50; i++) {
        gen.addMapping({
          generated: { line: i + 1, column: 0 },
          original: { line: i + 1, column: 0 },
          source: src
        });
      }
      gen.toString();
    }),

    // Source map generation (large)
    bench('SourceMapGenerator 1000 mappings', () => {
      const gen = new SourceMapGenerator({ file: 'bundle.js' });
      const src1 = gen.addSource('app.pulse');
      const src2 = gen.addSource('header.pulse');
      const src3 = gen.addSource('sidebar.pulse');
      const sources = [src1, src2, src3];
      for (let i = 0; i < 1000; i++) {
        gen.addMapping({
          generated: { line: Math.floor(i / 5) + 1, column: (i % 5) * 10 },
          original: { line: Math.floor(i / 3) + 1, column: (i % 3) * 8 },
          source: sources[i % 3]
        });
      }
      gen.toString();
    }, { iterations: 50 }),

    // Source map consumer position lookup
    bench('SourceMapConsumer lookup (1000x)', () => {
      const consumer = new SourceMapConsumer(prebuiltMap);
      for (let i = 0; i < 1000; i++) {
        consumer.originalPositionFor({
          line: (i % 200) + 1,
          column: (i % 5) * 10
        });
      }
    }),

    // Source map toJSON
    bench('SourceMapGenerator toJSON() (500x)', () => {
      const gen = new SourceMapGenerator({ file: 'output.js' });
      const src = gen.addSource('input.pulse');
      for (let i = 0; i < 100; i++) {
        gen.addMapping({
          generated: { line: i + 1, column: 0 },
          original: { line: i + 1, column: 0 },
          source: src
        });
      }
      for (let i = 0; i < 500; i++) {
        gen.toJSON();
      }
    }),

    // Inline source map (base64)
    bench('SourceMapGenerator toComment() (200x)', () => {
      const gen = new SourceMapGenerator({ file: 'output.js' });
      const src = gen.addSource('input.pulse', 'const x = 1;');
      for (let i = 0; i < 50; i++) {
        gen.addMapping({
          generated: { line: i + 1, column: 0 },
          original: { line: i + 1, column: 0 },
          source: src
        });
      }
      for (let i = 0; i < 200; i++) {
        gen.toComment();
      }
    })
  ]);
}
