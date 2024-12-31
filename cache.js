// cache.js
const { LRUCache } = require('lru-cache');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class BuildCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || '.cache';
    this.memoryCache = new LRUCache({
      max: options.maxItems || 500,
      ttl: options.ttl || 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true
    });

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);
    
    // Load persistent cache
    this.loadCache();
  }

  // Generate cache key from content or file
  async generateKey(input, type) {
    if (typeof input === 'string' && await fs.pathExists(input)) {
      // For files, use path and mtime
      const stats = await fs.stat(input);
      return crypto
        .createHash('md5')
        .update(`${input}:${stats.mtimeMs}:${type}`)
        .digest('hex');
    } else {
      // For content, hash the content itself
      return crypto
        .createHash('md5')
        .update(`${input}:${type}`)
        .digest('hex');
    }
  }

  // Get item from cache
  async get(key, options = {}) {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      return memoryItem;
    }

    // Check disk cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    if (await fs.pathExists(cachePath)) {
      try {
        const item = await fs.readJson(cachePath);
        
        // Validate cache if validator provided
        if (options.validator && !(await options.validator(item))) {
          await this.delete(key);
          return null;
        }

        // Add to memory cache
        this.memoryCache.set(key, item);
        return item;
      } catch (error) {
        console.warn(`Cache read error for ${key}:`, error);
        return null;
      }
    }

    return null;
  }

  // Set item in cache
  async set(key, value) {
    // Save to memory cache
    this.memoryCache.set(key, value);

    // Save to disk cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    try {
      await fs.writeJson(cachePath, value);
    } catch (error) {
      console.warn(`Cache write error for ${key}:`, error);
    }
  }

  // Delete item from cache
  async delete(key) {
    this.memoryCache.delete(key);
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }
  }

  // Clear entire cache
  async clear() {
    this.memoryCache.clear();
    await fs.emptyDir(this.cacheDir);
  }

  // Load cache from disk into memory
  async loadCache() {
    const files = await fs.readdir(this.cacheDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const key = file.replace('.json', '');
        try {
          const value = await fs.readJson(path.join(this.cacheDir, file));
          this.memoryCache.set(key, value);
        } catch (error) {
          console.warn(`Failed to load cache item ${key}:`, error);
        }
      }
    }
  }

  // Get cache statistics
  async getStats() {
    const files = await fs.readdir(this.cacheDir);
    let size = 0;
    
    for (const file of files) {
      const stats = await fs.stat(path.join(this.cacheDir, file));
      size += stats.size;
    }

    return {
      memoryItems: this.memoryCache.size,
      diskItems: files.length,
      sizeBytes: size,
      sizeMB: (size / (1024 * 1024)).toFixed(2)
    };
  }
}

// Cache validators
const validators = {
  // Validate image cache based on file existence and timestamp
  imageCache: async (item) => {
    if (!item.original || !item.versions) return false;
    
    try {
      const stats = await fs.stat(item.original);
      return stats.mtimeMs === item.timestamp;
    } catch {
      return false;
    }
  },

  // Validate CSS cache based on input files
  cssCache: async (item) => {
    if (!item.inputs || !item.output) return false;

    try {
      // Check if all input files exist and haven't changed
      for (const [file, timestamp] of Object.entries(item.inputs)) {
        const stats = await fs.stat(file);
        if (stats.mtimeMs !== timestamp) return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // Validate JS cache based on input files and dependencies
  jsCache: async (item) => {
    if (!item.inputs || !item.dependencies || !item.output) return false;

    try {
      // Check input files
      for (const [file, timestamp] of Object.entries(item.inputs)) {
        const stats = await fs.stat(file);
        if (stats.mtimeMs !== timestamp) return false;
      }

      // Check package.json for dependency changes
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkgStats = await fs.stat(pkgPath);
      if (pkgStats.mtimeMs !== item.packageTime) return false;

      return true;
    } catch {
      return false;
    }
  }
};

// Usage example
async function createCacheExample() {
  // Initialize cache
  const cache = new BuildCache({
    cacheDir: '.build-cache',
    maxItems: 1000,
    ttl: 1000 * 60 * 60 * 24 // 24 hours
  });

  // Cache image processing
  async function processImageWithCache(filePath) {
    const key = await cache.generateKey(filePath, 'image');
    
    let result = await cache.get(key, {
      validator: validators.imageCache
    });

    if (!result) {
      // Process image
      result = {
        original: filePath,
        timestamp: (await fs.stat(filePath)).mtimeMs,
        versions: [] // Add processed versions here
      };
      
      await cache.set(key, result);
    }

    return result;
  }

  // Cache CSS processing
  async function processCssWithCache(files) {
    const inputs = {};
    for (const file of files) {
      inputs[file] = (await fs.stat(file)).mtimeMs;
    }

    const key = await cache.generateKey(JSON.stringify(inputs), 'css');
    
    let result = await cache.get(key, {
      validator: validators.cssCache
    });

    if (!result) {
      // Process CSS
      result = {
        inputs,
        output: null // Add processed CSS here
      };
      
      await cache.set(key, result);
    }

    return result;
  }

  return {
    cache,
    processImageWithCache,
    processCssWithCache
  };
}

module.exports = {
  BuildCache,
  validators,
  createCacheExample
};