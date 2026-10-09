"use client";

// Client-only hook that subscribes to the notification store.
// Kept in its own file (with "use client") so the rest of @/services remains
// RSC-safe.
//
// `getSnapshot` is cached by the raw localStorage string. The first
// read runs the normalizer (which migrates old / partial records),
// so subsequent reads return the same reference until the raw
// storage value changes.

import { useCallback, useSyncExternalStore } from "react";
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  normalizeNotification,
  SEED_NOTIFICATIONS,
  type Notification,
} from "./notificationService";
import { hasWindow } from "./storage";

const STORAGE_KEY = "loan-reminder:notifications:v2";
const CHANGE_EVENT = "notifications:change";

let cachedRaw: string | null = null;
let cachedList: Notification[] = SEED_NOTIFICATIONS;

function parseRaw(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function normalizeFeed(raw: unknown): Notification[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r, i) => normalizeNotification(r, i));
}

function readList(): Notification[] {
  if (!hasWindow()) return SEED_NOTIFICATIONS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedList;
  const next = normalizeFeed(parseRaw(raw));
  cachedRaw = raw;
  cachedList = next.length > 0 ? next : SEED_NOTIFICATIONS;
  return cachedList;
}

function subscribe(cb: () => void) {
  if (!hasWindow()) return () => {};
  const handler = () => {
    cachedRaw = null;
    cb();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useNotifications(): {
  notifications: Notification[];
  unread: number;
  ready: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => void;
} {
  const notifications = useSyncExternalStore(subscribe, readList, () => SEED_NOTIFICATIONS);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // `unread` is derived from the cached list. We recompute it from
  // the same reference each call so React never sees a "changed"
  // value unless the underlying list actually changes.
  const unread = useSyncExternalStore(
    subscribe,
    () => countUnread(readList()),
    () => 0,
  );
  const refresh = useCallback(() => {
    cachedRaw = null;
    if (hasWindow()) {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }
  }, []);
  return {
    notifications,
    unread,
    ready,
    markRead,
    markAllRead,
    deleteNotification,
    refresh,
  };
}

function countUnread(list: Notification[]): number {
  let n = 0;
  for (let i = 0; i < list.length; i++) if (list[i].unread) n++;
  return n;
}

// Keep the async getters re-exported for the few callers that need them.
export { getNotifications, getUnreadCount, markAllRead, markRead };
