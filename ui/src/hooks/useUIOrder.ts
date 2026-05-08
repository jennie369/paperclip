/**
 * useUIOrder — Persist drag-and-drop order cross-browser via Supabase.
 *
 * Strategy (write-through cache):
 *   1. Read from localStorage immediately (no flicker on first render)
 *   2. Fetch from Supabase in background — overrides localStorage if different
 *   3. On save: write to localStorage sync + debounce write to Supabase async
 *
 * All drag-drop keys share the same Supabase column: profiles.preferences.ui_orders
 * which is a JSON object { [key]: string[] }.
 *
 * Usage:
 *   const [order, setOrder] = useUIOrder('pipeline.tabs', DEFAULT_TABS);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabase } from '@/gem/services/api/supabase';

// Debounce ms để tránh spam Supabase khi kéo thả nhanh
const DEBOUNCE_MS = 1200;

// In-memory cache để share giữa nhiều instance cùng key trong 1 tab
const memCache = new Map<string, string[]>();

// Pending debounce timers
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

// All dirty keys cần flush lên Supabase
const dirtyOrders = new Map<string, string[]>();

async function getUserId(): Promise<string | null> {
  try {
    const sb = getSupabase();
    const { data } = await sb.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchRemoteOrders(): Promise<Record<string, string[]> | null> {
  try {
    const userId = await getUserId();
    if (!userId) return null;
    const sb = getSupabase();
    const { data } = await sb
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();
    const prefs = (data as Record<string, unknown> | null)?.preferences as Record<string, unknown> | null;
    const orders = prefs?.ui_orders as Record<string, string[]> | undefined;
    return orders ?? null;
  } catch {
    return null;
  }
}

async function saveRemoteOrders(updates: Record<string, string[]>): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const sb = getSupabase();
    // Read current preferences first to avoid overwriting other keys
    const { data: profileData } = await sb
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();
    const currentPrefs = (profileData as Record<string, unknown> | null)?.preferences as Record<string, unknown> ?? {};
    const currentOrders = (currentPrefs.ui_orders as Record<string, string[]>) ?? {};
    const merged = { ...currentOrders, ...updates };
    await sb.from('profiles').update({
      preferences: { ...currentPrefs, ui_orders: merged },
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
  } catch (e) {
    console.warn('[useUIOrder] Failed to sync to Supabase:', e);
  }
}

// Một promise chung để tránh concurrent fetchRemoteOrders
let remoteBootstrapPromise: Promise<Record<string, string[]> | null> | null = null;
let remoteOrders: Record<string, string[]> | null = null;
const remoteListeners = new Set<() => void>();

function notifyListeners() {
  remoteListeners.forEach(fn => fn());
}

function ensureBootstrap() {
  if (remoteBootstrapPromise) return;
  remoteBootstrapPromise = fetchRemoteOrders().then(orders => {
    remoteOrders = orders;
    notifyListeners();
    return orders;
  });
}

/**
 * Hook chính. key phải là unique string cho từng drag-drop list.
 * defaultOrder: thứ tự mặc định khi chưa có dữ liệu.
 */
export function useUIOrder<T extends string>(
  key: string,
  defaultOrder: T[],
): [T[], (newOrder: T[]) => void] {
  // Đọc từ localStorage ngay (instant, không flicker)
  const [order, setOrderState] = useState<T[]>(() => {
    if (memCache.has(key)) return memCache.get(key) as T[];
    try {
      const raw = localStorage.getItem(`ui_order:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as T[];
        // Merge: giữ thứ tự saved, append bất kỳ item mới từ default
        const valid = defaultOrder.filter(d => parsed.includes(d));
        const extra = defaultOrder.filter(d => !parsed.includes(d));
        const merged = [...valid.sort((a, b) => parsed.indexOf(a) - parsed.indexOf(b)), ...extra];
        memCache.set(key, merged);
        return merged;
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  // Sync từ Supabase sau khi mount
  const bootstrapped = useRef(false);
  useEffect(() => {
    ensureBootstrap();

    const apply = () => {
      if (bootstrapped.current) return;
      if (!remoteOrders) return;
      const remote = remoteOrders[key] as T[] | undefined;
      if (!remote || remote.length === 0) return;

      // Merge remote với defaultOrder (giống localStorage merge)
      const valid = defaultOrder.filter(d => remote.includes(d));
      const extra = defaultOrder.filter(d => !remote.includes(d));
      const merged = [...valid.sort((a, b) => remote.indexOf(a) - remote.indexOf(b)), ...extra];

      // Chỉ update nếu khác với state hiện tại
      const current = memCache.get(key) ?? defaultOrder;
      if (JSON.stringify(merged) !== JSON.stringify(current)) {
        memCache.set(key, merged);
        localStorage.setItem(`ui_order:${key}`, JSON.stringify(merged));
        setOrderState(merged);
      }
      bootstrapped.current = true;
    };

    // Nếu remote đã load rồi thì apply ngay
    if (remoteOrders !== null) {
      apply();
    } else {
      // Đăng ký listener để apply khi load xong
      remoteListeners.add(apply);
      return () => { remoteListeners.delete(apply); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setOrder = useCallback((newOrder: T[]) => {
    // 1. Update state ngay lập tức
    setOrderState(newOrder);
    memCache.set(key, newOrder);

    // 2. Write localStorage đồng bộ
    try {
      localStorage.setItem(`ui_order:${key}`, JSON.stringify(newOrder));
    } catch { /* ignore */ }

    // 3. Debounce write lên Supabase
    dirtyOrders.set(key, newOrder);
    const existing = pendingTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      const batch: Record<string, string[]> = {};
      dirtyOrders.forEach((v, k) => { batch[k] = v; });
      dirtyOrders.clear();
      pendingTimers.delete(key);
      saveRemoteOrders(batch);
    }, DEBOUNCE_MS);
    pendingTimers.set(key, timer);
  }, [key]);

  return [order, setOrder];
}
