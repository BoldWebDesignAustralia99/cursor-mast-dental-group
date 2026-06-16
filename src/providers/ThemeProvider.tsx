import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useAuthProfile, useUpdateThemePreference } from '@/hooks/useAuth'
import type { ThemePreference } from '@/lib/constants'

export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  isDark: boolean
  setPreference: (preference: ThemePreference) => void
  setDarkMode: (enabled: boolean) => void
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function normalizeTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useAuthProfile()
  const updateTheme = useUpdateThemePreference()
  const [override, setOverride] = useState<ThemePreference | null>(null)

  const preference = override ?? profile?.theme_preference ?? 'dark'
  const resolvedTheme = normalizeTheme(preference)

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      isDark: resolvedTheme === 'dark',
      setPreference: (next: ThemePreference) => {
        setOverride(next)
        if (profile) {
          updateTheme.mutate(next)
        }
      },
      setDarkMode: (enabled: boolean) => {
        const next = enabled ? 'dark' : 'light'
        setOverride(next)
        if (profile) {
          updateTheme.mutate(next)
        }
      },
      isLoading,
    }),
    [preference, resolvedTheme, profile, updateTheme, isLoading],
  )

  return (
    <ThemeContext.Provider value={value}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        forcedTheme={resolvedTheme}
      >
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  )
}

export function useThemePreference() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemePreference must be used within ThemeProvider')
  }
  return context
}
