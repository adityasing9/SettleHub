import { openDB } from "idb";
import type { IDBPDatabase } from "idb";

const DATABASE_NAME = "smartsplit_db";
const DATABASE_VERSION = 1;

export interface OutboxItem {
  id?: number;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  body: any;
  headers: any;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        // Cache stores
        if (!db.objectStoreNames.contains("groups")) {
          db.createObjectStore("groups", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          db.createObjectStore("transactions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("profile")) {
          db.createObjectStore("profile", { keyPath: "id" });
        }
        // Outbox queue store for offline writes
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheGroup(groupId: string, data: any) {
  const db = await getDB();
  await db.put("groups", { id: groupId, data, timestamp: Date.now() });
}

export async function getCachedGroup(groupId: string) {
  const db = await getDB();
  const entry = await db.get("groups", groupId);
  return entry ? entry.data : null;
}

export async function cacheTransactions(groupId: string, data: any) {
  const db = await getDB();
  await db.put("transactions", { id: groupId, data, timestamp: Date.now() });
}

export async function getCachedTransactions(groupId: string) {
  const db = await getDB();
  const entry = await db.get("transactions", groupId);
  return entry ? entry.data : null;
}

export async function queueOfflineAction(action: OutboxItem) {
  const db = await getDB();
  await db.add("outbox", action);
  console.log("[IndexedDB] Queued offline action:", action.url);
}

export async function getOutbox(): Promise<OutboxItem[]> {
  const db = await getDB();
  return db.getAll("outbox");
}

export async function deleteOutboxItem(id: number) {
  const db = await getDB();
  await db.delete("outbox", id);
  console.log("[IndexedDB] Deleted outbox item:", id);
}

export async function clearOutbox() {
  const db = await getDB();
  const tx = db.transaction("outbox", "readwrite");
  await tx.objectStore("outbox").clear();
  await tx.done;
}
