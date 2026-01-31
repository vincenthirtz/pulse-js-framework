/**
 * Pulse Framework - LRU Cache Type Definitions
 * @module pulse-js-framework/runtime/lru-cache
 */

/**
 * LRU (Least Recently Used) Cache implementation.
 * Uses Map's insertion order for efficient O(1) operations.
 * When capacity is reached, the least recently accessed item is evicted.
 *
 * @template K - Key type
 * @template V - Value type
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, number>(100);
 * cache.set('key1', 42);
 * cache.get('key1'); // 42 - moves 'key1' to most recently used
 * ```
 */
export declare class LRUCache<K = unknown, V = unknown> {
  /**
   * Create an LRU cache
   * @param capacity - Maximum number of items to store (must be > 0)
   * @throws {Error} If capacity is <= 0
   */
  constructor(capacity: number);

  /**
   * Get an item from the cache.
   * Accessing an item moves it to the "most recently used" position.
   *
   * @param key - Cache key
   * @returns The cached value, or undefined if not found
   *
   * @example
   * ```typescript
   * const value = cache.get('myKey');
   * if (value !== undefined) {
   *   // Use the cached value
   * }
   * ```
   */
  get(key: K): V | undefined;

  /**
   * Set an item in the cache.
   * If the cache is at capacity, evicts the least recently used item.
   *
   * @param key - Cache key
   * @param value - Value to store
   * @returns this (for chaining)
   *
   * @example
   * ```typescript
   * cache.set('key1', 'value1').set('key2', 'value2');
   * ```
   */
  set(key: K, value: V): this;

  /**
   * Check if a key exists in the cache.
   * Note: This does NOT update the item's "recently used" position.
   *
   * @param key - Cache key
   * @returns true if key exists
   */
  has(key: K): boolean;

  /**
   * Delete an item from the cache.
   *
   * @param key - Cache key
   * @returns true if item was deleted, false if key didn't exist
   */
  delete(key: K): boolean;

  /**
   * Clear all items from the cache.
   */
  clear(): void;

  /**
   * Get the current number of items in the cache.
   */
  readonly size: number;

  /**
   * Get the maximum capacity of the cache.
   */
  readonly capacity: number;

  /**
   * Get all keys in the cache (oldest to newest).
   * @returns Iterator of keys
   */
  keys(): IterableIterator<K>;

  /**
   * Get all values in the cache (oldest to newest).
   * @returns Iterator of values
   */
  values(): IterableIterator<V>;

  /**
   * Get all entries in the cache (oldest to newest).
   * @returns Iterator of [key, value] pairs
   */
  entries(): IterableIterator<[K, V]>;

  /**
   * Iterate over all entries.
   * @param callback - Called for each entry
   */
  forEach(callback: (value: V, key: K, cache: LRUCache<K, V>) => void): void;
}

export default LRUCache;
