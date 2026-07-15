import React, { createContext, useContext, useState, useEffect } from "react";
import { getOutbox, deleteOutboxItem } from "../utils/idb";
import type { OutboxItem } from "../utils/idb";

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  syncData: () => Promise<void>;
  enqueueAction: (url: string, method: "POST" | "PUT" | "DELETE", body: any) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Update pending queue count
  const updatePendingCount = async () => {
    try {
      const list = await getOutbox();
      setPendingCount(list.length);
    } catch (e) {
      console.error("Error reading outbox count:", e);
    }
  };

  useEffect(() => {
    updatePendingCount();

    const handleOnline = () => {
      console.log("[SmartSplit Offline] Network restored. Syncing database...");
      setIsOnline(true);
      syncData();
    };

    const handleOffline = () => {
      console.log("[SmartSplit Offline] Connection lost. Switching to offline caching.");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncData = async () => {
    if (!navigator.onLine) return;

    try {
      const outbox = await getOutbox();
      if (outbox.length === 0) return;

      console.log(`[SmartSplit Offline] Syncing ${outbox.length} pending operations...`);

      for (const item of outbox) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: {
              ...item.headers,
              "Content-Type": "application/json",
            },
            body: item.body ? JSON.stringify(item.body) : undefined,
          });

          if (response.ok || response.status === 400 || response.status === 404) {
            // Remove from outbox if succeeded or is an un-resolvable bad request/not found client error
            if (item.id) {
              await deleteOutboxItem(item.id);
            }
          } else {
            // Server error or network error, stop sync chain to maintain chronological order
            console.warn("[SmartSplit Offline] Sync item failed, stopping sync chain:", item.url);
            break;
          }
        } catch (err) {
          console.error("[SmartSplit Offline] Failed syncing item:", err);
          break;
        }
      }

      await updatePendingCount();
      // Reload page or trigger global refresh if sync succeeded
      console.log("[SmartSplit Offline] Synchronization process complete.");
    } catch (error) {
      console.error("Sync data error:", error);
    }
  };

  const enqueueAction = async (url: string, method: "POST" | "PUT" | "DELETE", body: any) => {
    const token = localStorage.getItem("smartsplit_token");
    const item: OutboxItem = {
      url,
      method,
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timestamp: Date.now(),
    };

    // Save action to IDB
    const { queueOfflineAction } = await import("../utils/idb");
    await queueOfflineAction(item);
    await updatePendingCount();
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncData, enqueueAction }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};
