import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border text-muted-foreground ${className}`}>
      <button
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'light' ? 'bg-card text-foreground shadow-sm font-semibold' : 'hover:text-foreground'
        }`}
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'dark' ? 'bg-card text-foreground shadow-sm font-semibold' : 'hover:text-foreground'
        }`}
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        aria-label="System preference"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'system' ? 'bg-card text-foreground shadow-sm font-semibold' : 'hover:text-foreground'
        }`}
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}

