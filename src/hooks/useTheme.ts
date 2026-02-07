import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

type Theme = 'light' | 'dark';

export function useTheme() {
  const preferences = useAuthStore(state => state.preferences);
  const updatePreferences = useAuthStore(state => state.updatePreferences);
  const status = useAuthStore(state => state.status);
  
  // Default to light if no preference
  const theme = useMemo<Theme>(() => {
    if (preferences?.theme === 'dark') return 'dark';
    if (preferences?.theme === 'light') return 'light';
    return 'light';
  }, [preferences?.theme]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    // Update store and backend
    updatePreferences({ theme: nextTheme });
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };
} 
