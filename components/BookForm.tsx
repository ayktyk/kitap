import React, { useState, useEffect } from 'react';
import { Book, Quote, BookAIResponse } from '../types';
import { Sparkles, Save, X, Plus, Trash2, Calendar, MapPin, BookOpen, ShoppingBag, Loader2 } from 'lucide-react';
import RatingStars from './RatingStars';
import { suggestBookDetails } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  initialData?: Book | null;
  onSave: (book: Book) => void;
  onCancel: () => void;
}

const BookForm: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Book>({
    id: initialData?.id || uuidv4(),
    title: initialData?.title || '',
    author: initialData?.author || '',
    rating: initialData?.rating || 0,
    pageCount: initialData?.pageCount || 0,
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    startLocation: initialData?.startLocation || '',
    endLocation: initialData?.endLocation || '',
    purchaseDate: initialData?.purchaseDate || '',
    purchaseLocation: initialData?.purchaseLocation || '',
    thoughts: initialData?.thoughts || '',
    quotes: initialData?.quotes || [],
    createdAt: initialData?.createdAt || Date.now(),
  });

  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);

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
        thoughts: prev.thoughts ? prev.thoughts : (result.description || ''),
        quotes: result.suggestedQuotes 
          ? [...prev.quotes, ...result.suggestedQuotes.map(q => ({ id: uuidv4(), text: q, page: 0 }))] 
          : prev.quotes
      }));
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

  return (
    <div className="bg-white rounded-xl shadow-xl max-w-4xl mx-auto overflow-hidden flex flex-col h-full md:h-auto border border-gray-100">
      {/* Header */}
      <div className="bg-ink text-white p-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold">{initialData ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}</h2>
          <p className="text-gray-400 text-sm mt-1">Kütüphanenizi zenginleştirin</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto no-scrollbar">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === idx 
                ? 'border-accent text-accent bg-accent/5' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
        
        {/* Tab 0: General Info */}
        {activeTab === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Kitap Adı</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    placeholder="Örn: Suç ve Ceza"
                  />
                  <button 
                    onClick={handleAiFill}
                    disabled={loadingAi || !formData.title}
                    className="absolute right-2 top-2 p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50"
                    title="Yapay Zeka ile Doldur"
                  >
                    {loadingAi ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Kitap adını yazıp sihirli değneğe tıklayarak bilgileri otomatik doldurabilirsiniz.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Yazar</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                  placeholder="Örn: Fyodor Dostoyevski"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sayfa Sayısı</label>
                <input
                  type="number"
                  value={formData.pageCount || ''}
                  onChange={e => setFormData({ ...formData, pageCount: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Puanım</label>
                <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                  <RatingStars rating={formData.rating} onChange={(r) => setFormData({ ...formData, rating: r })} size={24} />
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
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-4">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div> Başlangıç
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-green-700 uppercase mb-1">Tarih</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 bg-white text-gray-900 border border-green-200 rounded-md focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-700 uppercase mb-1">Yer / Konum</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-2.5 top-3 text-green-400" />
                    <input
                      type="text"
                      value={formData.startLocation}
                      onChange={e => setFormData({ ...formData, startLocation: e.target.value })}
                      className="w-full pl-8 p-2 bg-white text-gray-900 border border-green-200 rounded-md focus:outline-none focus:border-green-500 text-sm"
                      placeholder="Örn: İstanbul, Ev"
                    />
                  </div>
                </div>
              </div>

              {/* End */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Bitiş
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Tarih</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 bg-white text-gray-900 border border-blue-200 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Yer / Konum</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-2.5 top-3 text-blue-400" />
                    <input
                      type="text"
                      value={formData.endLocation}
                      onChange={e => setFormData({ ...formData, endLocation: e.target.value })}
                      className="w-full pl-8 p-2 bg-white text-gray-900 border border-blue-200 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                      placeholder="Örn: İzmir, Tatil"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Purchase Info */}
        {activeTab === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Satın Alma Tarihi</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Satın Alınan Yer</label>
                <div className="relative">
                  <ShoppingBag size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.purchaseLocation}
                    onChange={e => setFormData({ ...formData, purchaseLocation: e.target.value })}
                    className="w-full pl-10 p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    placeholder="Örn: D&R, Amazon, Sahaf"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Content (Thoughts & Quotes) */}
        {activeTab === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Thoughts */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex justify-between">
                Kitap Hakkındaki Düşüncelerim
              </label>
              <textarea
                value={formData.thoughts}
                onChange={e => setFormData({ ...formData, thoughts: e.target.value })}
                className="w-full p-4 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none h-40 resize-none font-serif leading-relaxed"
                placeholder="Bu kitap bana neler hissettirdi? En sevdiğim bölüm neydi?"
              />
            </div>

            {/* Quotes */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-lg font-serif font-bold text-gray-800">Alıntılar</label>
                <button
                  onClick={addQuote}
                  className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  <Plus size={16} /> Yeni Alıntı Ekle
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.quotes.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                    Henüz alıntı eklenmemiş.
                  </div>
                )}
                {formData.quotes.map((quote) => (
                  <div key={quote.id} className="flex gap-3 items-start bg-white p-4 rounded-lg border border-gray-200 shadow-sm group">
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={quote.text}
                        onChange={e => updateQuote(quote.id, 'text', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900 font-serif italic resize-none placeholder-gray-400"
                        placeholder="Alıntıyı buraya yazın..."
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-gray-400">Sayfa:</span>
                         <input 
                           type="number" 
                           value={quote.page || ''}
                           onChange={e => updateQuote(quote.id, 'page', parseInt(e.target.value))}
                           className="w-20 text-xs p-1 bg-white border border-gray-200 rounded"
                           placeholder="No"
                         />
                      </div>
                    </div>
                    <button 
                      onClick={() => removeQuote(quote.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
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
      <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
        >
          İptal
        </button>
        <button
          onClick={() => onSave(formData)}
          className="px-6 py-2.5 rounded-lg bg-ink text-white font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Save size={18} />
          Kaydet
        </button>
      </div>
    </div>
  );
};

export default BookForm;