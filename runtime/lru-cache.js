/**
 * LRU (Least Recently Used) Cache
 * @module pulse-js-framework/runtime/lru-cache
 *
 * A simple LRU cache implementation using Map's insertion order.
 * When capacity is reached, the least recently used item is evicted.
 */

/**
 * LRU Cache implementation
 * @template K, V
 */
export class LRUCache {
  /** @type {number} */
  #capacity;

  /** @type {Map<K, V>} */
  #cache = new Map();

  /**
   * Create an LRU cache
   * @param {number} capacity - Maximum number of items to store
   */
  constructor(capacity) {
    if (capacity <= 0) {
      throw new Error('LRU cache capacity must be greater than 0');
    }
    this.#capacity = capacity;
  }

  /**
   * Get an item from the cache
   * Accessing an item moves it to the "most recently used" position
   * @param {K} key - Cache key
   * @returns {V|undefined} The cached value or undefined if not found
   */
  get(key) {
    if (!this.#cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    const value = this.#cache.get(key);
    this.#cache.delete(key);
    this.#cache.set(key, value);
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
    if (this.#cache.has(key)) {
      this.#cache.delete(key);
    } else if (this.#cache.size >= this.#capacity) {
      // Remove oldest (first item in Map)
      const oldest = this.#cache.keys().next().value;
      this.#cache.delete(oldest);
    }

    this.#cache.set(key, value);
    return this;
  }

  /**
   * Check if a key exists in the cache
   * Note: This does NOT update the item's position
   * @param {K} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.#cache.has(key);
  }

  /**
   * Delete an item from the cache
   * @param {K} key - Cache key
   * @returns {boolean} True if item was deleted
   */
  delete(key) {
    return this.#cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.#cache.clear();
  }

  /**
   * Get the current number of items in the cache
   * @returns {number} Current size
   */
  get size() {
    return this.#cache.size;
  }

  /**
   * Get the maximum capacity of the cache
   * @returns {number} Maximum capacity
   */
  get capacity() {
    return this.#capacity;
  }

  /**
   * Get all keys in the cache (oldest to newest)
   * @returns {IterableIterator<K>} Iterator of keys
   */
  keys() {
    return this.#cache.keys();
  }

  /**
   * Get all values in the cache (oldest to newest)
   * @returns {IterableIterator<V>} Iterator of values
   */
  values() {
    return this.#cache.values();
  }

  /**
   * Get all entries in the cache (oldest to newest)
   * @returns {IterableIterator<[K, V]>} Iterator of [key, value] pairs
   */
  entries() {
    return this.#cache.entries();
  }

  /**
   * Iterate over all entries
   * @param {function(V, K, LRUCache): void} callback - Called for each entry
   */
  forEach(callback) {
    this.#cache.forEach((value, key) => callback(value, key, this));
  }
}

export default LRUCache;
