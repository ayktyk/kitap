import React, { useState, useEffect, useRef } from 'react';
import { Book, Quote, BookAIResponse } from '../types';
import { Sparkles, Save, X, Plus, Trash2, Calendar, MapPin, BookOpen, ShoppingBag, Loader2, Camera, Star, AlertTriangle } from 'lucide-react';
import RatingStars from './RatingStars';
import { suggestBookDetails } from '../services/geminiService';
import { uploadCoverImage } from '../services/supabaseService';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  initialData?: Book | null;
  allBooks: Book[]; // For autocomplete suggestions
  onSave: (book: Book) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const BookForm: React.FC<Props> = ({ initialData, allBooks, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<Book>({
    id: initialData?.id || uuidv4(),
    title: initialData?.title || '',
    author: initialData?.author || '',
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
    coverUrl: initialData?.coverUrl || '',
    isFavorite: initialData?.isFavorite || false,
    createdAt: initialData?.createdAt || Date.now(),
  });

  const [loadingAi, setLoadingAi] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique locations for autocomplete
  useEffect(() => {
    const locations = new Set<string>();
    allBooks.forEach(b => {
      if (b.startLocation) locations.add(b.startLocation);
      if (b.endLocation) locations.add(b.endLocation);
      if (b.purchaseLocation) locations.add(b.purchaseLocation);
    });
    setLocationSuggestions(Array.from(locations).sort());
  }, [allBooks]);

  const handleAiFill = async () => {
    if (!formData.title) {
      alert("Lütfen önce kitap adını giriniz.");
      return;
    }
    setLoadingAi(true);
    const result = await suggestBookDetails(formData.title, formData.author);
    setLoadingAi(false);

    if (result) {
      setFormData(prev => ({
        ...prev,
        author: result.author || prev.author,
        pageCount: result.pageCount || prev.pageCount,
        genre: result.genre || prev.genre,
        thoughts: prev.thoughts ? prev.thoughts : (result.description || ''),
        quotes: result.suggestedQuotes 
          ? [...prev.quotes, ...result.suggestedQuotes.map(q => ({ id: uuidv4(), text: q, page: 0 }))] 
          : prev.quotes
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const publicUrl = await uploadCoverImage(file);
      setFormData(prev => ({ ...prev, coverUrl: publicUrl }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Resim yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
    }
  };

  const addQuote = () => {
    setFormData(prev => ({
      ...prev,
      quotes: [...prev.quotes, { id: uuidv4(), text: '', page: 0 }]
    }));
  };

  const updateQuote = (id: string, field: keyof Quote, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => q.id === id ? { ...q, [field]: value } : q)
    }));
  };

  const removeQuote = (id: string) => {
    setFormData(prev => ({
      ...prev,
      quotes: prev.quotes.filter(q => q.id !== id)
    }));
  };

  const tabs = [
    { name: 'Genel Bilgiler', icon: <BookOpen size={18} /> },
    { name: 'Okuma Süreci', icon: <Calendar size={18} /> },
    { name: 'Edinme', icon: <ShoppingBag size={18} /> },
    { name: 'Düşünceler & Alıntılar', icon: <Sparkles size={18} /> },
  ];

  const renderAutocomplete = (field: keyof Book, value: string) => {
    const filtered = locationSuggestions.filter(s => 
      s.toLowerCase().includes(value.toLowerCase()) && s !== value
    ).slice(0, 5);

    if (activeSuggestionField !== field || filtered.length === 0) return null;

    return (
      <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95">
        {filtered.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setFormData({ ...formData, [field]: s });
              setActiveSuggestionField(null);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
          >
            {s}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="glass rounded-3xl max-w-4xl mx-auto overflow-hidden flex flex-col h-full md:h-auto border border-white/5 shadow-2xl animate-fade-in-up relative">
      {/* Photo Preview Mobile Over Header (Optional) */}
      
      {/* Header */}
      <div className="bg-white/5 border-b border-white/5 p-6 flex justify-between items-center backdrop-blur-3xl">
        <div className="flex items-center gap-4">
           {/* Favorite Toggle Icon */}
           <button 
             onClick={() => setFormData(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
             className={`p-3 rounded-2xl border transition-all ${
               formData.isFavorite || formData.rating === 10
                 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                 : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'
             }`}
             title="Favorilere Ekle"
           >
             <Star size={24} className={formData.isFavorite || formData.rating === 10 ? 'fill-blue-400' : ''} />
           </button>
           <div>
             <h2 className="text-2xl font-serif font-bold text-white leading-none">{initialData ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}</h2>
             <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mt-2">Kütüphane Kayıt Sistemi</p>
           </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
          <X size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar bg-white/[0.02]">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
              activeTab === idx 
                ? 'border-white text-white bg-white/5' 
                : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
            }`}
          >
            <span className={activeTab === idx ? 'text-white' : 'text-white/30'}>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
        
        {/* Tab 0: General Info */}
        {activeTab === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row gap-8 items-start">
               {/* Cover Upload */}
               <div className="relative group shrink-0 mx-auto md:mx-0">
                  <div 
                    className="w-40 h-60 bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer group-hover:border-white/20 transition-all overflow-hidden bg-cover bg-center"
                    style={formData.coverUrl ? { backgroundImage: `url(${formData.coverUrl})`, borderStyle: 'solid' } : {}}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {!formData.coverUrl && !uploading && (
                      <>
                        <Camera className="text-white/20" size={32} />
                        <span className="text-[10px] text-white/30 font-black uppercase tracking-widest text-center px-4">Kapak Fotoğrafı Yükle</span>
                      </>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                    {formData.coverUrl && !uploading && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                         <span className="text-[10px] text-white font-black uppercase tracking-widest p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20">Değiştir</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
               </div>

               <div className="flex-1 grid md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-white/60">Kitap Adı</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                        placeholder="Örn: Suç ve Ceza"
                      />
                      <button 
                        onClick={handleAiFill}
                        disabled={loadingAi || !formData.title}
                        className="absolute right-2 top-2 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                        title="Yapay Zeka ile Doldur"
                      >
                        {loadingAi ? <Loader2 className="animate-spin text-white/40" size={20} /> : <Sparkles size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60">Yazar</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={e => setFormData({ ...formData, author: e.target.value })}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="Örn: Fyodor Dostoyevski"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60">Sayfa Sayısı</label>
                    <input
                      type="number"
                      value={formData.pageCount || ''}
                      onChange={e => setFormData({ ...formData, pageCount: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60">Durum</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="WANT_TO_READ" className="bg-zinc-900 text-white">Okumak İstiyorum</option>
                      <option value="READING" className="bg-zinc-900 text-white">Okuyorum</option>
                      <option value="READ" className="bg-zinc-900 text-white">Okundu</option>
                      <option value="ABANDONED" className="bg-zinc-900 text-white">Yarım Bıraktım</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60">Tür</label>
                    <input
                      type="text"
                      value={formData.genre}
                      onChange={e => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all"
                      placeholder="Örn: Klasik, Bilim Kurgu"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/60 font-black text-[10px] uppercase tracking-widest text-white/40">Kişisel Puanım</label>
                    <div className="p-3 border border-white/5 rounded-xl bg-white/[0.02]">
                      <RatingStars rating={formData.rating} onChange={(r) => setFormData({ ...formData, rating: r })} size={24} />
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Tab 1: Reading Process */}
        {activeTab === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Start */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-serif font-bold text-white flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div> Başlangıç
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Tarih</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Yer / Konum</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                      <input
                        type="text"
                        value={formData.startLocation}
                        onChange={e => setFormData({ ...formData, startLocation: e.target.value })}
                        onFocus={() => setActiveSuggestionField('startLocation')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                        placeholder="Örn: İstanbul, Ev"
                      />
                      {renderAutocomplete('startLocation', formData.startLocation)}
                    </div>
                  </div>
                </div>
              </div>

              {/* End */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-serif font-bold text-white flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"></div> Bitiş
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Tarih</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Yer / Konum</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                      <input
                        type="text"
                        value={formData.endLocation}
                        onChange={e => setFormData({ ...formData, endLocation: e.target.value })}
                        onFocus={() => setActiveSuggestionField('endLocation')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        className="w-full pl-10 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm transition-all"
                        placeholder="Örn: İzmir, Tatil"
                      />
                      {renderAutocomplete('endLocation', formData.endLocation)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Purchase Info */}
        {activeTab === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white/5 p-8 rounded-2xl border border-white/5 grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/60">Satın Alma Tarihi</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold text-white/60">Satın Alınan Yer</label>
                <div className="relative">
                  <ShoppingBag size={18} className="absolute left-3.5 top-4 text-white/20" />
                  <input
                    type="text"
                    value={formData.purchaseLocation}
                    onChange={e => setFormData({ ...formData, purchaseLocation: e.target.value })}
                    onFocus={() => setActiveSuggestionField('purchaseLocation')}
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                    className="w-full pl-11 p-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none placeholder:text-white/20 transition-all font-medium"
                    placeholder="Örn: D&R, Amazon, Sahaf"
                  />
                  {renderAutocomplete('purchaseLocation', formData.purchaseLocation)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Content (Thoughts & Quotes) */}
        {activeTab === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Thoughts */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white/60 flex justify-between">
                Kitap Hakkındaki Düşüncelerim
              </label>
              <textarea
                value={formData.thoughts}
                onChange={e => setFormData({ ...formData, thoughts: e.target.value })}
                className="w-full p-6 bg-white/5 text-white border border-white/10 rounded-2xl focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none h-48 resize-none font-serif leading-relaxed placeholder:text-white/10 transition-all"
                placeholder="Bu kitap bana neler hissettirdi? En sevdiğim bölüm neydi?"
              />
            </div>

            {/* Quotes */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="block text-xl font-serif font-bold text-white">Alıntılar</label>
                <button
                   type="button"
                   onClick={addQuote}
                   className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-full border border-white/5"
                >
                  <Plus size={14} /> Yeni Alıntı Ekle
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.quotes.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl text-white/20 text-sm font-serif italic">
                    Henüz hiçbir kelime inci gibi dizilmemiş...
                  </div>
                )}
                {formData.quotes.map((quote) => (
                  <div key={quote.id} className="flex gap-4 items-start bg-white/5 p-6 rounded-2xl border border-white/5 group transition-all hover:bg-white/[0.08]">
                    <div className="flex-1 space-y-3">
                      <textarea
                        value={quote.text}
                        onChange={e => updateQuote(quote.id, 'text', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-white font-serif italic resize-none placeholder-white/10 leading-relaxed overflow-hidden"
                        placeholder="Alıntıyı buraya yazın..."
                        rows={2}
                      />
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Sayfa</span>
                           <input 
                             type="number" 
                             value={quote.page || ''}
                             onChange={e => updateQuote(quote.id, 'page', parseInt(e.target.value))}
                             className="w-16 text-xs p-1.5 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-white/30 transition-all"
                             placeholder="No"
                           />
                         </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeQuote(quote.id)}
                      className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg"
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

      {/* Footer */}
      <div className="p-8 border-t border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-6">
        {initialData && onDelete ? (
          <div className="relative">
            {showConfirmDelete ? (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 transition-all">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest whitespace-nowrap">Emin misiniz?</span>
                <button 
                  onClick={() => onDelete(formData.id)}
                  className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Evet, Sil
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest px-4"
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-2 text-white/20 hover:text-red-400 hover:bg-red-500/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-500/10"
              >
                <Trash2 size={16} />
                Kitabı Sil
              </button>
            )}
          </div>
        ) : <div />}

        <div className="flex gap-4 w-full md:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 md:flex-none px-8 py-4 rounded-xl border border-white/10 text-white/60 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="flex-1 md:flex-none px-10 py-4 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Kaydet
          </button>
        </div>
      </div>
      
      {/* Mobile Center Polish Overlay (Safe zone) */}
      <div className="md:hidden h-4 w-full bg-transparent"></div>
    </div>
  );
};

export default BookForm;
