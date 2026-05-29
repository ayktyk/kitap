import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import * as libraryService from '../services/libraryService';

interface Props {
  file: File;
  onClose: () => void;
  onImported: () => void;
}

type ConflictMode = 'skip' | 'overwrite' | 'duplicate';

type Phase =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'preview'; preview: libraryService.ImportPreview }
  | { kind: 'importing' }
  | { kind: 'done'; summary: libraryService.ImportSummary; backupWarning: boolean };

const conflictOptions: { value: ConflictMode; label: string; hint: string }[] = [
  { value: 'skip', label: 'Atla', hint: 'Aynı kitap varsa mevcut kalsın (varsayılan)' },
  { value: 'overwrite', label: 'Üzerine yaz', hint: 'Yedekteki sürümle değiştir' },
  { value: 'duplicate', label: 'Çift ekle', hint: 'Aynı olsa bile yeni kayıt olarak ekle' },
];

const ImportDialog: React.FC<Props> = ({ file, onClose, onImported }) => {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [conflictMode, setConflictMode] = useState<ConflictMode>('skip');
  const bundleRef = useRef<libraryService.AnyExportBundle | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const backups = useMemo(() => libraryService.listAutoBackups(), []);

  // Dosyayı oku, doğrula, önizleme hesapla.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          if (!cancelled) setPhase({ kind: 'invalid', message: 'Dosya geçerli bir JSON değil.' });
          return;
        }
        if (!libraryService.isValidBundle(parsed)) {
          if (!cancelled) {
            setPhase({
              kind: 'invalid',
              message: 'Bu dosya bir Kitaplığım yedeği değil ya da bozuk.',
            });
          }
          return;
        }
        bundleRef.current = parsed;
        const preview = await libraryService.previewImport(parsed);
        if (!cancelled) setPhase({ kind: 'preview', preview });
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: 'invalid',
            message: err instanceof Error ? err.message : 'Dosya okunamadı.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Esc ile kapat + diyaloga odaklan (a11y).
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const runImport = async (bundle: libraryService.AnyExportBundle) => {
    setPhase({ kind: 'importing' });
    // Önce otomatik yedek — kota hatası olursa kullanıcıya bildirebilmek için
    // sonucu yakalıyoruz, importBooks'ta tekrar almasın diye skipAutoBackup.
    const backup = await libraryService.createAutoBackup();
    try {
      const summary = await libraryService.importBooks(bundle, {
        conflictMode,
        skipAutoBackup: true,
      });
      onImported();
      setPhase({ kind: 'done', summary, backupWarning: backup === null });
    } catch (err) {
      setPhase({
        kind: 'invalid',
        message: err instanceof Error ? err.message : 'İçe aktarma başarısız.',
      });
    }
  };

  const handleConfirm = () => {
    if (bundleRef.current) runImport(bundleRef.current);
  };

  const handleRestore = async (entry: libraryService.AutoBackupEntry) => {
    const when = new Date(entry.createdAt).toLocaleString('tr-TR');
    if (
      !window.confirm(
        `${entry.bookCount} kitaplık yedeğe (${when}) geri dönülsün mü? Eşleşen kitaplar bu sürümle değiştirilecek.`,
      )
    ) {
      return;
    }
    setPhase({ kind: 'importing' });
    try {
      const summary = await libraryService.restoreAutoBackup(entry);
      onImported();
      setPhase({ kind: 'done', summary, backupWarning: false });
    } catch (err) {
      setPhase({
        kind: 'invalid',
        message: err instanceof Error ? err.message : 'Geri yükleme başarısız.',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Yedek İçe Aktar"
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-bold text-lg">Yedek İçe Aktar</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {phase.kind === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-8 text-white/60">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Dosya okunuyor…</span>
            </div>
          )}

          {phase.kind === 'importing' && (
            <div className="flex items-center justify-center gap-3 py-8 text-white/60">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">İçe aktarılıyor…</span>
            </div>
          )}

          {phase.kind === 'invalid' && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{phase.message}</p>
            </div>
          )}

          {phase.kind === 'preview' && (
            <>
              <p className="text-sm text-white/70">
                <span className="font-bold text-white">{phase.preview.total}</span> kitap bulundu ·{' '}
                <span className="text-emerald-300">{phase.preview.newCount} yeni</span>
                {phase.preview.conflictCount > 0 && (
                  <>
                    {' '}
                    · <span className="text-amber-300">{phase.preview.conflictCount} çakışma</span>
                  </>
                )}
              </p>

              {phase.preview.conflictCount > 0 && (
                <fieldset className="space-y-1 pt-1">
                  <legend className="text-xs text-white/50 mb-1">Çakışan kitaplar için:</legend>
                  {conflictOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-2 p-2 rounded-xl hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="conflictMode"
                        value={opt.value}
                        checked={conflictMode === opt.value}
                        onChange={() => setConflictMode(opt.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="text-sm text-white/90 font-medium">{opt.label}</span>
                        <span className="block text-[11px] text-white/40">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-black text-sm font-black uppercase tracking-[0.18em] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Upload size={16} />
                Yedek Al ve İçe Aktar
              </button>
              <p className="text-[10px] text-white/30 leading-relaxed">
                İçe aktarmadan önce mevcut kütüphanenin otomatik yedeği alınır.
              </p>

              {backups.length > 0 && (
                <div className="pt-3 mt-1 border-t border-white/10">
                  <p className="text-xs text-white/50 mb-2">Veya bir otomatik yedeğe geri dön:</p>
                  <div className="space-y-1.5">
                    {backups.map((entry) => (
                      <button
                        key={entry.createdAt}
                        type="button"
                        onClick={() => handleRestore(entry)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs text-white/70 border border-white/5"
                      >
                        <RotateCcw size={14} className="shrink-0 text-white/40" />
                        <span>
                          {new Date(entry.createdAt).toLocaleString('tr-TR')} · {entry.bookCount}{' '}
                          kitap
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {phase.kind === 'done' && (
            <>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-100">
                <Check size={18} className="mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold mb-1">İçe aktarma tamamlandı</p>
                  <p>
                    Eklenen: {phase.summary.imported} · Atlanan: {phase.summary.skipped} · Başarısız:{' '}
                    {phase.summary.failed}
                  </p>
                </div>
              </div>

              {phase.backupWarning && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Otomatik yedek alınamadı (depolama dolu olabilir). Önemli verin varsa elle "Yedek
                    Hazırla" ile dışa aktar.
                  </p>
                </div>
              )}

              {phase.summary.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-[11px] leading-relaxed max-h-32 overflow-auto">
                  {phase.summary.errors.slice(0, 5).map((err, index) => (
                    <p key={index}>• {err}</p>
                  ))}
                  {phase.summary.errors.length > 5 && (
                    <p>…ve {phase.summary.errors.length - 5} hata daha</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 rounded-2xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 transition-all border border-white/10"
              >
                Kapat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
