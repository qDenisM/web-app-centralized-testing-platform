"use client";

/**
 * Tiny SWR-like client cache: Map + subscribers + in-flight dedupe.
 * Avoids re-fetching the same BFF endpoints from shell + page trees.
 */

type CacheRecord<T> = {
  data: T | undefined;
  error: string | null;
  updatedAt: number;
  inflight: Promise<T> | null;
};

type Listener = () => void;

const records = new Map<string, CacheRecord<unknown>>();
const listeners = new Map<string, Set<Listener>>();

function getOrCreateRecord<T>(key: string): CacheRecord<T> {
  let record = records.get(key) as CacheRecord<T> | undefined;
  if (!record) {
    record = { data: undefined, error: null, updatedAt: 0, inflight: null };
    records.set(key, record as CacheRecord<unknown>);
  }
  return record;
}

function notify(key: string) {
  const set = listeners.get(key);
  if (!set) return;
  for (const listener of set) listener();
}

export function subscribeCache(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(key);
  };
}

export function peekCache<T>(key: string): T | undefined {
  return getOrCreateRecord<T>(key).data;
}

export function getCacheMeta(key: string): {
  data: unknown;
  error: string | null;
  updatedAt: number;
  hasData: boolean;
} {
  const record = getOrCreateRecord(key);
  return {
    data: record.data,
    error: record.error,
    updatedAt: record.updatedAt,
    hasData: record.data !== undefined,
  };
}

export function setCacheData<T>(key: string, data: T) {
  const record = getOrCreateRecord<T>(key);
  record.data = data;
  record.error = null;
  record.updatedAt = Date.now();
  notify(key);
}

export function setCacheError(key: string, error: string) {
  const record = getOrCreateRecord(key);
  record.error = error;
  record.updatedAt = Date.now();
  notify(key);
}

export function invalidateCache(keys: string | string[]) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const record = records.get(key);
    if (!record) continue;
    record.updatedAt = 0;
    record.inflight = null;
    notify(key);
  }
}

export function clearCache(keys?: string | string[]) {
  if (!keys) {
    records.clear();
    for (const key of listeners.keys()) notify(key);
    return;
  }
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    records.delete(key);
    notify(key);
  }
}

type CachedFetchOptions = {
  /** Soft TTL: reuse data younger than this without network (default 30s). */
  ttlMs?: number;
  /** Bypass TTL and always refetch (still dedupes concurrent callers). */
  force?: boolean;
};

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CachedFetchOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? 30_000;
  const record = getOrCreateRecord<T>(key);
  const age = Date.now() - record.updatedAt;
  const fresh = record.data !== undefined && age < ttlMs;

  if (!options.force && fresh) {
    return record.data as T;
  }

  if (record.inflight) {
    return record.inflight;
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      record.data = data;
      record.error = null;
      record.updatedAt = Date.now();
      notify(key);
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось загрузить данные";
      record.error = message;
      notify(key);
      throw err;
    } finally {
      record.inflight = null;
    }
  })();

  record.inflight = promise;
  return promise;
}
