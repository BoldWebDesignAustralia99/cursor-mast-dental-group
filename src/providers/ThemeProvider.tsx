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

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useAuthProfile()
  const updateTheme = useUpdateThemePreference()
  const [override, setOverride] = useState<ThemePreference | null>(null)

  const preference = override ?? profile?.theme_preference ?? 'system'

  const value = useMemo(
    () => ({
      preference,
      setPreference: (next: ThemePreference) => {
        setOverride(next)
        if (profile) {
          updateTheme.mutate(next)
        }
      },
      isLoading,
    }),
    [preference, profile, updateTheme, isLoading],
  )

  return (
    <ThemeContext.Provider value={value}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        forcedTheme={
          preference === 'system' ? undefined : preference
        }
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
