/**
 * Pulse Framework - Source Map Type Definitions
 * @module pulse-js-framework/compiler/sourcemap
 */

/** Source map position */
export interface Position {
  line: number;
  column: number;
}

/** Source map mapping */
export interface Mapping {
  generated: Position;
  original?: Position;
  source?: string;
  name?: string;
}

/** V3 Source Map format */
export interface SourceMapV3 {
  version: 3;
  file: string;
  sourceRoot: string;
  sources: string[];
  sourcesContent: (string | null)[];
  names: string[];
  mappings: string;
}

/** Original position result from consumer */
export interface OriginalPosition {
  source: string;
  line: number;
  column: number;
  name: string | null;
}

/**
 * Source Map Generator
 * Generates V3 source maps for compiled .pulse files
 */
export declare class SourceMapGenerator {
  /**
   * Create a new source map generator
   * @param options - Generator options
   */
  constructor(options?: {
    file?: string;
    sourceRoot?: string;
  });

  /**
   * Add a source file
   * @param source - Source file path
   * @param content - Source file content (optional, for inline sources)
   * @returns Source index
   */
  addSource(source: string, content?: string | null): number;

  /**
   * Add a name (identifier) to the names array
   * @param name - Identifier name
   * @returns Name index
   */
  addName(name: string): number;

  /**
   * Add a mapping between generated and original positions
   * @param mapping - Mapping information
   */
  addMapping(mapping: Mapping): void;

  /**
   * Generate the source map object
   * @returns V3 source map object
   */
  toJSON(): SourceMapV3;

  /**
   * Generate source map as JSON string
   */
  toString(): string;

  /**
   * Generate inline source map comment
   * @returns Comment with base64 encoded source map
   */
  toComment(): string;

  /**
   * Generate external source map URL comment
   * @param url - URL to source map file
   */
  static toURLComment(url: string): string;
}

/**
 * Source Map Consumer
 * Parse and query source maps for error stack trace translation
 */
export declare class SourceMapConsumer {
  /**
   * Create a new source map consumer
   * @param sourceMap - Source map object or JSON string
   */
  constructor(sourceMap: SourceMapV3 | string);

  /**
   * Decode VLQ string to numbers
   * @param str - VLQ encoded string
   */
  static decodeVLQ(str: string): number[];

  /**
   * Get original position for a generated position
   * @param position - Generated position
   * @returns Original position or null if not found
   */
  originalPositionFor(position: Position): OriginalPosition | null;
}

/**
 * Encode a number as VLQ base64
 */
export declare function encodeVLQ(value: number): string;
