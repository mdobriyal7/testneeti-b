const NodeCache = require("node-cache");

// Create cache instance with default TTL of 1 hour
const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 120,
  useClones: false,
});

const cacheUtils = {
  async get(key) {
    try {
      return cache.get(key);
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      return cache.set(key, value, ttl);
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  },

  async del(key) {
    try {
      if (key.includes('*')) {
        // If key contains wildcard, delete all matching keys
        const keys = this.keys(key);
        return cache.del(keys);
      }
      return cache.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  },

  async flush() {
    try {
      return cache.flushAll();
    } catch (error) {
      console.error("Cache flush error:", error);
      return false;
    }
  },

  // Helper method to get or set cache
  async getOrSet(key, callback, ttl = 3600) {
    try {
      let value = await this.get(key);
      if (value === undefined || value === null) {
        value = await callback();
        await this.set(key, value, ttl);
      }
      return value;
    } catch (error) {
      console.error("Cache getOrSet error:", error);
      return callback();
    }
  },

  // Get all keys matching a pattern
  keys(pattern) {
    try {
      const allKeys = cache.keys();
      if (!pattern || !pattern.includes('*')) {
        return [pattern];
      }

      // Convert glob pattern to regex
      const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return allKeys.filter(key => regexPattern.test(key));
    } catch (error) {
      console.error("Cache keys error:", error);
      return [];
    }
  },

  // Delete all keys matching a pattern
  async delByPattern(pattern) {
    try {
      const keys = this.keys(pattern);
      if (keys.length > 0) {
        return cache.del(keys);
      }
      return 0;
    } catch (error) {
      console.error("Cache pattern delete error:", error);
      return 0;
    }
  }
};

module.exports = cacheUtils;
