export class TtlCache {
  constructor(ttlMs = 60_000, maxEntries = 2_000) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.items = new Map();
    this.inFlight = new Map();
  }

  get(key) {
    const item = this.items.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= Date.now()) {
      this.items.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key, value) {
    if (this.items.size >= this.maxEntries) {
      const oldestKey = this.items.keys().next().value;
      if (oldestKey !== undefined) this.items.delete(oldestKey);
    }
    this.items.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
    return value;
  }

  async getOrLoad(key, loader) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const currentLoad = this.inFlight.get(key);
    if (currentLoad) return currentLoad;

    const loadPromise = Promise.resolve()
      .then(loader)
      .then((value) => {
        if (value !== undefined) this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, loadPromise);
    return loadPromise;
  }

  delete(key) {
    this.items.delete(key);
  }

  clear() {
    this.items.clear();
    this.inFlight.clear();
  }
}
