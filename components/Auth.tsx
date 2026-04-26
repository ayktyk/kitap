import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, UserPlus, LogIn, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Logo from './Logo';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthProps {
  initialMode?: AuthMode;
  onPasswordReset?: () => void;
}

const Auth: React.FC<AuthProps> = ({ initialMode = 'login', onPasswordReset }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const switchMode = (next: AuthMode) => {
    resetMessages();
    setPassword('');
    setConfirmPassword('');
    setMode(next);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Doğrulama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setInfo(
          'Şifre sıfırlama bağlantısı e-postanıza gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.'
        );
      } else if (mode === 'reset') {
        if (password.length < 6) {
          throw new Error('Şifre en az 6 karakter olmalıdır.');
        }
        if (password !== confirmPassword) {
          throw new Error('Şifreler eşleşmiyor.');
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setInfo('Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
        await supabase.auth.signOut();
        if (onPasswordReset) {
          onPasswordReset();
        }
        setPassword('');
        setConfirmPassword('');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: {
      heading: 'Tekrar Hoş Geldiniz',
      sub: 'Favori kitaplarınız sizi bekliyor.',
    },
    register: {
      heading: 'Yeni Hesap Oluştur',
      sub: 'Kitaplığınızı buluta taşımaya hazır mısınız?',
    },
    forgot: {
      heading: 'Şifremi Unuttum',
      sub: 'E-posta adresinizi girin, sıfırlama bağlantısı gönderelim.',
    },
    reset: {
      heading: 'Yeni Şifre Belirle',
      sub: 'Yeni şifrenizi girin ve onaylayın.',
    },
  };

  const submitLabel: Record<AuthMode, { icon: React.ReactNode; text: string }> = {
    login: { icon: <LogIn size={20} />, text: 'Giriş Yap' },
    register: { icon: <UserPlus size={20} />, text: 'Kayıt Ol' },
    forgot: { icon: <KeyRound size={20} />, text: 'Sıfırlama Bağlantısı Gönder' },
    reset: { icon: <KeyRound size={20} />, text: 'Şifreyi Güncelle' },
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-md p-8 glass rounded-2xl border border-white/10 shadow-2xl relative z-10 backdrop-blur-3xl bg-black/40">
        <div className="flex justify-center mb-8">
          <Logo size={88} className="rounded-2xl shadow-2xl" />
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif font-extrabold text-white mb-2 tracking-tight">
            {titles[mode].heading}
          </h2>
          <p className="text-white/60 text-sm font-medium tracking-wide">
            {titles[mode].sub}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl animate-fade-in flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        {info && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm rounded-xl animate-fade-in flex items-start gap-3">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {mode !== 'reset' && (
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
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div className="group">
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-1.5 ml-1 transition-colors group-focus-within:text-white/70">
                {mode === 'reset' ? 'YENİ ŞİFRE' : 'ŞİFRE'}
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
                  minLength={mode === 'reset' || mode === 'register' ? 6 : undefined}
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <div className="group">
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-1.5 ml-1 transition-colors group-focus-within:text-white/70">
                YENİ ŞİFRE (TEKRAR)
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all hover:bg-white/10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-white/50 hover:text-white text-xs font-semibold transition-colors"
              >
                Şifremi unuttum
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/10 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                {submitLabel[mode].icon}
                {submitLabel[mode].text}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          {mode === 'login' && (
            <button
              onClick={() => switchMode('register')}
              className="text-white/50 hover:text-white text-sm font-semibold transition-colors decoration-white/20 hover:decoration-white underline-offset-4"
            >
              Yeni bir kütüphane oluşturmak ister misiniz? Kayıt Ol
            </button>
          )}
          {mode === 'register' && (
            <button
              onClick={() => switchMode('login')}
              className="text-white/50 hover:text-white text-sm font-semibold transition-colors decoration-white/20 hover:decoration-white underline-offset-4"
            >
              Zaten bir hesabınız var mı? Giriş Yap
            </button>
          )}
          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              Giriş ekranına dön
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
