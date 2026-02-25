/**
 * Pulse Framework - Build Tool Loader / Plugin Type Definitions
 * @module pulse-js-framework/loaders
 */

// ============================================================================
// Shared Option Types
// ============================================================================

/**
 * Options for SASS/SCSS compilation within style blocks.
 * Requires `sass` to be installed as a dev dependency.
 */
export interface SassOptions {
  /** Additional directories to search when resolving @use / @import (default: []) */
  loadPaths?: string[];

  /** Produce compressed (minified) CSS output (default: false) */
  compressed?: boolean;

  /** Log a message each time SASS compiles a file (default: false) */
  verbose?: boolean;
}

/**
 * Options for LESS compilation within style blocks.
 * Requires `less` to be installed as a dev dependency.
 */
export interface LessOptions {
  /** Additional directories to search when resolving @import (default: []) */
  paths?: string[];

  /** Produce compressed (minified) CSS output (default: false) */
  compress?: boolean;

  /** Log a message each time LESS compiles a file (default: false) */
  verbose?: boolean;
}

/**
 * Options for Stylus compilation within style blocks.
 * Requires `stylus` to be installed as a dev dependency.
 */
export interface StylusOptions {
  /** Additional directories to search when resolving @import (default: []) */
  paths?: string[];

  /** Produce compressed (minified) CSS output (default: false) */
  compress?: boolean;

  /** Log a message each time Stylus compiles a file (default: false) */
  verbose?: boolean;
}

/**
 * CSS preprocessor options shared by most loader plugins.
 */
export interface PreprocessorOptions {
  /** Options forwarded to the SASS/SCSS compiler (optional, requires `sass`) */
  sass?: SassOptions;

  /** Options forwarded to the LESS compiler (optional, requires `less`) */
  less?: LessOptions;

  /** Options forwarded to the Stylus compiler (optional, requires `stylus`) */
  stylus?: StylusOptions;
}

/**
 * Shared options accepted by every Pulse build-tool plugin.
 */
export interface BasePulsePluginOptions extends PreprocessorOptions {
  /**
   * Whether to emit a V3 source map alongside the compiled JavaScript.
   * @default true
   */
  sourceMap?: boolean;

  /**
   * Suppress all informational log output (errors and warnings are still shown).
   * Useful for CI environments and test runs.
   * @default false
   */
  quiet?: boolean;
}

// ============================================================================
// Vite – 'pulse-js-framework/vite'
// ============================================================================

/**
 * Options for the Pulse Vite plugin.
 */
export interface VitePluginOptions extends BasePulsePluginOptions {
  /**
   * Pattern of module IDs to exclude from transformation.
   * @default /node_modules/
   */
  exclude?: RegExp;
}

/**
 * Additional utility helpers exported alongside the Vite plugin.
 */
export interface VitePluginUtils {
  /**
   * Return true when `id` is a `.pulse` file path.
   * @param id - Module ID / file path to test
   */
  isPulseFile(id: string): boolean;

  /**
   * Derive the output `.js` filename from a `.pulse` file path.
   * @param id - `.pulse` file path
   */
  getOutputFilename(id: string): string;

  /**
   * Return the virtual CSS module ID that Vite uses for the styles extracted
   * from a given `.pulse` file.
   * @param id - `.pulse` file path
   */
  getVirtualCssId(id: string): string;
}

declare module 'pulse-js-framework/vite' {
  /**
   * Create the Pulse Vite plugin.
   *
   * Transforms `.pulse` files to JavaScript and routes their `style` blocks
   * through Vite's CSS pipeline via a virtual CSS module.
   * SASS/SCSS is compiled automatically when `sass` is installed.
   *
   * @param options - Plugin configuration
   * @returns Vite plugin object
   *
   * @example
   * // vite.config.js
   * import { defineConfig } from 'vite';
   * import pulsePlugin from 'pulse-js-framework/vite';
   *
   * export default defineConfig({
   *   plugins: [
   *     pulsePlugin({ sourceMap: true })
   *   ]
   * });
   */
  export default function pulsePlugin(options?: VitePluginOptions): object;

  /**
   * HMR runtime snippet (string of JavaScript).
   *
   * Injected into `.pulse` module output in development to enable hot
   * module replacement via `import.meta.hot`.
   *
   * @example
   * import { hmrRuntime } from 'pulse-js-framework/vite';
   * // hmrRuntime is a JS string; concatenate it into your build output if needed
   */
  export const hmrRuntime: string;

  /**
   * Utility helpers for working with `.pulse` paths in custom Vite integrations.
   */
  export const utils: VitePluginUtils;
}

// ============================================================================
// Webpack – 'pulse-js-framework/webpack'
// ============================================================================

/**
 * Options recognised by the Pulse Webpack loader (passed via `options:` in
 * the rule or `getOptions()`).
 */
export interface WebpackLoaderOptions extends BasePulsePluginOptions {
  /**
   * When `true` (default), emit the extracted CSS as a sidecar `.pulse.css`
   * file for downstream loaders (e.g. `css-loader` + `style-loader`).
   * When `false`, CSS injection is kept inline in the JS output.
   * @default true
   */
  extractCss?: boolean;

  /**
   * Enable Webpack Hot Module Replacement support.
   * @default true
   */
  hmr?: boolean;

  /**
   * Print preprocessor version info at startup.
   * @default true
   */
  verbose?: boolean;
}

/**
 * Result object returned to Webpack after the pitch phase.
 * The pitch loader has no meaningful return value but is typed for
 * compatibility with Webpack's loader interface.
 */
export type WebpackPitchResult = string | Buffer | undefined;

declare module 'pulse-js-framework/webpack' {
  /**
   * Pulse Webpack loader function.
   *
   * Add to your `module.rules` array:
   *
   * @example
   * // webpack.config.js
   * module.exports = {
   *   module: {
   *     rules: [
   *       {
   *         test: /\.pulse$/,
   *         use: [
   *           'style-loader',
   *           'css-loader',
   *           'pulse-js-framework/webpack'
   *         ]
   *       }
   *     ]
   *   }
   * };
   *
   * @param source - Raw `.pulse` file contents
   */
  export default function pulseLoader(this: object, source: string): void;

  /**
   * Pitch phase loader – runs before the normal loader chain.
   * Logs preprocessor availability on the first invocation.
   */
  export function pitch(this: object): WebpackPitchResult;

  /**
   * `false` – instructs Webpack to pass the source as a `string`, not a
   * `Buffer`.  Required for any loader that processes text.
   */
  export const raw: false;
}

// ============================================================================
// Rollup – 'pulse-js-framework/rollup'
// ============================================================================

/**
 * Options for the Pulse Rollup plugin.
 */
export interface RollupPluginOptions extends BasePulsePluginOptions {
  /**
   * Glob / RegExp / string[] pattern of files to include.
   * @default /\.pulse$/
   */
  include?: RegExp | string | string[];

  /**
   * Glob / RegExp / string[] pattern of files to exclude.
   * @default /node_modules/
   */
  exclude?: RegExp | string | string[];

  /**
   * File path for the emitted CSS bundle, relative to Rollup's `output.dir`.
   * When `null`, style injection remains inline in the compiled JS.
   * @default null
   */
  extractCss?: string | null;
}

declare module 'pulse-js-framework/rollup' {
  /**
   * Create the Pulse Rollup plugin.
   *
   * Transforms `.pulse` files to JavaScript.  Styles can be accumulated and
   * emitted as a single CSS asset via the `extractCss` option.
   *
   * @param options - Plugin configuration
   * @returns Rollup plugin object
   *
   * @example
   * // rollup.config.js
   * import pulsePlugin from 'pulse-js-framework/rollup';
   *
   * export default {
   *   input: 'src/main.js',
   *   output: { file: 'dist/bundle.js', format: 'es' },
   *   plugins: [
   *     pulsePlugin({
   *       sourceMap: true,
   *       extractCss: 'dist/bundle.css',
   *       sass: { loadPaths: ['src/styles'] }
   *     })
   *   ]
   * };
   */
  export default function pulsePlugin(options?: RollupPluginOptions): object;
}

// ============================================================================
// ESBuild – 'pulse-js-framework/esbuild'
// ============================================================================

/**
 * Options for the Pulse ESBuild plugin.
 */
export interface EsbuildPluginOptions extends BasePulsePluginOptions {
  /**
   * File path for the emitted CSS bundle.
   * When `null`, style injection remains inline in the compiled JS.
   * @default null
   */
  extractCss?: string | null;
}

declare module 'pulse-js-framework/esbuild' {
  /**
   * Create the Pulse ESBuild plugin.
   *
   * Registers an `onLoad` handler for `.pulse` files so ESBuild can include
   * them in the bundle.  Collected CSS is written to disk via an `onEnd` hook.
   *
   * @param options - Plugin configuration
   * @returns ESBuild plugin object (`{ name, setup }`)
   *
   * @example
   * // build.js
   * import * as esbuild from 'esbuild';
   * import pulsePlugin from 'pulse-js-framework/esbuild';
   *
   * await esbuild.build({
   *   entryPoints: ['src/main.js'],
   *   bundle: true,
   *   outfile: 'dist/bundle.js',
   *   plugins: [
   *     pulsePlugin({
   *       sourceMap: true,
   *       extractCss: 'dist/bundle.css'
   *     })
   *   ]
   * });
   */
  export default function pulsePlugin(options?: EsbuildPluginOptions): object;
}

// ============================================================================
// Parcel – 'pulse-js-framework/parcel'
// ============================================================================

/**
 * Logger object supplied by Parcel to transformer functions.
 */
export interface ParcelLogger {
  info(opts: { message: string }): void;
  warn(opts: { message: string; filePath?: string }): void;
  verbose(opts: { message: string }): void;
}

/**
 * Asset object supplied by Parcel to transformer functions.
 * Only the properties used by the Pulse transformer are typed here.
 */
export interface ParcelAsset {
  /** Absolute path to the source file */
  filePath: string;

  /** The current asset MIME type (e.g. `'js'`, `'css'`) */
  type: string;

  /** Read the asset's source code */
  getCode(): Promise<string>;

  /** Write compiled code back into the asset */
  setCode(code: string): void;

  /** Attach a source map to the asset */
  setMap(map: object): void;

  /**
   * Load a config file for this asset (searches for `.pulserc`, `.pulserc.json`,
   * or the `pulse` key in `package.json`).
   */
  getConfig(
    filenames: string[],
    opts?: { packageKey?: string }
  ): Promise<ParcelTransformerConfig | null>;

  /** Add a URL dependency (e.g. the sidecar CSS asset) */
  addDependency(opts: { specifier: string; specifierType: string }): void;

  /** Emit a child asset (e.g. extracted CSS) */
  addAsset(opts: { type: string; content: string; uniqueKey: string }): Promise<void>;
}

/**
 * Configuration object read from `.pulserc` / `.pulserc.json` / `package.json#pulse`.
 */
export interface ParcelTransformerConfig extends BasePulsePluginOptions {
  /**
   * Whether to route extracted CSS through Parcel's CSS pipeline.
   * @default true
   */
  extractCss?: boolean;

  /**
   * Print preprocessor version info at startup.
   * @default false
   */
  verbose?: boolean;
}

/**
 * The context object passed to `transformPulse`.
 */
export interface ParcelTransformContext {
  /** The Parcel asset being processed */
  asset: ParcelAsset;

  /** Parcel's structured logger */
  logger: ParcelLogger;
}

declare module 'pulse-js-framework/parcel' {
  /**
   * Core Parcel transformer function.
   *
   * This is the function invoked by Parcel's `Transformer` API.
   * It reads the asset source, compiles it, optionally preprocesses styles,
   * and returns the transformed asset(s).
   *
   * Configuration is read from `.pulserc`, `.pulserc.json`, or the `pulse`
   * key in `package.json`.
   *
   * @param context - `{ asset, logger }` supplied by Parcel
   * @returns Array containing the (mutated) asset
   *
   * @example
   * // .parcelrc
   * {
   *   "extends": "@parcel/config-default",
   *   "transformers": {
   *     "*.pulse": ["pulse-js-framework/parcel"]
   *   }
   * }
   */
  export function transformPulse(context: ParcelTransformContext): Promise<ParcelAsset[]>;

  /**
   * Default export – Parcel `Transformer`-compatible object with a `transform`
   * method that delegates to `transformPulse`.
   *
   * @example
   * import parcelPlugin from 'pulse-js-framework/parcel';
   * // parcelPlugin.transform === transformPulse
   */
  const _default: {
    transform: typeof transformPulse;
  };
  export default _default;
}

// ============================================================================
// SWC – 'pulse-js-framework/swc'
// ============================================================================

/**
 * Options for the Pulse SWC plugin and standalone transform functions.
 */
export interface SwcPluginOptions extends BasePulsePluginOptions {
  /**
   * File path for the emitted CSS bundle.
   * When `null`, style injection remains inline in the compiled JS.
   * @default null
   */
  extractCss?: string | null;
}

/**
 * Result returned by the SWC plugin's `transform` method and the standalone
 * `transformPulseFile` / `transformPulseCode` functions.
 */
export interface SwcTransformResult {
  /**
   * Compiled JavaScript source, or `null` if compilation failed.
   */
  code: string | null;

  /**
   * V3 source map object, or `null` if source maps are disabled or unavailable.
   */
  map: object | null;

  /**
   * Extracted (and optionally preprocessed) CSS, or `null` when no `style`
   * block was present in the source.
   */
  css: string | null;

  /**
   * Error message string if compilation failed, otherwise `null`.
   */
  error: string | null;
}

/**
 * Result item returned by `buildPulseFiles` for each processed file.
 */
export interface SwcBatchResult extends SwcTransformResult {
  /** The original file path that was processed */
  file: string;
}

/**
 * The plugin instance returned by `pulsePlugin` (default export from swc).
 */
export interface SwcPluginInstance {
  /** Plugin name */
  name: 'pulse';

  /**
   * Prepare the plugin for a new build: reset the accumulated CSS buffer and
   * (on first call) log preprocessor availability.
   */
  buildStart(): void;

  /**
   * Compile a single `.pulse` source string.
   *
   * @param source - `.pulse` source code
   * @param filePath - File path used in error messages and preprocessor resolution
   * @returns Transform result
   */
  transform(source: string, filePath: string): SwcTransformResult;

  /**
   * Flush any accumulated CSS to disk.
   * Call after all `transform` calls are complete.
   */
  buildEnd(): void;
}

declare module 'pulse-js-framework/swc' {
  /**
   * Create a Pulse SWC plugin instance.
   *
   * Returns a plugin object with `buildStart`, `transform`, and `buildEnd`
   * methods that mirror the lifecycle of Rollup / ESBuild plugins so the
   * same plugin can be integrated into any SWC-based pipeline.
   *
   * @param options - Plugin configuration
   * @returns SWC plugin instance
   *
   * @example
   * import pulsePlugin from 'pulse-js-framework/swc';
   *
   * const plugin = pulsePlugin({ extractCss: 'dist/bundle.css' });
   * plugin.buildStart();
   * const result = plugin.transform(source, 'src/App.pulse');
   * plugin.buildEnd();  // Writes accumulated CSS
   */
  export default function pulsePlugin(options?: SwcPluginOptions): SwcPluginInstance;

  /**
   * Read a `.pulse` file from disk and compile it to JavaScript.
   *
   * This is a convenience wrapper around `transformPulseCode` that handles
   * file I/O for you.
   *
   * @param filePath - Path to the `.pulse` file
   * @param options - Plugin options (same as `pulsePlugin`)
   * @returns Transform result
   *
   * @example
   * import { transformPulseFile } from 'pulse-js-framework/swc';
   *
   * const { code, css, error } = transformPulseFile('src/App.pulse', {
   *   sourceMap: true
   * });
   */
  export function transformPulseFile(
    filePath: string,
    options?: SwcPluginOptions
  ): SwcTransformResult;

  /**
   * Compile a `.pulse` source string to JavaScript.
   *
   * @param source - `.pulse` source code
   * @param options - Plugin options plus an optional `filename` for source maps
   * @returns Transform result
   *
   * @example
   * import { transformPulseCode } from 'pulse-js-framework/swc';
   *
   * const { code, css, error } = transformPulseCode(pulseSource, {
   *   filename: 'App.pulse',
   *   sourceMap: true
   * });
   */
  export function transformPulseCode(
    source: string,
    options?: SwcPluginOptions & { filename?: string }
  ): SwcTransformResult;

  /**
   * Compile multiple `.pulse` files in a single pass.
   *
   * Internally creates one plugin instance for the whole batch so CSS is
   * accumulated and written to disk once at the end (when `extractCss` is set).
   *
   * @param files - Array of `.pulse` file paths
   * @param options - Plugin options (same as `pulsePlugin`)
   * @returns Array of per-file results
   *
   * @example
   * import { buildPulseFiles } from 'pulse-js-framework/swc';
   *
   * const results = buildPulseFiles(
   *   ['src/App.pulse', 'src/Home.pulse'],
   *   { extractCss: 'dist/bundle.css' }
   * );
   */
  export function buildPulseFiles(
    files: string[],
    options?: SwcPluginOptions
  ): SwcBatchResult[];

  /**
   * Async variant of `transformPulseFile` that reads files non-blocking.
   *
   * @param filePath - Path to the `.pulse` file
   * @param options - Plugin options
   * @returns Promise resolving to transform result
   */
  export function transformPulseFileAsync(
    filePath: string,
    options?: SwcPluginOptions
  ): Promise<SwcTransformResult>;

  /**
   * Async variant of `buildPulseFiles` that reads files non-blocking.
   *
   * @param files - Array of `.pulse` file paths
   * @param options - Plugin options
   * @returns Promise resolving to array of per-file results
   */
  export function buildPulseFilesAsync(
    files: string[],
    options?: SwcPluginOptions
  ): Promise<SwcBatchResult[]>;
}

// ============================================================================
// Server Components shared types
// ============================================================================

/**
 * A single entry in the client manifest produced by a Server Components plugin.
 */
export interface ClientComponentManifestEntry {
  /** URL / path to the chunk file that contains this component */
  chunk: string | null;

  /** Source file that defines this component */
  file?: string;
}

/**
 * The client manifest JSON written to disk by Server Components plugins.
 */
export interface ClientManifest {
  /** Manifest format version */
  version: string;

  /**
   * Map of component IDs to their manifest entries.
   * Keys are component IDs derived from export names / `__componentId`.
   */
  components: Record<string, ClientComponentManifestEntry>;
}

/**
 * Options accepted by all three Server Components plugins (Vite / Webpack /
 * Rollup).
 */
export interface ServerComponentsPluginOptions {
  /**
   * File-system path where the JSON client manifest is written.
   * @default 'dist/.pulse-manifest.json'
   */
  manifestPath?: string;

  /**
   * Public base URL prepended to chunk URLs inside the manifest.
   * @default ''
   */
  base?: string;

  /**
   * Filename used when emitting the manifest as a bundle asset.
   * @default '.pulse-manifest.json'
   */
  manifestFilename?: string;

  /**
   * Suppress all informational log output (errors and warnings are still shown).
   * @default false
   */
  quiet?: boolean;
}

// ============================================================================
// Vite Server Components – 'pulse-js-framework/vite/server-components'
// ============================================================================

/**
 * Options for the Vite Server Components plugin (extends the shared options).
 */
export interface ViteServerComponentsPluginOptions extends ServerComponentsPluginOptions {
  /**
   * Whether to inject the client manifest into SSR HTML builds.
   * @default true
   */
  injectManifest?: boolean;
}

declare module 'pulse-js-framework/vite/server-components' {
  /**
   * Create the Pulse Server Components Vite plugin.
   *
   * Should be used together with the main Pulse Vite plugin.
   * Detects Client Components (marked via `'use client'` directive), splits
   * them into separate chunks, generates a client manifest, and validates
   * that Client Components do not import Server-only modules.
   *
   * @param options - Plugin configuration
   * @returns Vite plugin object
   *
   * @example
   * // vite.config.js
   * import pulsePlugin from 'pulse-js-framework/vite';
   * import pulseServerComponents from 'pulse-js-framework/vite/server-components';
   *
   * export default {
   *   plugins: [
   *     pulsePlugin(),
   *     pulseServerComponents()
   *   ]
   * };
   */
  export default function pulseServerComponentsPlugin(
    options?: ViteServerComponentsPluginOptions
  ): object;

  /**
   * Load the client manifest from disk (for use in the SSR server).
   *
   * @param manifestPath - Path to the JSON manifest file
   * @returns Parsed client manifest (returns an empty manifest on failure)
   *
   * @example
   * import { loadClientManifest } from 'pulse-js-framework/vite/server-components';
   *
   * const manifest = loadClientManifest('./dist/.pulse-manifest.json');
   */
  export function loadClientManifest(manifestPath: string): ClientManifest;

  /**
   * Look up the chunk URL for a specific Client Component.
   *
   * @param manifest - Parsed client manifest
   * @param componentId - The component's ID string
   * @returns The chunk URL, or `null` if the component is not in the manifest
   */
  export function getComponentChunk(
    manifest: ClientManifest,
    componentId: string
  ): string | null;

  /**
   * Return a `Set` of all Client Component IDs registered in the manifest.
   *
   * @param manifest - Parsed client manifest
   * @returns Set of component ID strings
   */
  export function getClientComponentIds(manifest: ClientManifest): Set<string>;
}

// ============================================================================
// Webpack Server Components – 'pulse-js-framework/webpack/server-components'
// ============================================================================

declare module 'pulse-js-framework/webpack/server-components' {
  /**
   * Webpack plugin class that adds Server Components support alongside the
   * standard Pulse Webpack loader.
   *
   * Detects Client Components, maps them to their output chunks, emits a
   * client manifest asset, and validates import rules (Client must not import
   * Server-only modules).
   *
   * @example
   * const PulseServerComponentsPlugin = require('pulse-js-framework/webpack/server-components').default;
   *
   * module.exports = {
   *   plugins: [new PulseServerComponentsPlugin({ manifestPath: 'dist/.pulse-manifest.json' })]
   * };
   */
  class PulseServerComponentsPlugin {
    constructor(options?: ServerComponentsPluginOptions);

    /**
     * Webpack `apply` entry point.
     * @param compiler - Webpack `Compiler` instance
     */
    apply(compiler: object): void;
  }

  export default PulseServerComponentsPlugin;

  /**
   * Convenience factory that constructs a `PulseServerComponentsPlugin`
   * instance.  Equivalent to `new PulseServerComponentsPlugin(options)`.
   *
   * @param options - Plugin configuration
   * @returns Plugin instance ready to add to `config.plugins`
   *
   * @example
   * const { addServerComponentsSupport } = require('pulse-js-framework/webpack/server-components');
   *
   * module.exports = {
   *   plugins: [
   *     addServerComponentsSupport({ manifestPath: 'dist/.pulse-manifest.json' })
   *   ]
   * };
   */
  export function addServerComponentsSupport(
    options?: ServerComponentsPluginOptions
  ): PulseServerComponentsPlugin;

  /**
   * Load the client manifest from disk (for use in the SSR server).
   *
   * @param manifestPath - Path to the JSON manifest file
   * @returns Parsed client manifest (returns an empty manifest on failure)
   */
  export function loadClientManifest(manifestPath: string): ClientManifest;

  /**
   * Look up the chunk URL for a specific Client Component.
   *
   * @param manifest - Parsed client manifest
   * @param componentId - The component's ID string
   * @returns The chunk URL, or `null` if the component is not in the manifest
   */
  export function getComponentChunk(
    manifest: ClientManifest,
    componentId: string
  ): string | null;

  /**
   * Return a `Set` of all Client Component IDs registered in the manifest.
   *
   * @param manifest - Parsed client manifest
   * @returns Set of component ID strings
   */
  export function getClientComponentIds(manifest: ClientManifest): Set<string>;
}

// ============================================================================
// Rollup Server Components – 'pulse-js-framework/rollup/server-components'
// ============================================================================

declare module 'pulse-js-framework/rollup/server-components' {
  /**
   * Create the Pulse Server Components Rollup plugin.
   *
   * Should be used together with the main Pulse Rollup plugin.
   * Detects Client Components, creates separate output chunks for them,
   * generates a client manifest, and validates Client → Server import rules.
   * The `closeBundle` hook is async (uses non-blocking I/O).
   *
   * @param options - Plugin configuration
   * @returns Rollup plugin object
   *
   * @example
   * // rollup.config.js
   * import pulsePlugin from 'pulse-js-framework/rollup';
   * import pulseServerComponents from 'pulse-js-framework/rollup/server-components';
   *
   * export default {
   *   input: 'src/main.js',
   *   output: { dir: 'dist', format: 'es' },
   *   plugins: [
   *     pulsePlugin(),
   *     pulseServerComponents()
   *   ]
   * };
   */
  export default function pulseServerComponentsPlugin(
    options?: ServerComponentsPluginOptions
  ): object;

  /**
   * Load the client manifest from disk (for use in the SSR server).
   *
   * @param manifestPath - Path to the JSON manifest file
   * @returns Parsed client manifest (returns an empty manifest on failure)
   *
   * @example
   * import { loadClientManifest } from 'pulse-js-framework/rollup/server-components';
   *
   * const manifest = loadClientManifest('./dist/.pulse-manifest.json');
   */
  export function loadClientManifest(manifestPath: string): ClientManifest;

  /**
   * Look up the chunk URL for a specific Client Component.
   *
   * @param manifest - Parsed client manifest
   * @param componentId - The component's ID string
   * @returns The chunk URL, or `null` if the component is not in the manifest
   */
  export function getComponentChunk(
    manifest: ClientManifest,
    componentId: string
  ): string | null;

  /**
   * Return a `Set` of all Client Component IDs registered in the manifest.
   *
   * @param manifest - Parsed client manifest
   * @returns Set of component ID strings
   */
  export function getClientComponentIds(manifest: ClientManifest): Set<string>;
}

// ============================================================================
// ESBuild Server Components – 'pulse-js-framework/esbuild/server-components'
// ============================================================================

declare module 'pulse-js-framework/esbuild/server-components' {
  /**
   * Create the Pulse Server Components ESBuild plugin.
   *
   * Should be used together with the main Pulse ESBuild plugin.
   * Detects Client Components, validates Client → Server import boundaries,
   * maps components to output chunks via metafile, and generates a client manifest.
   *
   * Note: ESBuild does not support `manualChunks`. Use `splitting: true` in
   * your ESBuild config for code splitting.
   *
   * @param options - Plugin configuration
   * @returns ESBuild plugin object (`{ name, setup }`)
   *
   * @example
   * import * as esbuild from 'esbuild';
   * import pulsePlugin from 'pulse-js-framework/esbuild';
   * import pulseServerComponents from 'pulse-js-framework/esbuild/server-components';
   *
   * await esbuild.build({
   *   entryPoints: ['src/main.js'],
   *   bundle: true,
   *   outdir: 'dist',
   *   format: 'esm',
   *   splitting: true,
   *   metafile: true,
   *   plugins: [
   *     pulsePlugin(),
   *     pulseServerComponents()
   *   ]
   * });
   */
  export default function pulseServerComponentsPlugin(
    options?: ServerComponentsPluginOptions
  ): object;

  /**
   * Load the client manifest from disk (for use in the SSR server).
   *
   * @param manifestPath - Path to the JSON manifest file
   * @returns Parsed client manifest (returns an empty manifest on failure)
   */
  export function loadClientManifest(manifestPath: string): ClientManifest;

  /**
   * Look up the chunk URL for a specific Client Component.
   *
   * @param manifest - Parsed client manifest
   * @param componentId - The component's ID string
   * @returns The chunk URL, or `null` if the component is not in the manifest
   */
  export function getComponentChunk(
    manifest: ClientManifest,
    componentId: string
  ): string | null;

  /**
   * Return a `Set` of all Client Component IDs registered in the manifest.
   *
   * @param manifest - Parsed client manifest
   * @returns Set of component ID strings
   */
  export function getClientComponentIds(manifest: ClientManifest): Set<string>;
}

// ============================================================================
// Shared Constants – 'pulse-js-framework/loader/shared'
// ============================================================================

declare module 'pulse-js-framework/loader/shared' {
  /** Regex matching `__directive: "use client"` in compiled output */
  export const DIRECTIVE_REGEX: RegExp;

  /** Regex extracting component ID from `__componentId: "Name"` */
  export const COMPONENT_ID_REGEX: RegExp;

  /** Regex extracting component name from `export const Name = {` */
  export const EXPORT_CONST_REGEX: RegExp;

  /** Chunk name prefix for Client Components (`"client-"`) */
  export const CLIENT_CHUNK_PREFIX: string;

  /** Default manifest output path (`"dist/.pulse-manifest.json"`) */
  export const DEFAULT_MANIFEST_PATH: string;

  /** Default manifest filename (`".pulse-manifest.json"`) */
  export const DEFAULT_MANIFEST_FILENAME: string;

  /** Load client manifest from disk */
  export function loadClientManifest(manifestPath: string): ClientManifest;

  /** Get chunk URL for a Client Component */
  export function getComponentChunk(
    manifest: ClientManifest,
    componentId: string
  ): string | null;

  /** Get all Client Component IDs from manifest */
  export function getClientComponentIds(manifest: ClientManifest): Set<string>;
}
