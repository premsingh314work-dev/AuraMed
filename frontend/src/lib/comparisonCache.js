import { openDB } from "idb";

const DB_NAME = "medical-report-cache";
const STORE_NAME = "comparisons";
const DB_VERSION = 1;
const CACHE_TTL = 24 * 60 * 60 * 1000;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, {
        keyPath: "cacheKey",
      });
    }
  },
});

const createCacheKey = (userId, reportIds) =>
  `${userId}:${[...reportIds].sort().join(":")}`;

export async function getCachedComparison(userId, reportIds) {
  if (!userId || reportIds.length < 2) return null;

  const db = await dbPromise;
  const key = createCacheKey(userId, reportIds);
  const entry = await db.get(STORE_NAME, key);

  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL) {
    await db.delete(STORE_NAME, key);
    return null;
  }

  return entry;
}

export async function saveCachedComparison(
  userId,
  reportIds,
  reports,
  summary,
) {
  if (!userId || reportIds.length < 2 || !summary) return;

  const db = await dbPromise;

  await db.put(STORE_NAME, {
    cacheKey: createCacheKey(userId, reportIds),
    reports,
    summary,
    cachedAt: Date.now(),
  });
}

export async function clearComparisonCache(userId) {
  if (!userId) return;

  const db = await dbPromise;
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let cursor = await store.openCursor();

  while (cursor) {
    if (cursor.value.cacheKey.startsWith(`${userId}:`)) {
      await cursor.delete();
    }

    cursor = await cursor.continue();
  }

  await tx.done;
}
