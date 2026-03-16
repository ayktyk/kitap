import React, { useState } from 'react';
import { Book } from '../types';
import { ArrowLeft, Calendar, MapPin, Quote, Clock, BookOpen, ShoppingBag, BrainCircuit } from 'lucide-react';
import RatingStars from './RatingStars';
import { analyzeThoughts } from '../services/geminiService';

interface Props {
  book: Book;
  onBack: () => void;
  onEdit: () => void;
}

const BookDetails: React.FC<Props> = ({ book, onBack, onEdit }) => {
  const [aiComment, setAiComment] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const comment = await analyzeThoughts(book.thoughts, book.title);
    setAiComment(comment);
    setAnalyzing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Belirtilmedi';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="glass min-h-[80vh] rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl animate-fade-in-up">
      {/* Top Banner */}
      <div className="h-40 bg-white/5 relative border-b border-white/5 backdrop-blur-3xl overflow-hidden">
        {/* Animated Accent Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.08] to-white/[0.02] animate-pulse-slow"></div>
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-white/50 hover:text-white transition-all z-10 font-bold text-xs uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md"
        >
          <ArrowLeft size={16} />
          <span>Geri Dön</span>
        </button>
        <button
           onClick={onEdit}
           className="absolute top-8 right-8 px-6 py-2 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-lg z-10"
        >
          Düzenle
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pb-16">
        {/* Header Info */}
        <div className="relative -mt-20 mb-12 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div 
            className="w-48 h-72 md:w-40 md:h-60 bg-white/5 rounded-3xl shadow-2xl shrink-0 flex items-center justify-center bg-cover bg-center border-2 border-white/20 transform hover:scale-105 transition-transform duration-500 z-10" 
            style={{ backgroundImage: `url(${book.coverUrl || `https://picsum.photos/seed/${book.id}/300/450`})` }}
          >
            {!book.coverUrl && <BookOpen className="text-white/10" size={50} />}
          </div>
          
          <div className="pt-2 md:pt-24 flex-1 w-full">
            <h1 className="text-4xl md:text-5xl font-serif font-black text-white mb-4 tracking-tighter leading-tight">{book.title}</h1>
            <p className="text-xl text-white/50 mb-6 font-medium">{book.author}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-[0.2em] border shadow-lg ${
                  book.status === 'READING' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  book.status === 'WANT_TO_READ' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-white/5 text-white/60 border-white/10'
                }`}>
                  {book.status === 'READING' ? 'OKUYORUM' :
                   book.status === 'WANT_TO_READ' ? 'OKUNACAK' :
                   book.status === 'READ' ? 'OKUNDU' : 'YARIM'}
                </span>
                {book.genre && (
                  <span className="px-4 py-1.5 bg-white/5 text-white/40 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    {book.genre}
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto md:ml-4">
                  <RatingStars rating={book.rating} readOnly size={20} />
                </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          
          {/* Main Content (Left 2 cols) */}
          <div className="md:col-span-2 space-y-12">
            {/* Journey Visualizer */}
            <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/5 shadow-inner">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8">Okuma Yolculuğu</h3>
              <div className="relative flex justify-between items-center px-4">
                {/* Line */}
                <div className="absolute left-10 right-10 top-1/2 h-px bg-white/5 -z-0"></div>
                
                {/* Start Point */}
                <div className="z-10 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center gap-2 min-w-[120px] backdrop-blur-md">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 mb-1 border border-green-500/20">
                    <MapPin size={18} />
                  </div>
                  <span className="text-xs font-bold text-white/90">{book.startLocation || '---'}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{formatDate(book.startDate)}</span>
                </div>

                {/* Duration/Center */}
                <div className="z-10 bg-white/10 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-xl animate-pulse">
                   <Clock size={16} className="text-white/40" />
                </div>

                {/* End Point */}
                <div className="z-10 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center gap-2 min-w-[120px] backdrop-blur-md">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-1 border border-blue-500/20">
                    <MapPin size={18} />
                  </div>
                  <span className="text-xs font-bold text-white/90">{book.endLocation || '---'}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{formatDate(book.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Thoughts */}
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-serif font-bold text-white">Düşüncelerim</h3>
                 {book.thoughts && !aiComment && (
                   <button 
                     onClick={handleAnalyze} 
                     disabled={analyzing}
                     className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-white/40 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-full border border-white/5"
                   >
                     <BrainCircuit size={14} /> 
                     {analyzing ? 'Analiz ediliyor...' : 'Yapay Zeka Yorumlasın'}
                   </button>
                 )}
               </div>
               
               <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 font-serif leading-relaxed text-white/80 shadow-inner whitespace-pre-wrap italic">
                 {book.thoughts || <span className="text-white/20 italic font-sans text-sm">Henüz bir düşünce tohumu serpilmemiş.</span>}
               </div>

               {aiComment && (
                 <div className="mt-8 bg-gradient-to-r from-white/[0.05] to-transparent p-6 rounded-3xl border-l-[6px] border-white/20 animate-in fade-in slide-in-from-top-4 duration-700">
                   <div className="flex items-center gap-3 text-white/40 font-black text-[10px] uppercase tracking-[0.25em] mb-3">
                     <BrainCircuit size={16} className="text-white/60" />
                     <span>AI Kütüphaneci Fısıltısı</span>
                   </div>
                   <p className="text-base text-white/70 italic leading-relaxed font-serif">"{aiComment}"</p>
                 </div>
               )}
            </div>

            {/* Quotes */}
            <div className="space-y-8">
              <h3 className="text-2xl font-serif font-bold text-white mb-6">Altını Çizdiklerim <span className="text-white/20 ml-2">({book.quotes.length})</span></h3>
              <div className="grid gap-6">
                {book.quotes.map((quote) => (
                  <div key={quote.id} className="relative bg-white/5 p-8 rounded-3xl border border-white/5 shadow-xl hover:bg-white/10 transition-all duration-500 group">
                    <Quote className="absolute -top-4 -left-2 text-white/5 opacity-40 transform -rotate-12" size={80} />
                    <p className="relative text-white/90 font-serif italic text-lg z-10 pl-4 leading-relaxed tracking-tight group-hover:translate-x-1 transition-transform">"{quote.text}"</p>
                    {quote.page && quote.page > 0 && (
                      <div className="text-right mt-6 text-[10px] font-black uppercase tracking-widest text-white/20">— Sayfa {quote.page}</div>
                    )}
                  </div>
                ))}
                {book.quotes.length === 0 && (
                  <p className="text-white/20 text-sm italic font-serif py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">Satırlar henüz sessiz bekliyor...</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar (Right col) */}
          <div className="space-y-8">
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-md">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8">Edinme Detayları</h4>
              <ul className="space-y-8">
                <li className="flex items-start gap-5 group">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-all">
                     <Calendar size={18} className="text-white/40" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5">Satın Alma</span>
                    <span className="text-sm font-bold text-white/80">{formatDate(book.purchaseDate)}</span>
                  </div>
                </li>
                <li className="flex items-start gap-5 group">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-all">
                     <ShoppingBag size={18} className="text-white/40" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5">Edinme Yeri</span>
                    <span className="text-sm font-bold text-white/80">{book.purchaseLocation || 'Bilinmiyor'}</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-3xl border border-white/5">
                <p className="text-xs text-white/30 italic leading-relaxed font-serif">
                   "Kitaplar, insanlığın tek taşınabilir sihridir."
                </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BookDetails;