'use client';

// ============================================================================
// useTheme — Dark/Light/System Theme Toggle Hook
// GEM Content Control Center
//
// Manages theme preference with localStorage persistence
// and applies the appropriate class to document.documentElement.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = 'dark' | 'light' | 'system';

export interface UseThemeReturn {
  /** Current theme setting */
  theme: ThemeMode;
  /** The resolved theme (accounting for system preference) */
  resolvedTheme: 'dark' | 'light';
  /** Set theme to a specific mode */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between dark and light */
  toggle: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'gem-cc-theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSystemPreference(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

function applyTheme(resolved: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

function loadPersistedTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'dark';
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Theme toggle hook with localStorage persistence.
 *
 * @example
 * ```tsx
 * const { theme, resolvedTheme, toggle, setTheme } = useTheme();
 * ```
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeMode>(loadPersistedTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() =>
    resolveTheme(loadPersistedTheme()),
  );

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const resolved = resolveTheme('system');
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = resolveTheme(prev) === 'dark' ? 'light' : 'dark';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggle,
  };
}
