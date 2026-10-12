import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  variant?: 'inline' | 'floating';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  variant = 'inline',
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();
  
  let isPrintsPage = false;
  try {
    const location = useLocation();
    isPrintsPage = location.pathname.startsWith('/prints');
  } catch (e) {
    // if rendered outside Router context
    if (typeof window !== 'undefined') {
      isPrintsPage = window.location.pathname.startsWith('/prints');
    }
  }

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`fixed z-50 p-3 rounded-full backdrop-blur-md shadow-xl transition-all duration-300 active:scale-90 border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          isPrintsPage ? 'bottom-5 left-5 sm:bottom-6 sm:left-6' : 'bottom-5 right-5 sm:bottom-6 sm:right-6'
        } ${
          isDark
            ? 'bg-slate-900/90 text-amber-400 border-slate-700/80 hover:bg-slate-800 hover:text-amber-300 hover:border-slate-600 shadow-black/50 focus-visible:ring-amber-400'
            : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white hover:text-slate-950 hover:border-slate-300 shadow-slate-400/25 focus-visible:ring-slate-900'
        } ${className}`}
      >
        <span className="sr-only">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        <div className="relative w-5 h-5 flex items-center justify-center">
          <Sun className={`w-5 h-5 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50 absolute'}`} />
          <Moon className={`w-5 h-5 transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-50 absolute' : 'opacity-100 rotate-0 scale-100'}`} />
        </div>
      </button>
    );
  }

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
