export type ThemeColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';

export interface ThemePalette {
  name: string;
  label: string;
  light: { primary: string; primaryHover: string; accent: string; bg: string; card: string; border: string; text: string; textMuted: string };
  dark: { primary: string; primaryHover: string; accent: string; bg: string; card: string; border: string; text: string; textMuted: string };
}

export const PALETTES: Record<ThemeColor, ThemePalette> = {
  indigo: {
    name: 'indigo', label: 'Индиго',
    light: { primary: '#4F46E5', primaryHover: '#4338CA', accent: '#6366F1', bg: '#F9FAFB', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280' },
    dark:  { primary: '#6366F1', primaryHover: '#818CF8', accent: '#4F46E5', bg: '#030712', card: '#111827', border: '#1F2937', text: '#F9FAFB', textMuted: '#9CA3AF' },
  },
  emerald: {
    name: 'emerald', label: 'Изумруд',
    light: { primary: '#059669', primaryHover: '#047857', accent: '#10B981', bg: '#F9FAFB', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280' },
    dark:  { primary: '#10B981', primaryHover: '#34D399', accent: '#059669', bg: '#022C22', card: '#064E3B', border: '#065F46', text: '#ECFDF5', textMuted: '#6EE7B7' },
  },
  amber: {
    name: 'amber', label: 'Янтарь',
    light: { primary: '#D97706', primaryHover: '#B45309', accent: '#F59E0B', bg: '#FFFBEB', card: '#FFFFFF', border: '#FDE68A', text: '#111827', textMuted: '#92400E' },
    dark:  { primary: '#F59E0B', primaryHover: '#FBBF24', accent: '#D97706', bg: '#120E00', card: '#1C1400', border: '#78350F', text: '#FEF3C7', textMuted: '#FCD34D' },
  },
  rose: {
    name: 'rose', label: 'Роза',
    light: { primary: '#E11D48', primaryHover: '#BE123C', accent: '#F43F5E', bg: '#FFF1F2', card: '#FFFFFF', border: '#FECDD3', text: '#111827', textMuted: '#9F1239' },
    dark:  { primary: '#F43F5E', primaryHover: '#FB7185', accent: '#E11D48', bg: '#120003', card: '#1F0006', border: '#4C0519', text: '#FFF1F2', textMuted: '#FDA4AF' },
  },
  violet: {
    name: 'violet', label: 'Фиолет',
    light: { primary: '#7C3AED', primaryHover: '#6D28D9', accent: '#8B5CF6', bg: '#FAF5FF', card: '#FFFFFF', border: '#DDD6FE', text: '#111827', textMuted: '#6D28D9' },
    dark:  { primary: '#8B5CF6', primaryHover: '#A78BFA', accent: '#7C3AED', bg: '#0A0020', card: '#1A0040', border: '#4C1D95', text: '#F5F3FF', textMuted: '#C4B5FD' },
  },
};

export interface ThemeState {
  color: ThemeColor;
  isDark: boolean;
  palette: ThemePalette;
  colors: ThemePalette['light'] | ThemePalette['dark'];
}

export function getThemeState(color: ThemeColor, isDark: boolean): ThemeState {
  const palette = PALETTES[color];
  return { color, isDark, palette, colors: isDark ? palette.dark : palette.light };
}

const STORAGE_KEY = 'gecko_theme';

export function loadTheme(): ThemeState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { color, isDark } = JSON.parse(saved);
      if (PALETTES[color as ThemeColor]) return getThemeState(color as ThemeColor, isDark);
    }
  } catch {}
  return getThemeState('indigo', true);
}

export function saveTheme(color: ThemeColor, isDark: boolean) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ color, isDark }));
}

export function applyThemeToDOM(state: ThemeState) {
  const root = document.documentElement;
  const c = state.colors;
  const isDark = state.isDark;

  root.style.setProperty('--gecko-primary', c.primary);
  root.style.setProperty('--gecko-primary-hover', c.primaryHover);
  root.style.setProperty('--gecko-accent', c.accent);
  root.style.setProperty('--gecko-bg', c.bg);
  root.style.setProperty('--gecko-card', c.card);
  root.style.setProperty('--gecko-border', c.border);
  root.style.setProperty('--gecko-text', c.text);
  root.style.setProperty('--gecko-text-muted', c.textMuted);

  const css = `
    .bg-gray-950 { background-color: ${c.bg} !important; }
    .bg-gray-50  { background-color: ${c.bg} !important; }
    .bg-gray-100 { background-color: ${c.bg} !important; }
    .bg-gray-900 { background-color: ${c.card} !important; }
    .bg-white    { background-color: ${c.card} !important; }
    .bg-black    { background-color: ${isDark ? '#000000' : '#F3F4F6'} !important; }
    .text-gray-100 { color: ${c.text} !important; }
    .text-gray-900 { color: ${c.text} !important; }
    .text-gray-300 { color: ${c.textMuted} !important; }
    .text-gray-400 { color: ${c.textMuted} !important; }
    .text-gray-500 { color: ${c.textMuted} !important; }
    .text-gray-600 { color: ${c.textMuted} !important; }
    .text-gray-700 { color: ${c.text} !important; }
    .text-gray-800 { color: ${c.text} !important; }
    .text-white    { color: ${c.text} !important; }
    .border-gray-800 { border-color: ${c.border} !important; }
    .border-gray-700 { border-color: ${c.border} !important; }
    .border-gray-200 { border-color: ${c.border} !important; }
    .border-gray-300 { border-color: ${c.border} !important; }
    .border-gray-600 { border-color: ${c.border} !important; }
    .border-gray-900 { border-color: ${c.border} !important; }
    .hover\\:bg-gray-700:hover { background-color: ${c.primary}30 !important; }
    .hover\\:bg-gray-800:hover { background-color: ${c.primary}30 !important; }
    .hover\\:bg-gray-600:hover { background-color: ${c.primary}40 !important; }
    .hover\\:bg-gray-300:hover { background-color: ${c.primary}20 !important; }
    .hover\\:border-gray-700:hover { border-color: ${c.primary}50 !important; }
    .hover\\:border-gray-500:hover { border-color: ${c.primary}50 !important; }
    .hover\\:border-gray-300:hover { border-color: ${c.primary}40 !important; }
    .hover\\:border-gray-400:hover { border-color: ${c.primary}40 !important; }
    .hover\\:text-white:hover { color: ${c.text} !important; }
    .shadow-sm { box-shadow: 0 1px 3px ${c.border}40 !important; }
    .bg-gray-700 { background-color: ${c.border} !important; }
    .bg-gray-600 { background-color: ${c.textMuted}40 !important; }
    .bg-gray-800 { background-color: ${c.card} !important; }
    .bg-gray-200 { background-color: ${isDark ? c.border : '#E5E7EB'} !important; }
    .bg-gray-700\\/30 { background-color: ${c.border}30 !important; }
    .bg-indigo-600 { background-color: ${c.primary} !important; }
    .bg-indigo-700 { background-color: ${c.primaryHover} !important; }
    .hover\\:bg-indigo-700:hover { background-color: ${c.primaryHover} !important; }
    .hover\\:bg-indigo-600:hover { background-color: ${c.primaryHover} !important; }
    .hover\\:bg-indigo-500:hover { background-color: ${c.primary} !important; }
    .text-indigo-500 { color: ${c.primary} !important; }
    .text-indigo-400 { color: ${c.primary} !important; }
    .text-indigo-600 { color: ${c.primary} !important; }
    .border-indigo-500 { border-color: ${c.primary} !important; }
    .border-indigo-600 { border-color: ${c.primary} !important; }
    .bg-indigo-500\\/10 { background-color: ${c.primary}15 !important; }
    .bg-indigo-500\\/20 { background-color: ${c.primary}25 !important; }
    .bg-indigo-600\\/90 { background-color: ${c.primary}E6 !important; }
    .bg-indigo-50\\/70 { background-color: ${c.primary}15 !important; }
    .bg-indigo-50 { background-color: ${c.primary}10 !important; }
    .accent-indigo-600 { accent-color: ${c.primary} !important; }
    .accent-indigo-500 { accent-color: ${c.primary} !important; }
    .from-indigo-500 { --tw-gradient-from: ${c.primary} !important; }
    .to-purple-600 { --tw-gradient-to: ${c.primaryHover} !important; }
    .shadow-indigo-500\\/20 { --tw-shadow-color: ${c.primary}30 !important; }
  `;

  let styleEl = document.getElementById('gecko-theme-override') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'gecko-theme-override';
    document.body.appendChild(styleEl);
  }
  styleEl.textContent = css;

  if (!(window as any).__themeObserverSet) {
    (window as any).__themeObserverSet = true;
    const observer = new MutationObserver(() => {
      if (styleEl.parentNode !== document.body) {
        document.body.appendChild(styleEl);
      }
    });
    observer.observe(document.body, { childList: true });
  }
}
