import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center gap-2 p-2 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isDark
          ? 'text-amber-300 hover:text-amber-200 hover:bg-slate-800/80 focus-visible:ring-amber-400'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-900'
      } ${className}`}
    >
      <span className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 hover:-rotate-12" />
        )}
      </span>
      {showLabel && (
        <span className="text-xs font-medium tracking-wider uppercase">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
