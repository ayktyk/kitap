import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME, getTheme, THEME_STORAGE_KEY, ThemeKey } from './theme';

interface ThemeContextValue {
  theme: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStoredTheme = (): ThemeKey => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    return getTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
};

const applyTheme = (key: ThemeKey) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = key;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeKey>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeState(key);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, key);
    } catch {
      /* yoksay — incognito veya storage kapali */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme ThemeProvider icinde kullanilmali.');
  }
  return ctx;
};
