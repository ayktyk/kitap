import React, { useEffect } from 'react';
import { Check, Palette, X } from 'lucide-react';
import { THEMES, ThemeKey } from '../lib/theme';
import { useTheme } from '../lib/themeContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSwitcher: React.FC<Props> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (key: ThemeKey) => {
    setTheme(key);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-fade-in-up"
        style={{
          backgroundColor: 'var(--theme-bg-2)',
          color: 'var(--theme-ink)',
          border: '1px solid var(--theme-border)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 sm:px-8 py-5 border-b"
          style={{
            borderColor: 'var(--theme-border-soft)',
            backgroundColor: 'var(--theme-bg-2)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                backgroundColor: 'var(--theme-surface-2)',
                color: 'var(--theme-accent)',
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <h2
                className="text-2xl font-bold leading-none tracking-tight"
                style={{ fontFamily: 'var(--theme-font-display)' }}
              >
                Tema
              </h2>
              <p
                className="text-[10px] uppercase tracking-[0.25em] font-bold mt-1.5"
                style={{ color: 'var(--theme-ink-mute)' }}
              >
                Görünüm tercihi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:opacity-70"
            style={{ color: 'var(--theme-ink-soft)' }}
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Açıklama */}
        <div
          className="px-6 sm:px-8 pt-6 pb-4 text-sm leading-relaxed"
          style={{ color: 'var(--theme-ink-soft)' }}
        >
          Kütüphanenizin görünümünü değiştirin. Seçiminiz cihazınıza kaydedilir, bir sonraki ziyaretinizde aynı tema açılır.
        </div>

        {/* Tema kartları grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 sm:px-8 pb-8">
          {THEMES.map((meta) => {
            const isActive = theme === meta.key;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => handleSelect(meta.key)}
                className="group relative text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  backgroundColor: meta.bg,
                  color: meta.ink,
                  border: isActive
                    ? `2px solid ${meta.accent}`
                    : '2px solid var(--theme-border-soft)',
                  boxShadow: isActive
                    ? `0 0 0 4px ${meta.accent}25, 0 12px 30px -10px ${meta.accent}40`
                    : '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                {/* Aktif rozeti */}
                {isActive && (
                  <div
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: meta.accent,
                      color: meta.bg,
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                {/* Tema önizleme */}
                <div className="p-5">
                  {/* Renk swatch şeridi */}
                  <div className="flex gap-1.5 mb-4">
                    {meta.swatches.map((color, idx) => (
                      <div
                        key={idx}
                        className="h-6 flex-1 rounded-md"
                        style={{
                          backgroundColor: color,
                          border:
                            color.toLowerCase() === '#ffffff' || color === '#fff'
                              ? '1px solid rgba(0,0,0,0.1)'
                              : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* Tema adı */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3
                      className="text-xl font-bold tracking-tight"
                      style={{ fontFamily: meta.fontFamily, color: meta.ink }}
                    >
                      {meta.name}
                    </h3>
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.25em]"
                      style={{ color: meta.ink, opacity: 0.55 }}
                    >
                      {meta.tagline}
                    </span>
                  </div>

                  {/* Açıklama */}
                  <p
                    className="text-xs leading-relaxed mb-3"
                    style={{ color: meta.ink, opacity: 0.7 }}
                  >
                    {meta.description}
                  </p>

                  {/* Mood + Önizleme tipografi */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: meta.ink, opacity: 0.5 }}
                    >
                      {meta.mood}
                    </span>
                    <span
                      className="text-base italic"
                      style={{
                        fontFamily: meta.fontFamily,
                        color: meta.accent,
                      }}
                    >
                      Aa
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer ipucu */}
        <div
          className="px-6 sm:px-8 pb-6 text-[11px] leading-relaxed border-t pt-4"
          style={{
            color: 'var(--theme-ink-mute)',
            borderColor: 'var(--theme-border-soft)',
          }}
        >
          İpucu: Tema değişikliği anında uygulanır. Beğenmezseniz başka bir kart seçerek geri dönebilirsiniz.
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
