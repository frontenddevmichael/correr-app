"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "correr.web.theme";
const EVENT = "correr:theme";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

/**
 * Theme switch. The initial class is set by an inline script before paint, so
 * this only mirrors the DOM — it never flashes and never sets state in an
 * effect.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={theme === "dark"}
      className="grid h-11 w-11 place-items-center rounded-full text-secondary transition-colors duration-200 hover:bg-sunken hover:text-ink"
    >
      {theme === "dark" ? <MoonGlyph /> : <SunGlyph />}
    </button>
  );
}

function SunGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4.1" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M10 2.2v1.6M10 16.2v1.6M17.8 10h-1.6M3.8 10H2.2M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1M15.5 15.5l-1.1-1.1M5.6 5.6 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.4 12.3A6.9 6.9 0 0 1 7.7 3.6a6.9 6.9 0 1 0 8.7 8.7Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
