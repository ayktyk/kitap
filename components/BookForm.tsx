import React, { useEffect, useRef, useState } from 'react';
import {
  Barcode,
  BookOpen,
  Calendar,
  Camera,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { v4 as uuidv4 } from 'uuid';
import { Book, BookLookupResult, Quote } from '../types';
import { lookupBookByIsbn } from '../services/bookLookupService';
import { uploadCoverImage } from '../services/supabaseService';
import RatingStars from './RatingStars';

interface Props {
  initialData?: Book | null;
  allBooks: Book[];
  onSave: (book: Book) => Promise<void> | void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const tabs = [
  { name: 'Genel Bilgiler', icon: <BookOpen size={18} /> },
  { name: 'Okuma Süreci', icon: <Calendar size={18} /> },
  { name: 'Edinme', icon: <ShoppingBag size={18} /> },
  { name: 'Düşünceler ve Alıntılar', icon: <BookOpen size={18} /> },
];

const getUploadErrorMessage = (error: unknown) => {
  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const loweredMessage = message.toLowerCase();

  if (loweredMessage.includes('bucket')) {
    return 'Kapak yükleme alanı henüz hazır değil. Supabase storage kurulumu tamamlanmalı.';
  }

  if (loweredMessage.includes('row-level security') || loweredMessage.includes('permission')) {
    return 'Kapak yükleme yetkisi eksik görünüyor. Storage policy ayarları kontrol edilmeli.';
  }

  if (loweredMessage.includes('authenticated') || loweredMessage.includes('jwt')) {
    return 'Kapak yüklemek için tekrar giriş yapman gerekebilir.';
  }

  return 'Kapak resmi yüklenemedi. Şimdilik kapaksız kaydedebilir veya daha sonra tekrar deneyebilirsin.';
};

const getSaveErrorMessage = (error: unknown) => {
  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const loweredMessage = message.toLowerCase();

  if (loweredMessage.includes('cover_url') || loweredMessage.includes('is_favorite')) {
    return 'Veritabanı tablosu yeni alanlarla tam uyumlu değil. Kitap tablosunu güncellememiz gerekebilir.';
  }

  if (loweredMessage.includes('permission') || loweredMessage.includes('row-level security')) {
    return 'Kaydetme yetkisi hatası var. Supabase RLS ayarları kontrol edilmeli.';
  }

  if (loweredMessage.includes('json') || loweredMessage.includes('invalid input')) {
    return 'Kayıt verilerinden biri veritabanında kabul edilmedi. Alıntı veya ek alanları kontrol et.';
  }

  return 'Kitap kaydedilemedi. Lütfen tekrar deneyin.';
};

const BookForm: React.FC<Props> = ({ initialData, allBooks, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<Book>({
    id: initialData?.id || uuidv4(),
    title: initialData?.title || '',
    author: initialData?.author || '',
    coverUrl: initialData?.coverUrl || '',
    rating: initialData?.rating || 0,
    pageCount: initialData?.pageCount || 0,
    genre: initialData?.genre || '',
    status: initialData?.status || 'WANT_TO_READ',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    startLocation: initialData?.startLocation || '',
    endLocation: initialData?.endLocation || '',
    purchaseDate: initialData?.purchaseDate || '',
    purchaseLocation: initialData?.purchaseLocation || '',
    thoughts: initialData?.thoughts || '',
    quotes: initialData?.quotes || [],
    isFavorite: initialData?.isFavorite || false,
    createdAt: initialData?.createdAt || Date.now(),
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<keyof Book | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isbnValue, setIsbnValue] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const scannerControlsRef = useRef<any>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const locations = new Set<string>();

    allBooks.forEach((book) => {
      if (book.startLocation) locations.add(book.startLocation);
      if (book.endLocation) locations.add(book.endLocation);
      if (book.purchaseLocation) locations.add(book.purchaseLocation);
    });

    setLocationSuggestions(Array.from(locations).sort((a, b) => a.localeCompare(b, 'tr')));
  }, [allBooks]);

  useEffect(() => {
    return () => {
      if (scanLoopRef.current) {
        window.clearTimeout(scanLoopRef.current);
      }

      scannerControlsRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError(null);
      const publicUrl = await uploadCoverImage(file);
      setFormData((previous) => ({ ...previous, coverUrl: publicUrl }));
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(getUploadErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const applyLookupResult = (result: BookLookupResult) => {
    setFormData((previous) => ({
      ...previous,
      title: result.title || previous.title,
      author: result.author || previous.author,
      pageCount: result.pageCount || previous.pageCount,
      genre: result.genre || result.categories?.[0] || previous.genre,
      thoughts: previous.thoughts || result.description || '',
      coverUrl: previous.coverUrl || result.coverUrl || '',
    }));
  };

  const handleIsbnLookup = async (rawValue: string) => {
    try {
      setLookupLoading(true);
      setLookupMessage(null);
      const result = await lookupBookByIsbn(rawValue);
      applyLookupResult(result);
      setIsbnValue(result.isbn);
      setLookupMessage(`Bilgiler dolduruldu. Kaynak: ${result.source}`);
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'ISBN bilgisi alınamadı.';
      setLookupMessage(message);
    } finally {
      setLookupLoading(false);
    }
  };

  const stopScanner = () => {
    if (scanLoopRef.current) {
      window.clearTimeout(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    scannerControlsRef.current?.stop?.();
    scannerControlsRef.current = null;
    zxingReaderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerOpen(false);
  };

  const startScanLoop = (detector: any) => {
    const scan = async () => {
      try {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          scanLoopRef.current = window.setTimeout(scan, 250);
          return;
        }

        const detectedCodes = await detector.detect(video);
        const rawValue = detectedCodes?.[0]?.rawValue;

        if (rawValue) {
          const normalized = rawValue.replace(/[^0-9Xx]/g, '').toUpperCase();
          if (normalized.length === 10 || normalized.length === 13) {
            stopScanner();
            setIsbnValue(normalized);
            await handleIsbnLookup(normalized);
            return;
          }
        }
      } catch (error) {
        console.error('Barcode scan failed:', error);
      }

      scanLoopRef.current = window.setTimeout(scan, 350);
    };

    void scan();
  };

  const handleStartScanner = async () => {
    const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: any }).BarcodeDetector;

    try {
      setScannerError(null);
      setLookupMessage(null);
      setScannerOpen(true);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      if (BarcodeDetectorCtor) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });

        startScanLoop(detector);
        return;
      }

      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      scannerControlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        async (result, error, controls) => {
          if (result?.getText()) {
            const normalized = result.getText().replace(/[^0-9Xx]/g, '').toUpperCase();
            if (normalized.length === 10 || normalized.length === 13) {
              scannerControlsRef.current = controls;
              stopScanner();
              setIsbnValue(normalized);
              await handleIsbnLookup(normalized);
            }
          }

          if (error && error.name !== 'NotFoundException') {
            console.error('ZXing scan error:', error);
          }
        },
      );
    } catch (error) {
      console.error('Unable to start scanner:', error);
      setScannerError('Kamera açılamadı. Kamera iznini kontrol et veya ISBN numarasını elle gir.');
    }
  };

  const handleSaveClick = async () => {
    if (!formData.title.trim()) {
      alert('Kitap adı zorunlu.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...formData,
        title: formData.title.trim(),
        author: formData.author.trim(),
        genre: formData.genre?.trim() || '',
        thoughts: formData.thoughts.trim(),
        startLocation: formData.startLocation.trim(),
        endLocation: formData.endLocation.trim(),
        purchaseLocation: formData.purchaseLocation.trim(),
      });
    } catch (error) {
      console.error('Save failed:', error);
      alert(getSaveErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRatingChange = (rating: number) => {
    setFormData((previous) => ({
      ...previous,
      rating,
      status: rating > 0 ? 'READ' : previous.status,
    }));
  };

  const addQuote = () => {
    setFormData((previous) => ({
      ...previous,
      quotes: [...previous.quotes, { id: uuidv4(), text: '', page: 0 }],
    }));
  };

  const updateQuote = (id: string, field: keyof Quote, value: string | number) => {
    setFormData((previous) => ({
      ...previous,
      quotes: previous.quotes.map((quote) =>
        quote.id === id ? { ...quote, [field]: value } : quote,
      ),
    }));
  };

  const removeQuote = (id: string) => {
    setFormData((previous) => ({
      ...previous,
      quotes: previous.quotes.filter((quote) => quote.id !== id),
    }));
  };

  const renderAutocomplete = (field: keyof Book, value: string) => {
    const filteredSuggestions = locationSuggestions
      .filter(
        (suggestion) =>
          suggestion.toLocaleLowerCase('tr-TR').includes(value.toLocaleLowerCase('tr-TR')) &&
          suggestion !== value,
      )
      .slice(0, 5);

    if (activeSuggestionField !== field || filteredSuggestions.length === 0) return null;

    return (
      <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {filteredSuggestions.map((suggestion) => (
          <button
            key={`${field}-${suggestion}`}
            type="button"
            onClick={() => {
              setFormData((previous) => ({ ...previous, [field]: suggestion }));
              setActiveSuggestionField(null);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0 cursor-pointer"
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="glass rounded-3xl max-w-4xl mx-auto overflow-hidden flex flex-col border border-white/5 shadow-2xl animate-fade-in-up relative">
      <div className="bg-white/5 border-b border-white/5 p-6 flex justify-between items-center backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              setFormData((previous) => ({ ...previous, isFavorite: !previous.isFavorite }))
            }
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              formData.isFavorite || formData.rating === 10
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'
            }`}
            title="Favorilere ekle"
          >
            <Star size={24} className={formData.isFavorite || formData.rating === 10 ? 'fill-blue-400' : ''} />
          </button>

          <div>
            <h2 className="text-2xl font-serif font-bold text-white leading-none">
              {initialData ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}
            </h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mt-2">
              Kütüphane Kayıt Sistemi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar bg-white/[0.02]">
        {tabs.map((tab, index) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(index)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === index
                ? 'border-white text-white bg-white/5'
                : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
            }`}
          >
            <span className={activeTab === index ? 'text-white' : 'text-white/30'}>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 space-y-6 overflow-visible md:overflow-y-auto md:max-h-[70vh]">
        {activeTab === 0 && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-2">
                    ISBN ile Doldur
                  </label>
                  <div className="relative">
                    <Barcode size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      type="text"
                      value={isbnValue}
                      onChange={(event) => setIsbnValue(event.target.value)}
                      placeholder="978... barkod veya ISBN"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-black/20 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 lg:self-end">
                  <button
                    type="button"
                    onClick={() => handleIsbnLookup(isbnValue)}
                    disabled={lookupLoading || !isbnValue.trim()}
                    className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
                      lookupLoading || !isbnValue.trim()
                        ? 'bg-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-white text-black hover:scale-105 active:scale-95'
                    }`}
                  >
                    {lookupLoading ? 'Aranıyor' : 'ISBN Doldur'}
                  </button>

                  <button
                    type="button"
                    onClick={handleStartScanner}
                    className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all bg-white/10 text-white hover:bg-white/20 active:scale-95"
                  >
                    Tara
                  </button>
                </div>
              </div>

              {lookupMessage && (
                <p className="mt-3 text-xs text-white/55 leading-relaxed">{lookupMessage}</p>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {/* Cover + Title/Author row */}
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="relative shrink-0 mx-auto sm:mx-0">
                  <button
                    type="button"
                    className="w-28 h-40 bg-white/5 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-all overflow-hidden bg-cover bg-center relative"
                    style={
                      formData.coverUrl
                        ? { backgroundImage: `url(${formData.coverUrl})`, borderStyle: 'solid' }
                        : {}
                    }
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {!formData.coverUrl && !uploading && (
                      <>
                        <Camera className="text-white/20" size={24} />
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-widest text-center px-2">
                          Kapak Yükle
                        </span>
                      </>
                    )}

                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={20} />
                      </div>
                    )}

                    {formData.coverUrl && !uploading && (
                      <div className="absolute inset-0 bg-black/10 hover:bg-black/55 transition-all flex items-center justify-center">
                        <span className="text-[9px] text-white font-black uppercase tracking-widest p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/20">
                          Değiştir
                        </span>
                      </div>
                    )}
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />

                  {uploadError && (
                    <div className="mt-2 p-2 rounded-lg border border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-100 leading-relaxed max-w-[112px]">
                      {uploadError}
                    </div>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-white/60">Kitap Adı</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="Örn: Suç ve Ceza"
                    />
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-white/60">Yazar</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(event) => setFormData((previous) => ({ ...previous, author: event.target.value }))}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="Örn: Fyodor Dostoyevski"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60">Sayfa Sayısı</label>
                    <input
                      type="number"
                      value={formData.pageCount || ''}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          pageCount: parseInt(event.target.value, 10) || 0,
                        }))
                      }
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60">Tür</label>
                    <input
                      type="text"
                      value={formData.genre}
                      onChange={(event) => setFormData((previous) => ({ ...previous, genre: event.target.value }))}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="Örn: Klasik, Bilim Kurgu"
                    />
                  </div>
                </div>
              </div>

              {/* Durum + Puan row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/60">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, status: event.target.value as Book['status'] }))
                    }
                    className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="WANT_TO_READ" className="bg-zinc-900 text-white">
                      Okumak İstiyorum
                    </option>
                    <option value="READING" className="bg-zinc-900 text-white">
                      Okuyorum
                    </option>
                    <option value="READ" className="bg-zinc-900 text-white">
                      Okundu
                    </option>
                    <option value="ABANDONED" className="bg-zinc-900 text-white">
                      Yarım Bıraktım
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/60 font-black text-[10px] uppercase tracking-widest">
                    Kişisel Puanım
                  </label>
                  <div className="p-3 border border-white/5 rounded-xl bg-white/[0.02]">
                    <RatingStars
                      rating={formData.rating}
                      onChange={handleRatingChange}
                      size={24}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/60">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-2 align-middle" />
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(event) => setFormData((previous) => ({ ...previous, startDate: event.target.value }))}
                  className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold text-white/60">
                  Başlangıç Yeri
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                  <input
                    type="text"
                    value={formData.startLocation}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, startLocation: event.target.value }))
                    }
                    onFocus={() => setActiveSuggestionField('startLocation')}
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 150)}
                    className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none text-sm transition-all"
                    placeholder="Örn: İstanbul, Ev"
                  />
                  {renderAutocomplete('startLocation', formData.startLocation)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/60">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 align-middle" />
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(event) => setFormData((previous) => ({ ...previous, endDate: event.target.value }))}
                  className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold text-white/60">
                  Bitiş Yeri
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                  <input
                    type="text"
                    value={formData.endLocation}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, endLocation: event.target.value }))
                    }
                    onFocus={() => setActiveSuggestionField('endLocation')}
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 150)}
                    className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none text-sm transition-all"
                    placeholder="Örn: İzmir, Tatil"
                  />
                  {renderAutocomplete('endLocation', formData.endLocation)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/60">Satın Alma Tarihi</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, purchaseDate: event.target.value }))
                  }
                  className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold text-white/60">Satın Alınan Yer</label>
                <div className="relative">
                  <ShoppingBag size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                  <input
                    type="text"
                    value={formData.purchaseLocation}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, purchaseLocation: event.target.value }))
                    }
                    onFocus={() => setActiveSuggestionField('purchaseLocation')}
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 150)}
                    className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 text-sm transition-all"
                    placeholder="Örn: D&R, Amazon, Sahaf"
                  />
                  {renderAutocomplete('purchaseLocation', formData.purchaseLocation)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white/60">Kitap hakkındaki düşüncelerim</label>
              <textarea
                value={formData.thoughts}
                onChange={(event) => setFormData((previous) => ({ ...previous, thoughts: event.target.value }))}
                className="w-full p-6 bg-white/5 text-white border border-white/10 rounded-2xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none h-48 resize-none font-serif leading-relaxed placeholder:text-white/10 transition-all"
                placeholder="Bu kitap bana neler hissettirdi?"
              />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <label className="block text-xl font-serif font-bold text-white">Alıntılar</label>
                <button
                  type="button"
                  onClick={addQuote}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 transition-all px-4 py-3 rounded-full border border-white/10 shadow-lg cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  Yeni Alıntı Ekle
                </button>
              </div>

              <div className="space-y-4">
                {formData.quotes.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl text-white/20 text-sm font-serif italic">
                    Henüz hiçbir alıntı eklenmedi.
                  </div>
                )}

                {formData.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex gap-4 items-start bg-white/5 p-6 rounded-2xl border border-white/5 group transition-all hover:bg-white/[0.08]"
                  >
                    <div className="flex-1 space-y-3">
                      <textarea
                        value={quote.text}
                        onChange={(event) => {
                          updateQuote(quote.id, 'text', event.target.value);
                          const target = event.target;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-white font-serif italic resize-none placeholder-white/10 leading-relaxed"
                        placeholder="Alıntıyı buraya yazın..."
                        rows={1}
                      />

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Sayfa</span>
                          <input
                            type="number"
                            value={quote.page || ''}
                            onChange={(event) =>
                              updateQuote(quote.id, 'page', parseInt(event.target.value, 10) || 0)
                            }
                            className="w-16 text-xs p-1.5 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-white/30 transition-all"
                            placeholder="No"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuote(quote.id)}
                      className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-bold text-lg">ISBN Tara</h3>
                <p className="text-white/40 text-xs">Barkodu kameraya doğru tut.</p>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                {scannerError ? (
                  <p className="text-sm text-white/60 px-6 text-center leading-relaxed">{scannerError}</p>
                ) : (
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                )}
              </div>

              <button
                type="button"
                onClick={stopScanner}
                className="w-full px-4 py-3 rounded-2xl bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 border-t border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-6">
        {initialData && onDelete ? (
          <div className="relative">
            {showConfirmDelete ? (
              <div className="flex items-center gap-3 transition-all">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest whitespace-nowrap">
                  Emin misiniz?
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Evet, Sil
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest px-4 cursor-pointer"
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-2 text-white/20 hover:text-red-400 hover:bg-red-500/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-500/10 cursor-pointer"
              >
                <Trash2 size={16} />
                Kitabı Sil
              </button>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex gap-4 w-full md:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 md:flex-none px-8 py-4 rounded-xl border border-white/10 text-white/60 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all cursor-pointer"
          >
            İptal
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || uploading}
            className={`flex-1 md:flex-none px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
              saving || uploading
                ? 'bg-white/40 text-black/60 cursor-not-allowed'
                : 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer'
            }`}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Kaydediliyor' : uploading ? 'Resim Yükleniyor' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="md:hidden h-4 w-full bg-transparent" />
    </div>
  );
};

export default BookForm;
