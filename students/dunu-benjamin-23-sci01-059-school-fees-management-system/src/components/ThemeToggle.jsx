import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/format'

export function ThemeToggle({ className }) {
  const { theme, setTheme, isDark } = useTheme()
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'system' ? Monitor : isDark ? Moon : Sun
  return (
    <button
      onClick={() => setTheme(next)}
      className={cn('flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-fg', className)}
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
    >
      <Icon className="size-5" />
    </button>
  )
}
