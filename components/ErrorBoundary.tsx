import React from 'react';
import * as libraryService from '../services/libraryService';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  exporting: boolean;
  exportDone: boolean;
}

// Render sırasındaki beklenmedik hataları yakalar. Beyaz ekran yerine Türkçe bir
// kurtarma ekranı gösterir ve kullanıcıya hatadan önce verilerini dışa aktarma
// imkânı verir. Stil tema değişkenlerine bağlı DEĞİL — tema sağlayıcı çökse bile
// güvenle render edilir.
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '', exporting: false, exportDone: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('Uygulama hatası (ErrorBoundary):', error);
  }

  handleExport = async () => {
    this.setState({ exporting: true });
    try {
      const bundle = await libraryService.exportBooks();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kitapligim-kurtarma-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.setState({ exporting: false, exportDone: true });
    } catch (err) {
      console.error('Kurtarma yedeği alınamadı:', err);
      this.setState({ exporting: false });
      alert('Yedek alınamadı: ' + (err instanceof Error ? err.message : 'bilinmeyen hata'));
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#f5f5f5',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>
            Bir şeyler ters gitti
          </h1>
          <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '8px', lineHeight: 1.5 }}>
            Uygulama beklenmedik bir hatayla karşılaştı. Kitaplarınız cihazınızda güvende — önce
            bir yedek alıp sonra sayfayı yenileyin.
          </p>
          <p
            style={{
              opacity: 0.4,
              fontSize: '12px',
              marginBottom: '20px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.message}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={this.handleExport}
              disabled={this.state.exporting}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {this.state.exporting
                ? 'Yedek alınıyor…'
                : this.state.exportDone
                  ? 'Yedek indirildi ✓ — tekrar al'
                  : 'Verilerini Dışa Aktar'}
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#f5f5f5',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
