import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";

const STORAGE_KEY = "finans_theme";

function getSystemIsDark() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  const [systemDark, setSystemDark] = useState(getSystemIsDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => setSystemDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemDark);
  const resolvedTheme = isDark ? "dark" : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const setThemeMode = useCallback((mode) => {
    const valid = mode === "light" || mode === "dark" || mode === "system"
      ? mode
      : "dark";
    setThemeModeState(valid);
    try {
      localStorage.setItem(STORAGE_KEY, valid);
    } catch {
      // ignora restrição de storage
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? "light" : "dark");
  }, [isDark, setThemeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      isDark,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, resolvedTheme, isDark, setThemeMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
