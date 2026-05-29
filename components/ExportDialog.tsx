import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';

interface Props {
  json: string | null;
  fileName: string;
  bookCount: number;
  error?: string;
  onClose: () => void;
}

type Status = { kind: 'idle' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string };

const ExportDialog: React.FC<Props> = ({ json, fileName, bookCount, error, onClose }) => {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const downloadAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const ready = !!json && !error;

  const blobUrl = useMemo(() => {
    if (!json) return '';
    const blob = new Blob([json], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }, [json]);

  useEffect(() => {
    downloadUrlRef.current = blobUrl || null;
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = null;
      }
    };
  }, [blobUrl]);

  // Esc ile kapat + diyaloga odaklan (a11y).
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sizeText = useMemo(() => {
    if (!json) return '';
    const kb = json.length / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }, [json]);

  const canShare = useMemo(() => {
    if (!json) return false;
    const nav = navigator as Navigator & {
      canShare?: (data?: { files?: File[] }) => boolean;
      share?: (data?: { files?: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (!nav.share || !nav.canShare) return false;
    try {
      const file = new File([json], fileName, { type: 'application/json' });
      return nav.canShare({ files: [file] });
    } catch {
      return false;
    }
  }, [json, fileName]);

  // Çok büyük yedeklerde Web Share bazı cihazlarda sessizce başarısız olabilir.
  const largeBundle = !!json && json.length > 25 * 1024 * 1024;

  const handleShare = async () => {
    if (!json) return;
    setStatus({ kind: 'idle' });
    try {
      const file = new File([json], fileName, { type: 'application/json' });
      const nav = navigator as Navigator & {
        share: (data?: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      await nav.share({
        files: [file],
        title: fileName,
        text: `Kitaplığım yedeği — ${bookCount} kitap`,
      });
      setStatus({ kind: 'ok', message: 'Paylaşıldı.' });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setStatus({ kind: 'error', message: `Paylaşma başarısız: ${msg}` });
    }
  };

  const handleCopy = async () => {
    if (!json) return;
    setStatus({ kind: 'idle' });
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      setStatus({
        kind: 'ok',
        message: 'Yedek panoya kopyalandı. Notlar veya WhatsApp\'a yapıştırabilirsin.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setStatus({ kind: 'error', message: `Kopyalama başarısız: ${msg}` });
    }
  };

  const handleDownloadClick = () => {
    if (!json) return;
    setStatus({ kind: 'ok', message: 'İndirme tetiklendi. Tarayıcının indirme listesini kontrol et.' });
    downloadAnchorRef.current?.click();
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
        aria-label="Yedek Hazırla"
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-lg">Yedek Hazırla</h3>
              <span className="text-[9px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                v2 yerel
              </span>
            </div>
            <p className="text-white/40 text-xs mt-1">
              {ready ? `${bookCount} kitap · ${sizeText}` : error ? 'Hata' : 'Hazırlanıyor...'}
            </p>
          </div>
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
          {!ready && !error && (
            <div className="flex items-center justify-center gap-3 py-8 text-white/60">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Kitaplar ve kapaklar paketleniyor…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold mb-1">Yedek hazırlanamadı</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {ready && bookCount === 0 && (
            <p className="text-sm text-white/60 text-center py-6">
              Kütüphanende henüz kitap yok. Önce kitap ekle, sonra yedek al.
            </p>
          )}

          {ready && bookCount > 0 && (
            <>
              <p className="text-xs text-white/55 leading-relaxed">
                Telefonun için en kolay yolu seç. Hangisi çalışırsa o iyi — bir tanesi olmazsa bir
                sonrakini dene.
              </p>

              {largeBundle && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Yedek büyük ({sizeText}). Paylaşım bazı telefonlarda başarısız olabilir — olmazsa
                    "Dosya Olarak İndir"i kullan.
                  </span>
                </div>
              )}

              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-black text-sm font-black uppercase tracking-[0.18em] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Share2 size={16} />
                  Paylaş (WhatsApp / Dosyalar / Drive)
                </button>
              )}

              <a
                ref={downloadAnchorRef}
                href={blobUrl}
                download={fileName}
                onClick={handleDownloadClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 transition-all border border-white/10"
              >
                <Download size={16} />
                Dosya Olarak İndir
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 text-white/80 text-sm font-bold hover:bg-white/10 transition-all border border-white/5"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Kopyalandı' : 'Panoya Kopyala'}
              </button>

              {status.kind !== 'idle' && (
                <div
                  className={`mt-2 p-3 rounded-xl text-xs leading-relaxed border ${
                    status.kind === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                      : 'bg-red-500/10 border-red-500/20 text-red-200'
                  }`}
                >
                  {status.message}
                </div>
              )}

              <p className="pt-2 text-[10px] text-white/30 leading-relaxed">
                Dosya adı: <span className="text-white/50">{fileName}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
