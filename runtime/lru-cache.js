/**
 * LRU (Least Recently Used) Cache
 * @module pulse-js-framework/runtime/lru-cache
 *
 * A simple LRU cache implementation using Map's insertion order.
 * When capacity is reached, the least recently used item is evicted.
 */

/**
 * LRU Cache implementation
 * Uses Map's insertion order for O(1) operations.
 * @template K, V
 */
export class LRUCache {
  /**
   * Create an LRU cache
   * @param {number} capacity - Maximum number of items to store
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.trackMetrics=false] - Enable hit/miss/eviction tracking
   */
  constructor(capacity, options = {}) {
    if (capacity <= 0) {
      throw new Error('LRU cache capacity must be greater than 0');
    }
    this._capacity = capacity;
    this._cache = new Map();

    // Metrics tracking
    this._trackMetrics = options.trackMetrics || false;
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  /**
   * Get an item from the cache
   * Accessing an item moves it to the "most recently used" position
   * @param {K} key - Cache key
   * @returns {V|undefined} The cached value or undefined if not found
   */
  get(key) {
    if (!this._cache.has(key)) {
      if (this._trackMetrics) this._misses++;
      return undefined;
    }

    if (this._trackMetrics) this._hits++;

    // Move to end (most recently used) by re-inserting
    const value = this._cache.get(key);
    this._cache.delete(key);
    this._cache.set(key, value);
    return value;
  }

  /**
   * Set an item in the cache
   * If the cache is at capacity, evicts the least recently used item
   * @param {K} key - Cache key
   * @param {V} value - Value to store
   * @returns {LRUCache} this (for chaining)
   */
  set(key, value) {
    // If key exists, delete first to update position
    if (this._cache.has(key)) {
      this._cache.delete(key);
    } else if (this._cache.size >= this._capacity) {
      // Remove oldest (first item in Map)
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
      if (this._trackMetrics) this._evictions++;
    }

    this._cache.set(key, value);
    return this;
  }

  /**
   * Check if a key exists in the cache
   * Note: This does NOT update the item's position
   * @param {K} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this._cache.has(key);
  }

  /**
   * Delete an item from the cache
   * @param {K} key - Cache key
   * @returns {boolean} True if item was deleted
   */
  delete(key) {
    return this._cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this._cache.clear();
  }

  /**
   * Get the current number of items in the cache
   * @returns {number} Current size
   */
  get size() {
    return this._cache.size;
  }

  /**
   * Get the maximum capacity of the cache
   * @returns {number} Maximum capacity
   */
  get capacity() {
    return this._capacity;
  }

  /**
   * Get all keys in the cache (oldest to newest)
   * @returns {IterableIterator<K>} Iterator of keys
   */
  keys() {
    return this._cache.keys();
  }

  /**
   * Get all values in the cache (oldest to newest)
   * @returns {IterableIterator<V>} Iterator of values
   */
  values() {
    return this._cache.values();
  }

  /**
   * Get all entries in the cache (oldest to newest)
   * @returns {IterableIterator<[K, V]>} Iterator of [key, value] pairs
   */
  entries() {
    return this._cache.entries();
  }

  /**
   * Iterate over all entries
   * @param {function(V, K, LRUCache): void} callback - Called for each entry
   */
  forEach(callback) {
    this._cache.forEach((value, key) => callback(value, key, this));
  }

  /**
   * Get cache performance metrics
   * Only available if trackMetrics option was enabled
   * @returns {{hits: number, misses: number, evictions: number, hitRate: number, size: number, capacity: number}}
   * @example
   * const cache = new LRUCache(100, { trackMetrics: true });
   * // ... use cache ...
   * const stats = cache.getMetrics();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
   */
  getMetrics() {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRate: total > 0 ? this._hits / total : 0,
      size: this._cache.size,
      capacity: this._capacity
    };
  }

  /**
   * Reset all metrics counters to zero
   * Useful for measuring metrics over specific time periods
   */
  resetMetrics() {
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  /**
   * Enable or disable metrics tracking
   * @param {boolean} enabled - Whether to track metrics
   */
  setMetricsTracking(enabled) {
    this._trackMetrics = enabled;
  }
}

export default LRUCache;
