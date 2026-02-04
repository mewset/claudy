// src/themes.ts

export interface Theme {
  id: string;
  name: string;
  skinColor: string;
  eyeColor: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Default',
    skinColor: '#DA7B5C',
    eyeColor: '#000000',
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    skinColor: '#5A7F4B',
    eyeColor: '#8B0000',
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    skinColor: '#ADD9E6',
    eyeColor: '#000000',
  },
};

export function applyTheme(themeId: string): void {
  const theme = THEMES[themeId] || THEMES.default;
  document.documentElement.style.setProperty('--skin-color', theme.skinColor);
  document.documentElement.style.setProperty('--eye-color', theme.eyeColor);
}

export function getThemeIds(): string[] {
  return Object.keys(THEMES);
}
