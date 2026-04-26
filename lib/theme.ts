export type ThemeKey = 'karanlik' | 'muzehher' | 'parsomen' | 'atlas' | 'sage' | 'mehtap';

export interface ThemeMeta {
  key: ThemeKey;
  name: string;
  tagline: string;
  description: string;
  swatches: string[]; // 3-4 renk preview için
  accent: string;
  ink: string;
  bg: string;
  fontFamily: string; // preview kart yazı tipi
  mood: string;
}

export const THEMES: ThemeMeta[] = [
  {
    key: 'karanlik',
    name: 'Karanlık',
    tagline: 'Mevcut tema',
    description: 'Saf siyah üzerinde animasyonlu mesh gradyan. Cam yüzeyler, beyaz tipografi.',
    swatches: ['#000000', '#1a1a1a', '#ffffff', '#60a5fa'],
    accent: '#60a5fa',
    ink: '#ffffff',
    bg: '#000000',
    fontFamily: '"Inter", "Merriweather", serif',
    mood: 'Modern · Mesafeli · Geceleyin',
  },
  {
    key: 'muzehher',
    name: 'Müzehher',
    tagline: 'Klasik kütüphane',
    description: 'Eski özel kütüphane. Deri ciltler, ahşap raf, altın varak, mum ışığı.',
    swatches: ['#ece1cd', '#6b1f24', '#a87a3a', '#2a1d10'],
    accent: '#6b1f24',
    ink: '#2a1d10',
    bg: '#ece1cd',
    fontFamily: '"Cormorant Garamond", "EB Garamond", serif',
    mood: 'Sıcak · Mahremiyetli · Ağır',
  },
  {
    key: 'parsomen',
    name: 'Parşömen',
    tagline: 'Eski yayınevi',
    description: '1950\'ler İstanbul yayınevi. Kurşun mürekkep, ofset baskı, daktilo.',
    swatches: ['#f1ebe1', '#1c1a16', '#a13b2a', '#8a4a2a'],
    accent: '#a13b2a',
    ink: '#1c1a16',
    bg: '#f1ebe1',
    fontFamily: '"Playfair Display", "EB Garamond", serif',
    mood: 'Editoryal · Sade · Okunaklı',
  },
  {
    key: 'atlas',
    name: 'Atlas',
    tagline: 'Modern editorial',
    description: 'Çağdaş sanat dergisi. Devasa beyaz boşluk, asimetrik grid, oversize tipografi.',
    swatches: ['#f7f5f0', '#0e0e0c', '#c2410c', '#1e3a2f'],
    accent: '#c2410c',
    ink: '#0e0e0c',
    bg: '#f7f5f0',
    fontFamily: '"Fraunces", "Inter", sans-serif',
    mood: 'Galeri · Boşluklu · Küratoryal',
  },
  {
    key: 'sage',
    name: 'Sage',
    tagline: 'Doğal & yumuşak',
    description: 'Soğuk bir sabah, sage yeşili çay fincanı, krem keten örtü, taze kâğıt.',
    swatches: ['#f0ebde', '#6b7d63', '#b87a52', '#c98c8c'],
    accent: '#6b7d63',
    ink: '#2c2a22',
    bg: '#f0ebde',
    fontFamily: '"Fraunces", "IBM Plex Sans", serif',
    mood: 'Huzurlu · Organik · Yavaş',
  },
  {
    key: 'mehtap',
    name: 'Mehtap',
    tagline: 'Mistik & şiirsel',
    description: 'Ay ışığı altında okuma. Lavanta-nilüfer zemin, lacivert mürekkep, gümüş + altın.',
    swatches: ['#eaeaf3', '#1a2347', '#9a7a30', '#a4607a'],
    accent: '#1a2347',
    ink: '#1a2347',
    bg: '#eaeaf3',
    fontFamily: '"Cormorant Garamond", serif',
    mood: 'Şiirsel · Sakin · Romantik',
  },
];

export const DEFAULT_THEME: ThemeKey = 'karanlik';
export const THEME_STORAGE_KEY = 'kitaplik:theme';

export const getTheme = (key: string | null | undefined): ThemeKey => {
  if (key && THEMES.some((theme) => theme.key === key)) {
    return key as ThemeKey;
  }
  return DEFAULT_THEME;
};

export const getThemeMeta = (key: ThemeKey): ThemeMeta => {
  return THEMES.find((theme) => theme.key === key) ?? THEMES[0];
};
