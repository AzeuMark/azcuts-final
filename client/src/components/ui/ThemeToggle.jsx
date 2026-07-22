import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import cn from '../../utils/cn';

export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-ring',
        className
      )}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
