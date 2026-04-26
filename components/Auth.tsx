import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import Logo from './Logo';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Doğrulama e-postası gönderildi! Lütfen kontrol edin.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-md p-8 glass rounded-2xl border border-white/10 shadow-2xl relative z-10 backdrop-blur-3xl bg-black/40">
        <div className="flex justify-center mb-8">
          <Logo size={88} className="rounded-2xl shadow-2xl" />
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif font-extrabold text-white mb-2 tracking-tight">
            {isRegistering ? 'Yeni Hesap Oluştur' : 'Tekrar Hoş Geldiniz'}
          </h2>
          <p className="text-white/60 text-sm font-medium tracking-wide">
            {isRegistering 
              ? 'Kitaplığınızı buluta taşımaya hazır mısınız?' 
              : 'Favori kitaplarınız sizi bekliyor.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl animate-fade-in flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
             {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="group">
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-1.5 ml-1 transition-colors group-focus-within:text-white/70">
              E-POSTA ADRESİ
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all hover:bg-white/10"
                placeholder="ornek@email.com"
                required
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-1.5 ml-1 transition-colors group-focus-within:text-white/70">
              ŞİFRE
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all hover:bg-white/10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/10 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
                {isRegistering ? 'Kayıt Ol' : 'Giriş Yap'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-white/50 hover:text-white text-sm font-semibold transition-colors decoration-white/20 hover:decoration-white underline-offset-4"
          >
            {isRegistering 
              ? 'Zaten bir hesabınız var mı? Giriş Yap' 
              : 'Yeni bir kütüphane oluşturmak ister misiniz? Kayıt Ol'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
