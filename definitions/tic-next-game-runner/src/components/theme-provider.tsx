"use client"

import type { ThemeProviderProps } from "next-themes"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import * as React from "react"

export function ThemeProvider({
  children,
  ...props
}: Readonly<ThemeProviderProps>): React.JSX.Element {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

