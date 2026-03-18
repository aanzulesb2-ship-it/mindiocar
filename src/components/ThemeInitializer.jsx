"use client";

import { useEffect } from "react";

const DEFAULT_THEME = {
  id: "caterpillar",
  accent: "#ffd60a",
  accentStrong: "#ffb800",
  bg: "#f5f5f4",
  mode: "light",
};

function readTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;

  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("app_theme_v1_"));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.accent) {
        return {
          ...DEFAULT_THEME,
          ...parsed,
          mode: parsed?.mode === "dark" ? "dark" : "light",
        };
      }
    }
  } catch {}

  return DEFAULT_THEME;
}

export function applyAppTheme(theme) {
  if (typeof document === "undefined") return;

  const selected = theme || DEFAULT_THEME;
  const root = document.documentElement;
  const mode = selected.mode === "dark" ? "dark" : "light";

  root.dataset.colorMode = mode;
  root.style.setProperty("--app-accent", selected.accent || DEFAULT_THEME.accent);
  root.style.setProperty("--app-accent-strong", selected.accentStrong || DEFAULT_THEME.accentStrong);
  root.style.setProperty("--app-bg-light", selected.bg || DEFAULT_THEME.bg);
}

export default function ThemeInitializer() {
  useEffect(() => {
    applyAppTheme(readTheme());
  }, []);

  return null;
}
