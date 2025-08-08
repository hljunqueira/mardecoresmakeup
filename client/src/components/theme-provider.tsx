import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeProviderContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("mardecores-theme");
    if (stored && (stored === "light" || stored === "dark")) {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("mardecores-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const value = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
