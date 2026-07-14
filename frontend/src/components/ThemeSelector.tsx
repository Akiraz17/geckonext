import React from 'react';
import { ThemeState, ThemeColor, PALETTES } from '../themes';

interface Props {
  theme: ThemeState;
  onChangeTheme: (color: ThemeColor, isDark: boolean) => void;
}

const COLORS: ThemeColor[] = ['indigo', 'emerald', 'amber', 'rose', 'violet'];
const DOT_COLORS: Record<ThemeColor, string> = {
  indigo: '#6366F1', emerald: '#10B981', amber: '#F59E0B', rose: '#F43F5E', violet: '#8B5CF6',
};

export default function ThemeSelector({ theme, onChangeTheme }: Props) {
  const { color, isDark, colors } = theme;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => onChangeTheme(c, isDark)}
            title={PALETTES[c].label}
            className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: DOT_COLORS[c],
              borderColor: color === c ? colors.text : 'transparent',
              opacity: color === c ? 1 : 0.5,
            }}
          />
        ))}
      </div>
      <div className="w-px h-4 opacity-30 mx-1" style={{ backgroundColor: colors.border }} />
      <button
        onClick={() => onChangeTheme(color, !isDark)}
        className="text-[11px] px-2 py-1 rounded border transition-all hover:opacity-80"
        style={{ borderColor: colors.border, color: colors.textMuted, backgroundColor: 'transparent' }}
      >
        {isDark ? '☀' : '☾'}
      </button>
    </div>
  );
}
