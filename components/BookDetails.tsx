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
    <div className="bg-white min-h-[80vh] rounded-xl shadow-lg border border-gray-100 overflow-hidden relative">
      {/* Top Banner */}
      <div className="h-32 bg-ink pattern-dots relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors z-10"
        >
          <ArrowLeft size={20} />
          <span>Listeye Dön</span>
        </button>
        <button
           onClick={onEdit}
           className="absolute top-6 right-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm backdrop-blur-sm transition-colors"
        >
          Düzenle
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* Header Info */}
        <div className="relative -mt-16 mb-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-32 h-48 bg-gray-200 rounded-lg shadow-xl shrink-0 flex items-center justify-center bg-cover bg-center border-4 border-white" style={{ backgroundImage: `url('https://picsum.photos/seed/${book.id}/200/300')` }}>
            {!book.coverUrl && <BookOpen className="text-gray-400" size={40} />}
          </div>
          
          <div className="pt-16 md:pt-20 flex-1 w-full">
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{book.title}</h1>
            <p className="text-xl text-gray-600 mb-4">{book.author}</p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
               <RatingStars rating={book.rating} readOnly size={20} />
               <span className="flex items-center gap-1"><BookOpen size={16} /> {book.pageCount} sayfa</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Content (Left 2 cols) */}
          <div className="md:col-span-2 space-y-8">
            {/* Journey Visualizer */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Okuma Yolculuğu</h3>
              <div className="relative flex justify-between items-center">
                {/* Line */}
                <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-gray-200 -z-0"></div>
                
                {/* Start Point */}
                <div className="z-10 bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center gap-1 min-w-[100px]">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-1">
                    <MapPin size={16} />
                  </div>
                  <span className="text-xs font-bold text-gray-800">{book.startLocation || '---'}</span>
                  <span className="text-[10px] text-gray-500">{formatDate(book.startDate)}</span>
                </div>

                {/* Duration/Center */}
                <div className="z-10 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                   <Clock size={14} className="text-gray-400" />
                </div>

                {/* End Point */}
                <div className="z-10 bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center gap-1 min-w-[100px]">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                    <MapPin size={16} />
                  </div>
                  <span className="text-xs font-bold text-gray-800">{book.endLocation || '---'}</span>
                  <span className="text-[10px] text-gray-500">{formatDate(book.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Thoughts */}
            <div>
               <div className="flex justify-between items-end mb-4">
                 <h3 className="text-lg font-serif font-bold text-gray-900">Düşüncelerim</h3>
                 {book.thoughts && !aiComment && (
                   <button 
                     onClick={handleAnalyze} 
                     disabled={analyzing}
                     className="text-xs flex items-center gap-1 text-accent hover:text-accent-hover disabled:opacity-50"
                   >
                     <BrainCircuit size={14} /> 
                     {analyzing ? 'Analiz ediliyor...' : 'Yapay Zeka Yorumlasın'}
                   </button>
                 )}
               </div>
               
               <div className="bg-white p-6 rounded-lg border border-gray-100 font-serif leading-relaxed text-gray-900 shadow-sm whitespace-pre-wrap">
                 {book.thoughts || <span className="text-gray-400 italic">Henüz bir düşünce girilmedi.</span>}
               </div>

               {aiComment && (
                 <div className="mt-4 bg-gradient-to-r from-accent/5 to-transparent p-4 rounded-lg border-l-4 border-accent animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase mb-1">
                     <BrainCircuit size={14} />
                     <span>AI Kütüphaneci Yorumu</span>
                   </div>
                   <p className="text-sm text-gray-700 italic">{aiComment}</p>
                 </div>
               )}
            </div>

            {/* Quotes */}
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">Alıntılar ({book.quotes.length})</h3>
              <div className="grid gap-4">
                {book.quotes.map((quote) => (
                  <div key={quote.id} className="relative bg-white p-5 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <Quote className="absolute top-4 left-4 text-gray-100 fill-gray-100" size={40} />
                    <p className="relative text-gray-800 font-serif italic z-10 pl-8">"{quote.text}"</p>
                    {quote.page && quote.page > 0 && (
                      <div className="text-right mt-2 text-xs text-gray-400 font-medium">— Sayfa {quote.page}</div>
                    )}
                  </div>
                ))}
                {book.quotes.length === 0 && (
                  <p className="text-gray-400 text-sm">Hiç alıntı yok.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar (Right col) */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Edinme Bilgileri</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gray-100 rounded-md">
                     <Calendar size={14} className="text-gray-600" />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Satın Alma Tarihi</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(book.purchaseDate)}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gray-100 rounded-md">
                     <ShoppingBag size={14} className="text-gray-600" />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Satın Alınan Yer</span>
                    <span className="text-sm font-medium text-gray-900">{book.purchaseLocation || 'Belirtilmedi'}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BookDetails;