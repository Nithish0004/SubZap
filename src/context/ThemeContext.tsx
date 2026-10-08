import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isExplicitPreference: boolean;
  resetToSystemPreference: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'subzap_theme_preference_v1';

// Detect operating system color scheme preference
function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Fallback default
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExplicitPreference, setIsExplicitPreference] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === 'light' || stored === 'dark';
    } catch {
      return false;
    }
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // fallback to system preference
    }
    return getSystemTheme();
  });

  // Apply theme class to documentElement and sync storage when explicitly chosen
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    if (isExplicitPreference) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // ignore
      }
    }
  }, [theme, isExplicitPreference]);

  // Listen for operating system theme changes when no explicit user override is set
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only react to OS changes if user hasn't explicitly chosen a mode
      if (!isExplicitPreference) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleSystemThemeChange);
      return () => (mediaQuery as any).removeListener(handleSystemThemeChange);
    }
  }, [isExplicitPreference]);

  const toggleTheme = () => {
    setIsExplicitPreference(true);
    setThemeState((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch {
        // ignore
      }
      return nextTheme;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setIsExplicitPreference(true);
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // ignore
    }
  };

  const resetToSystemPreference = () => {
    try {
      localStorage.removeItem(THEME_KEY);
    } catch {
      // ignore
    }
    setIsExplicitPreference(false);
    setThemeState(getSystemTheme());
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        toggleTheme, 
        setTheme, 
        isExplicitPreference, 
        resetToSystemPreference 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
