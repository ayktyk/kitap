import React from 'react';
import { BookFilter } from '../types';
import { X, Library, Star, LogOut, Clock, Calendar, Bookmark } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  userEmail?: string;
  activeFilter: BookFilter;
  onFilterChange: (filter: BookFilter) => void;
  onNavigateHome: () => void;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose, onSignOut, userEmail, activeFilter, onFilterChange, onNavigateHome }) => {
  const menuItems: Array<{ id: BookFilter; label: string; icon: React.ReactNode }> = [
    { id: 'ALL', label: 'Kitaplığım', icon: <Library size={18} /> },
    { id: 'FAVORITES', label: 'Favorilerim', icon: <Star size={18} className="text-blue-400 fill-blue-400/20" /> },
    { id: 'READING', label: 'Şu An Okunanlar', icon: <Clock size={18} /> },
    { id: 'WANT_TO_READ', label: 'Okunacaklar', icon: <Bookmark size={18} /> },
    { id: 'READ', label: 'Bitirdiklerim', icon: <Calendar size={18} /> },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 bottom-0 w-[280px] bg-zinc-900 border-r border-white/5 z-[70] transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl">
                <Library size={20} className="text-white" />
              </div>
              <span className="font-serif font-bold text-white text-lg">Menü</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 bg-white/[0.01]">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center text-white/40 font-black text-xs">
                {userEmail?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Kütüphaneci</p>
                <p className="text-xs font-bold text-white/80 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onFilterChange(item.id);
                  onNavigateHome();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeFilter === item.id 
                    ? 'bg-white/10 text-white border border-white/10 shadow-lg' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <span className={activeFilter === item.id ? 'text-white' : 'text-white/30'}>{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 space-y-2">
             <button
               onClick={onSignOut}
               className="w-full flex items-center gap-3 px-4 py-3 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-black uppercase tracking-widest rounded-xl"
             >
               <LogOut size={18} />
               Çıkış Yap
             </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
