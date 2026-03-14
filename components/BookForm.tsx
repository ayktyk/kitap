import React, { useEffect, useRef, useState } from 'react';
import {
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
import { v4 as uuidv4 } from 'uuid';
import { Book, Quote } from '../types';
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
  { name: 'Okuma Sureci', icon: <Calendar size={18} /> },
  { name: 'Edinme', icon: <ShoppingBag size={18} /> },
  { name: 'Dusunceler ve Alintilar', icon: <BookOpen size={18} /> },
];

const getUploadErrorMessage = (error: unknown) => {
  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const loweredMessage = message.toLowerCase();

  if (loweredMessage.includes('bucket')) {
    return 'Kapak yukleme alani henuz hazir degil. Supabase storage kurulumu tamamlanmali.';
  }

  if (loweredMessage.includes('row-level security') || loweredMessage.includes('permission')) {
    return 'Kapak yukleme yetkisi eksik gorunuyor. Storage policy ayarlari kontrol edilmeli.';
  }

  if (loweredMessage.includes('authenticated') || loweredMessage.includes('jwt')) {
    return 'Kapak yuklemek icin tekrar giris yapman gerekebilir.';
  }

  return 'Kapak resmi yuklenemedi. Simdilik kapaksiz kaydedebilir veya daha sonra tekrar deneyebilirsin.';
};

const getSaveErrorMessage = (error: unknown) => {
  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const loweredMessage = message.toLowerCase();

  if (loweredMessage.includes('cover_url') || loweredMessage.includes('is_favorite')) {
    return 'Veritabani tablosu yeni alanlarla tam uyumlu degil. Kitap tablosunu guncellememiz gerekebilir.';
  }

  if (loweredMessage.includes('permission') || loweredMessage.includes('row-level security')) {
    return 'Kaydetme yetkisi hatasi var. Supabase RLS ayarlari kontrol edilmeli.';
  }

  if (loweredMessage.includes('json') || loweredMessage.includes('invalid input')) {
    return 'Kayit verilerinden biri veritabaninda kabul edilmedi. Alinti veya ek alanlari kontrol et.';
  }

  return 'Kitap kaydedilemedi. Lutfen tekrar deneyin.';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const locations = new Set<string>();

    allBooks.forEach((book) => {
      if (book.startLocation) locations.add(book.startLocation);
      if (book.endLocation) locations.add(book.endLocation);
      if (book.purchaseLocation) locations.add(book.purchaseLocation);
    });

    setLocationSuggestions(Array.from(locations).sort((a, b) => a.localeCompare(b, 'tr')));
  }, [allBooks]);

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

  const handleSaveClick = async () => {
    if (!formData.title.trim()) {
      alert('Kitap adi zorunlu.');
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
              {initialData ? 'Kitabi Duzenle' : 'Yeni Kitap Ekle'}
            </h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mt-2">
              Kutuphane Kayit Sistemi
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
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative shrink-0 mx-auto md:mx-0">
                <button
                  type="button"
                  className="w-40 h-60 bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-white/20 transition-all overflow-hidden bg-cover bg-center relative"
                  style={
                    formData.coverUrl
                      ? { backgroundImage: `url(${formData.coverUrl})`, borderStyle: 'solid' }
                      : {}
                  }
                  onClick={() => fileInputRef.current?.click()}
                >
                  {!formData.coverUrl && !uploading && (
                    <>
                      <Camera className="text-white/20" size={32} />
                      <span className="text-[10px] text-white/30 font-black uppercase tracking-widest text-center px-4">
                        Kapak Fotografi Yukle
                      </span>
                    </>
                  )}

                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}

                  {formData.coverUrl && !uploading && (
                    <div className="absolute inset-0 bg-black/10 hover:bg-black/55 transition-all flex items-center justify-center">
                      <span className="text-[10px] text-white font-black uppercase tracking-widest p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20">
                        Degistir
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

                <p className="text-[10px] uppercase tracking-widest font-black text-white/25 mt-3 text-center">
                  Kapak gorseli opsiyonel
                </p>

                {uploadError && (
                  <div className="mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-100 leading-relaxed">
                    {uploadError}
                  </div>
                )}
              </div>

              <div className="flex-1 grid md:grid-cols-2 gap-6 w-full">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-white/60">Kitap Adi</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))}
                    className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                    placeholder="Orn: Suc ve Ceza"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/60">Yazar</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(event) => setFormData((previous) => ({ ...previous, author: event.target.value }))}
                    className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                    placeholder="Orn: Fyodor Dostoyevski"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/60">Sayfa Sayisi</label>
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
                  <label className="block text-sm font-semibold text-white/60">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, status: event.target.value as Book['status'] }))
                    }
                    className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="WANT_TO_READ" className="bg-zinc-900 text-white">
                      Okumak Istiyorum
                    </option>
                    <option value="READING" className="bg-zinc-900 text-white">
                      Okuyorum
                    </option>
                    <option value="READ" className="bg-zinc-900 text-white">
                      Okundu
                    </option>
                    <option value="ABANDONED" className="bg-zinc-900 text-white">
                      Yarim Biraktim
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/60">Tur</label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(event) => setFormData((previous) => ({ ...previous, genre: event.target.value }))}
                    className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                    placeholder="Orn: Klasik, Bilim Kurgu"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/60 font-black text-[10px] uppercase tracking-widest">
                    Kisisel Puanim
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
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-serif font-bold text-white flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                  Baslangic
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Tarih
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(event) => setFormData((previous) => ({ ...previous, startDate: event.target.value }))}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Yer / Konum
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
                        className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                        placeholder="Orn: Istanbul, Ev"
                      />
                      {renderAutocomplete('startLocation', formData.startLocation)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-serif font-bold text-white flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                  Bitis
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Tarih
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(event) => setFormData((previous) => ({ ...previous, endDate: event.target.value }))}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Yer / Konum
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
                        className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                        placeholder="Orn: Izmir, Tatil"
                      />
                      {renderAutocomplete('endLocation', formData.endLocation)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="bg-white/5 p-8 rounded-2xl border border-white/5 grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/60">Satin Alma Tarihi</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, purchaseDate: event.target.value }))
                  }
                  className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold text-white/60">Satin Alinan Yer</label>
                <div className="relative">
                  <ShoppingBag size={18} className="absolute left-3.5 top-4 text-white/20" />
                  <input
                    type="text"
                    value={formData.purchaseLocation}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, purchaseLocation: event.target.value }))
                    }
                    onFocus={() => setActiveSuggestionField('purchaseLocation')}
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 150)}
                    className="w-full pl-11 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all font-medium"
                    placeholder="Orn: D&R, Amazon, Sahaf"
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
              <label className="block text-sm font-semibold text-white/60">Kitap hakkindaki dusuncelerim</label>
              <textarea
                value={formData.thoughts}
                onChange={(event) => setFormData((previous) => ({ ...previous, thoughts: event.target.value }))}
                className="w-full p-6 bg-white/5 text-white border border-white/10 rounded-2xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none h-48 resize-none font-serif leading-relaxed placeholder:text-white/10 transition-all"
                placeholder="Bu kitap bana neler hissettirdi?"
              />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <label className="block text-xl font-serif font-bold text-white">Alintilar</label>
                <button
                  type="button"
                  onClick={addQuote}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 transition-all px-4 py-3 rounded-full border border-white/10 shadow-lg cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  Yeni Alinti Ekle
                </button>
              </div>

              <div className="space-y-4">
                {formData.quotes.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl text-white/20 text-sm font-serif italic">
                    Henuz hicbir alinti eklenmedi.
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
                        onChange={(event) => updateQuote(quote.id, 'text', event.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-white font-serif italic resize-none placeholder-white/10 leading-relaxed overflow-hidden"
                        placeholder="Alintiyi buraya yazin..."
                        rows={2}
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
                  Vazgec
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-2 text-white/20 hover:text-red-400 hover:bg-red-500/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-500/10 cursor-pointer"
              >
                <Trash2 size={16} />
                Kitabi Sil
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
            Iptal
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
            {saving ? 'Kaydediliyor' : uploading ? 'Resim Yukleniyor' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="md:hidden h-4 w-full bg-transparent" />
    </div>
  );
};

export default BookForm;
