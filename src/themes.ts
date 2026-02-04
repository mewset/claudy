// src/themes.ts

export interface Theme {
  id: string;
  name: string;
  skinFilter: string;  // Full CSS filter string for body/legs/claws
  eyeFilter: string;   // Full CSS filter string for eyes
}

// Base skin color is #DA7B5C (orange-ish)
// Orc green requires ~90deg hue shift
// Winter blue requires ~160deg hue shift
// Eyes are black (#000000) - need invert trick for colors

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Default',
    skinFilter: 'none',
    eyeFilter: 'none',
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    skinFilter: 'hue-rotate(90deg) saturate(1.2) brightness(0.9)',
    // Red eyes from black: tested formula for #FF0000-ish
    eyeFilter: 'invert(20%) sepia(100%) saturate(7000%) hue-rotate(0deg) brightness(95%) contrast(115%)',
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    skinFilter: 'hue-rotate(160deg) saturate(0.8) brightness(1.3)',
    eyeFilter: 'none',  // Keep black eyes
  },
};

export function applyTheme(themeId: string): void {
  const theme = THEMES[themeId] || THEMES.default;
  const root = document.documentElement;

  root.style.setProperty('--skin-filter', theme.skinFilter);
  root.style.setProperty('--eye-filter', theme.eyeFilter);
}

export function getThemeIds(): string[] {
  return Object.keys(THEMES);
}
