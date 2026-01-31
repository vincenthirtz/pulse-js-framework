/**
 * Pulse Source Map Generator
 *
 * Generates V3 source maps for .pulse files compiled to JavaScript.
 * Enables debugging of original .pulse code in browser devtools.
 *
 * @module pulse-js-framework/compiler/sourcemap
 */

/**
 * Base64 VLQ encoding for source map mappings
 * VLQ (Variable Length Quantity) is used to encode position data compactly
 */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode a number as VLQ base64
 * @param {number} value - Number to encode (can be negative)
 * @returns {string} VLQ encoded string
 */
export function encodeVLQ(value) {
  let encoded = '';
  // Convert to unsigned and add sign bit
  let vlq = value < 0 ? ((-value) << 1) + 1 : (value << 1);

  do {
    let digit = vlq & 0x1F; // 5 bits
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 0x20; // Set continuation bit
    }
    encoded += BASE64_CHARS[digit];
  } while (vlq > 0);

  return encoded;
}

/**
 * Source Map Generator class
 * Tracks mappings between generated and original source positions
 */
export class SourceMapGenerator {
  /**
   * @param {Object} options
   * @param {string} options.file - Generated file name
   * @param {string} options.sourceRoot - Root URL for source files
   */
  constructor(options = {}) {
    this.file = options.file || '';
    this.sourceRoot = options.sourceRoot || '';
    this.sources = [];
    this.sourcesContent = [];
    this.names = [];
    this.mappings = [];

    // Current state for relative encoding
    this._lastGeneratedLine = 0;
    this._lastGeneratedColumn = 0;
    this._lastSourceIndex = 0;
    this._lastSourceLine = 0;
    this._lastSourceColumn = 0;
    this._lastNameIndex = 0;
  }

  /**
   * Add a source file
   * @param {string} source - Source file path
   * @param {string} content - Source file content (optional)
   * @returns {number} Source index
   */
  addSource(source, content = null) {
    let index = this.sources.indexOf(source);
    if (index === -1) {
      index = this.sources.length;
      this.sources.push(source);
      this.sourcesContent.push(content);
    }
    return index;
  }

  /**
   * Add a name (identifier) to the names array
   * @param {string} name - Identifier name
   * @returns {number} Name index
   */
  addName(name) {
    let index = this.names.indexOf(name);
    if (index === -1) {
      index = this.names.length;
      this.names.push(name);
    }
    return index;
  }

  /**
   * Add a mapping between generated and original positions
   * @param {Object} mapping
   * @param {Object} mapping.generated - Generated position {line, column}
   * @param {Object} mapping.original - Original position {line, column} (optional)
   * @param {string} mapping.source - Source file path (required if original provided)
   * @param {string} mapping.name - Original identifier name (optional)
   */
  addMapping(mapping) {
    const { generated, original, source, name } = mapping;

    // Ensure mappings array has enough lines
    while (this.mappings.length <= generated.line) {
      this.mappings.push([]);
    }

    const segment = {
      generatedColumn: generated.column,
      sourceIndex: source ? this.addSource(source) : null,
      originalLine: original?.line ?? null,
      originalColumn: original?.column ?? null,
      nameIndex: name ? this.addName(name) : null
    };

    this.mappings[generated.line].push(segment);
  }

  /**
   * Encode all mappings as VLQ string
   * @returns {string} Encoded mappings
   */
  _encodeMappings() {
    let previousGeneratedColumn = 0;
    let previousSourceIndex = 0;
    let previousSourceLine = 0;
    let previousSourceColumn = 0;
    let previousNameIndex = 0;

    const lines = [];

    for (const line of this.mappings) {
      if (line.length === 0) {
        lines.push('');
        continue;
      }

      // Sort segments by generated column
      line.sort((a, b) => a.generatedColumn - b.generatedColumn);

      const segments = [];
      previousGeneratedColumn = 0; // Reset column for each line

      for (const segment of line) {
        let encoded = '';

        // 1. Generated column (relative to previous segment in same line)
        encoded += encodeVLQ(segment.generatedColumn - previousGeneratedColumn);
        previousGeneratedColumn = segment.generatedColumn;

        // If we have source info
        if (segment.sourceIndex !== null) {
          // 2. Source file index (relative)
          encoded += encodeVLQ(segment.sourceIndex - previousSourceIndex);
          previousSourceIndex = segment.sourceIndex;

          // 3. Original line (relative, 0-based in source maps)
          encoded += encodeVLQ(segment.originalLine - previousSourceLine);
          previousSourceLine = segment.originalLine;

          // 4. Original column (relative)
          encoded += encodeVLQ(segment.originalColumn - previousSourceColumn);
          previousSourceColumn = segment.originalColumn;

          // 5. Optional: name index (relative)
          if (segment.nameIndex !== null) {
            encoded += encodeVLQ(segment.nameIndex - previousNameIndex);
            previousNameIndex = segment.nameIndex;
          }
        }

        segments.push(encoded);
      }

      lines.push(segments.join(','));
    }

    return lines.join(';');
  }

  /**
   * Generate the source map object
   * @returns {Object} Source map object (V3 format)
   */
  toJSON() {
    return {
      version: 3,
      file: this.file,
      sourceRoot: this.sourceRoot,
      sources: this.sources,
      sourcesContent: this.sourcesContent,
      names: this.names,
      mappings: this._encodeMappings()
    };
  }

  /**
   * Generate source map as JSON string
   * @returns {string} JSON string
   */
  toString() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Generate inline source map comment
   * @returns {string} Comment with base64 encoded source map
   */
  toComment() {
    const base64 = typeof btoa === 'function'
      ? btoa(this.toString())
      : Buffer.from(this.toString()).toString('base64');
    return `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64}`;
  }

  /**
   * Generate external source map URL comment
   * @param {string} url - URL to source map file
   * @returns {string} Comment with source map URL
   */
  static toURLComment(url) {
    return `//# sourceMappingURL=${url}`;
  }
}

/**
 * Source Map Consumer - parse and query source maps
 * Useful for error stack trace translation
 */
export class SourceMapConsumer {
  /**
   * @param {Object|string} sourceMap - Source map object or JSON string
   */
  constructor(sourceMap) {
    this.map = typeof sourceMap === 'string' ? JSON.parse(sourceMap) : sourceMap;
    this._decodedMappings = null;
  }

  /**
   * Decode VLQ string to numbers
   * @param {string} str - VLQ encoded string
   * @returns {number[]} Decoded numbers
   */
  static decodeVLQ(str) {
    const values = [];
    let value = 0;
    let shift = 0;

    for (const char of str) {
      const digit = BASE64_CHARS.indexOf(char);
      if (digit === -1) continue;

      value += (digit & 0x1F) << shift;

      if (digit & 0x20) {
        shift += 5;
      } else {
        // Check sign bit
        const negative = value & 1;
        value >>= 1;
        values.push(negative ? -value : value);
        value = 0;
        shift = 0;
      }
    }

    return values;
  }

  /**
   * Get original position for a generated position
   * @param {Object} position - Generated position {line, column}
   * @returns {Object|null} Original position or null
   */
  originalPositionFor(position) {
    this._ensureDecoded();

    const { line, column } = position;
    const lineData = this._decodedMappings[line];

    if (!lineData) return null;

    // Find the closest mapping at or before this column
    let closest = null;
    for (const mapping of lineData) {
      if (mapping.generatedColumn <= column) {
        closest = mapping;
      } else {
        break;
      }
    }

    if (!closest || closest.sourceIndex === null) return null;

    return {
      source: this.map.sources[closest.sourceIndex],
      line: closest.originalLine,
      column: closest.originalColumn,
      name: closest.nameIndex !== null ? this.map.names[closest.nameIndex] : null
    };
  }

  /**
   * Decode mappings lazily
   */
  _ensureDecoded() {
    if (this._decodedMappings) return;

    this._decodedMappings = [];
    const lines = this.map.mappings.split(';');

    let sourceIndex = 0;
    let sourceLine = 0;
    let sourceColumn = 0;
    let nameIndex = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const segments = line.split(',').filter(s => s);
      const lineData = [];
      let generatedColumn = 0;

      for (const segment of segments) {
        const values = SourceMapConsumer.decodeVLQ(segment);

        generatedColumn += values[0];

        const mapping = { generatedColumn };

        if (values.length >= 4) {
          sourceIndex += values[1];
          sourceLine += values[2];
          sourceColumn += values[3];

          mapping.sourceIndex = sourceIndex;
          mapping.originalLine = sourceLine;
          mapping.originalColumn = sourceColumn;
        }

        if (values.length >= 5) {
          nameIndex += values[4];
          mapping.nameIndex = nameIndex;
        }

        lineData.push(mapping);
      }

      this._decodedMappings.push(lineData);
    }
  }
}

export default {
  SourceMapGenerator,
  SourceMapConsumer,
  encodeVLQ
};
