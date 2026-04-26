# Kitaplığım — Tasarım Spesifikasyonu (5 Tema)

> **Bu doküman:** Mevcut Kitaplığım uygulamasının (`React 19 + TypeScript + Vite + Tailwind v4 + Supabase + Capacitor`) tema/dizayn katmanını yeniden inşa etmek için hazırlanmış 5 farklı premium tema spesifikasyonudur. Veri modeli (`Book`, `Quote`, `BookStatus`), Supabase entegrasyonu, ISBN tarama, lokasyon autocomplete ve Capacitor uyumluluğu **aynen korunmalıdır** — değişen yalnızca görsel + etkileşim katmanıdır.
>
> **Hedef:** Kullanıcı uygulamayı açtığında "kitap eklemek için sabırsızlanan" bir hisse kapılmalı. Hatıra defteri × premium edebi yayın × kişisel müze.
>
> **Platform önceliği:** Mobile-first (iPhone). Tüm tasarımlar 390×844 viewport'unda doğrulandı. Desktop'ta `max-w` + ortalanmış container + 3 sütun grid'e açılır.
>
> **Ortak prensipler:**
> - Tüm temalar **açık moddur** (krem/kâğıt hissi). Karanlık mod sonradan eklenecek.
> - **Gerçek imaj asset'i yok** — kapak görselleri yokken `MockCover` benzeri stilize placeholder kullanın (kitabın stiline göre `style: 'classic' | 'leather' | 'minimal' | 'paper' | 'vintage' | 'tropical'`).
> - **10 yıldızlı puanlama yıldız değil** — her tema kendi puan göstergesini kullanır (kupalar / mürekkep noktaları / çubuk grafiği / yapraklar / yıldızlar).
> - **5 ekran/tema:** Auth · LIST · DETAILS · FORM · DASHBOARD (Stats). Sidebar sadeleştirildi → Dashboard tab oldu.
> - **Form 4-tab yerine tek scroll** akış (Müzehher hariç — orada "fasıl" tab metaforu kasten korundu).
> - **Yıllık heatmap, ilerleme çubuğu, harita yolculuğu, streak, koleksiyon** her temaya farklı görsel dille serpildi.
>
> **Türkçe arayüz korunur.** Tüm mikrokopi Türkçe, hatta her tema kendi terminolojisini kullanır ("Kitap" yerine "cilt", "Ekle" yerine "kaydet" gibi).

---

## Ortak Veri Modeli (Değişmeden Kalır)

```ts
type BookStatus = 'READING' | 'WANT_TO_READ' | 'READ' | 'ABANDONED';

interface Quote { id: string; text: string; page?: number; }

interface Book {
  id: string;
  title: string; author: string; coverUrl?: string;
  rating: number;            // 1–10
  pageCount: number;
  currentPage?: number;      // YENİ: ilerleme çubuğu için
  genre?: string;
  status: BookStatus; isFavorite?: boolean;
  startDate?: string; endDate?: string;
  startLocation?: string; endLocation?: string;
  startCoords?: [number, number];  // YENİ: harita için (lat,lng)
  endCoords?: [number, number];
  purchaseDate?: string; purchaseLocation?: string;
  thoughts?: string; quotes: Quote[];
  createdAt: number;
}
```

**YENİ alanlar:** `currentPage`, `startCoords`, `endCoords`. Migration: nullable kolonlar olarak Supabase'e eklenir.

---

## Ortak Bileşen Katalogu

Her tema kendi token'larıyla aşağıdaki bileşenleri uygular. Bileşen adları sabit:

| Bileşen | Sorumluluk |
|---|---|
| `<Page>` | Tema arka planı + tipografi root |
| `<Cover w h book>` | Kitap kapağı (gerçek `coverUrl` veya stilize placeholder) |
| `<TopBar>` | Üst nav (geri/menü + başlık/etiket + aksiyon) |
| `<TabBar>` | Alt navigasyon (Kitaplık · Ekle · Dashboard) |
| `<BookCard book variant>` | Liste kartı, varyantlar tema-spesifik |
| `<CurrentlyReading book>` | Aktif kitap + ilerleme |
| `<RatingDisplay value max=10>` | 10/10 puanı tema-spesifik gösterir |
| `<StatusBadge status>` | Renkli durum rozeti |
| `<JourneyTimeline book>` | Başlangıç → Bitiş yolculuğu (harita / şerit) |
| `<PullQuote text page>` | Editorial büyük alıntı |
| `<HeatmapYear data>` | 53 hafta × 7 gün okuma takvimi |
| `<StatTile label value>` | Dashboard istatistik kutucuğu |
| `<StreakBadge days>` | Okuma serisi rozeti |
| `<ISBNScanner>` | Barkod tarama modal'ı (mevcut zxing entegrasyonu) |
| `<LocationInput value onChange>` | Önceki girdilerden autocomplete |

---

# ① Müzehher — Klasik Kütüphane

> **Konsept:** Eski özel kütüphane. Deri ciltler, ahşap raf, altın varak, mum ışığı. Kitap bir "cilt", ekleme "kayıt", form "fasıl" sekmelerinden oluşur. Sıcak, mahremiyetli, ağır.

## Renk Tokenları
```css
--mz-bg:        #ece1cd;   /* eskimiş kâğıt */
--mz-paper:     #f4ead6;   /* daha açık kâğıt */
--mz-deep:      #d8c39c;   /* gölgeli */
--mz-ink:       #2a1d10;   /* koyu kahve mürekkep */
--mz-ink-soft:  #4a3520;
--mz-ink-mute:  #7a6647;
--mz-burgundy:  #6b1f24;   /* deri kapak kırmızısı */
--mz-gold:      #a87a3a;   /* altın varak */
--mz-gold-lite: #d4a861;
--mz-emerald:   #2f4a3a;   /* deri yeşili (okunuyor) */
--mz-rule:      rgba(42,29,16,0.22);
```

## Tipografi
- **Display:** `Cormorant Garamond` 500–700, italic vurgular
- **Serif gövde:** `EB Garamond` 400/500
- **Caps mikrokopi:** `IBM Plex Mono` 9–10px, `letter-spacing: 0.34em`
- **El yazısı vurgular (kişisel notlar):** `Caveat` 18–22px

## Şekil & Doku
- Köşeler küçük: 2–8px (cilt kapağı hissi). Pillerl `rounded-full`.
- Tüm kartlarda **kâğıt grain** overlay (3px noise SVG, %5 opacity).
- **Altın çift çizgi** ayraçlar (1px solid + 1px gap + 0.5px solid).
- Gölge: yumuşak deri kabartma — `inset 0 0 0 1px rgba(168,122,58,0.3), 0 8px 20px rgba(42,29,16,0.12)`.

## Ekran Notları

### Auth — "Kütüphaneye Davet"
- Üstte ahşap çerçeveli Library mührü (altın çift halka + serif "M" monogramı).
- Başlık: *"Kütüphaneye Hoş Geldiniz"* (Cormorant italic, 42px).
- Alt başlık: *"ciltleriniz sizi bekliyor"* (Caveat, eğik, kül rengi).
- Input'lar **alttan ince çizgili** (border-bottom only), sol ikonsuz, label caps mono üstte.
- Birincil buton: koyu burgundy + altın 1px iç çerçeve + `Cormorant italic` "kütüphaneye gir".

### LIST — "Ahşap Raf"
- Üst bar: sol Library ikonu + başlık `Kitaplığım` (Cormorant 36 italic) + sağ büyük altın "+" (kayıt ekle).
- Aktif filtre: alt çizgi altın (1.5px), pasif: `ink-mute`.
- **Şu an okunan kitap kartı**: yatay, kapak solda (60×90), sağda metin + altın çubuk progress bar + caps "S. 312 / 724".
- **Liste:** her kitap **ahşap raf rafı satırı** olarak — sol mini cilt sırtı (28×80, dikey yazı), sağda başlık-yazar-tür-puan. Hover'da raf hafif sarsılır (`translateY(-1px)`).
- Boş durum: dev altın anahtar deliği SVG + *"Bu raf henüz boş."*

### DETAILS — "Hatıra Sayfası"
- Üstte tek sayfa kitap açılışı: sol kapak (140×210, 3D perspektif `rotateY(-4deg)`), sağ başlık + yazar + 10/10 kupaları.
- **Fasıl 1 — Düşüncelerim**: dev "« »" altın tırnak içinde EB Garamond italic 20px, sol tırnak `font-size: 88px` dekoratif.
- **Fasıl 2 — Altını Çizdiklerim**: her alıntı, ince altın çift çizgi içinde, sağ alt mono *"— S. 217"*.
- **Fasıl 3 — Yolculuk**: yatay altın iplik üzerinde 2 nokta (başlangıç/bitiş), Caveat el yazısı şehir adları altında.
- **Fasıl 4 — Edinme**: en altta küçük caps şerit *"D&R KADIKÖY · 14 Mart 2026"*.

### FORM — "Yeni Fasıl" (4 tab korundu, ama görsel olarak fasıl başlıkları gibi)
- Üstte mühür: yıldız toggle favori + serif "Yeni Cilt".
- Tab'lar **roma rakamlı**: I. Genel · II. Yolculuk · III. Edinme · IV. Düşünceler.
- ISBN bloğu: ahşap doku arka plan + altın çerçeveli "TARA" butonu (kamera ikonu).
- Puan: 10 küçük altın **kupa** ikonu yanyana (5 dolu = 5/10).

### DASHBOARD — "Yıllığım"
- Büyük serif italic *"Bu yıl"* + dev rakam **17** (Cormorant 92px).
- Heatmap: koyu kahve hücreler, başlık caps "OKUDUĞUM GÜNLER".
- 4 stat kutusu: Sayfa · Streak · Yazar · Şehir (her biri ahşap çerçeveli).
- Alt kısım: *"En Çok Okuduğum Yazar"* + Caveat el yazısı **Tanpınar** + 3 cilt sırtı thumbnail.

---

# ② Parşömen — Eski Yayınevi / Gazete

> **Konsept:** 1950'ler İstanbul yayınevi. Kurşun mürekkep, ofset baskı, kuruyemiş kâğıdı, daktilo. Editoryal sade, kutu içi, gri-tonlu fotoğraflar. Sakin ve okunaklı.

## Renk Tokenları
```css
--ps-paper:     #f1ebe1;   /* gazete kâğıdı */
--ps-paper-2:   #e8e0d0;
--ps-ink:       #1c1a16;   /* siyah mürekkep */
--ps-ink-2:     #38332a;
--ps-ink-mute:  #6e6a5e;
--ps-stain:     #8a4a2a;   /* mürekkep lekesi/vurgu */
--ps-red:       #a13b2a;   /* manşet kırmızısı */
--ps-rule:      rgba(28,26,22,0.55);
```

## Tipografi
- **Display:** `Playfair Display` veya `Newsreader` 600–800, çok dar tracking
- **Gövde serif:** `EB Garamond` 400, 1.55 line-height (gazete sütunu hissi)
- **Daktilo:** `IBM Plex Mono` 11–13px, italic vurgular
- **Caps şerit:** `IBM Plex Mono` 9px, `letter-spacing: 0.4em`, alt-üst çift kural çizgisi

## Şekil & Doku
- **Sıfır rounded** (köşeler keskin) — gazete kutuları gibi.
- **Yatay siyah kural çizgileri** (1.5px) bölümleri ayırır.
- **2-3 sütun grid** desktop'ta gazete metaforu için.
- Halftone noktalar arka planda %3 opacity.
- "Kayıt", "İlan", "Manşet" gibi yayın terminolojisi kullan.

## Ekran Notları

### Auth — "Aboneliğin"
- Üstte ortalanmış **gazete logosu** stilinde "Kitaplığım" (Playfair black 56px, `letter-spacing: -0.03em`).
- Üst alt yatay çift kural çizgisi.
- Tarih şeridi: *"İSTANBUL · CUMARTESİ · 25 NİSAN 2026"* (mono caps).
- Form bir "abonelik kuponu" — kesik kenarlı kutu (`border-dashed` 1.5px).
- Birincil buton: dolgu siyah, beyaz `Playfair italic` "kayıt ol", arkasında halftone leke.

### LIST — "Bu Sayının İçeriği"
- Üst bar: sol "M" monogramı + tarih (mono) + sağ "+ KAYIT" caps butonu (sınırsız siyah border).
- **Manşet** olarak filtre adı: *"Şu an okuduklarım"* (Playfair black 40px, sıkı).
- **Şu an okunan**: tam genişlik baskı kutusu — sol 80×120 kapak, sağda 2 sütun: başlık + tek satır editoryal özet + sayfa progress (siyah çubuk).
- **Liste:** 2 sütun grid, her kitap bir gazete ilanı:
  - Üstte küçük caps "ROMAN · 1972"
  - Başlık Newsreader 22px bold
  - Yazar italik küçük
  - Yatay kural çizgisi
  - 10 mürekkep noktası (puan) + durum mini caps
- Boş durum: tam ortada **dev "—"** + *"Bu hafta yeni kayıt yok."*

### DETAILS — "Edebiyat Sayfası"
- Üstte gazete künyesi: *"M · No. 042 · Bahar 2026"*.
- Manşet: kitap adı (Playfair black 44px), altında yazar + tek satır özet.
- 2 sütunlu gazete layout: **sol sütun** kapak + künye (yıl, sayfa, tür, yer), **sağ sütun** "Düşünceler" (EB Garamond 16px).
- **PULL QUOTE**: tam genişlik, üst-alt çift kural, Playfair italic 28px, ortalı, mürekkep lekesi arka plan.
- Aşağıda *"Altını çizdikleriniz"* başlığı, her alıntı **numara** ile (I. II. III.) + sayfa.
- En altta **küçük gravür stili harita** (siyah ince çizgi) — başlangıç ↔ bitiş şehirlerini birleştiren kavisli rota.

### FORM — "Yeni Kayıt Formu"
- Tek scroll, gazete kuponu hissi.
- Tüm input'lar **alttan tek siyah çizgi** (1px), label mono caps üstte.
- ISBN bloğu: kesik dashed kutu + "TARA" düğmesi sıfır radius dolgu siyah.
- Puan: 10 küçük **kare kutu** (mürekkep dolu/boş) yanyana — gazete oylama hissi.
- Aksiyon çubuğu: alt sticky, sol "VAZGEÇ" (link), sağ dolgu siyah "MATBAAYA YOLLA" (Playfair italic).

### DASHBOARD — "2026 Yıllığı"
- Üstte gazete manşeti: *"YILIN OKUMA RAPORU"* (mono caps).
- Dev rakam **17** (Playfair black 120px) yanında küçük italik *"cilt okundu"*.
- 3 sütun gazete grid: sol heatmap (siyah noktalar, gri grid), orta "EN ÇOK YAZAR" listesi (1. Tanpınar – 4 cilt...), sağ "ŞEHİRLER" (mini gravür harita + nokta listesi).
- Alt: *"Bu yıl en çok altını çizdiğiniz cümle"* + dev pull-quote.
- En altta künye: *"Yayına hazırlayan: Sen"*.

---

# ③ Atlas — Modern Editorial / Galeri

> **Konsept:** Çağdaş sanat dergisi (Apartamento × Cabana × MoMA). Devasa beyaz boşluk, asimetrik grid, oversize tipografi, güçlü hizalama. Kitap bir sergi objesi.

## Renk Tokenları
```css
--at-bg:        #f7f5f0;   /* warm white */
--at-paper:     #ffffff;
--at-ink:       #0e0e0c;
--at-ink-2:     #2a2925;
--at-ink-mute:  #8a877e;
--at-accent:    #c2410c;   /* terracotta vurgu */
--at-accent-2:  #1e3a2f;   /* derin yeşil */
--at-rule:      rgba(14,14,12,0.12);
```

## Tipografi
- **Display devasa:** `Fraunces` opsz>72, weight 400–600, `font-variation-settings: 'opsz' 144`
- **Sans gövde:** `Inter` 400/500
- **Caps numara:** `Inter` 11px, `font-feature-settings: 'tnum'`, `letter-spacing: 0.16em`

## Şekil & Doku
- Sıfır gölge, sıfır gradient. Sadece **hizalama ve boşluk**.
- Köşeler 0 veya çok küçük (4px max).
- **Asimetrik grid** — bazı kartlar 2x büyük, bazıları minik.
- Hover'da tek hareket: 100ms underline veya 1px ink rengi geçişi.

## Ekran Notları

### Auth — "Sergi Girişi"
- Sol üstte küçük *"M / Kitaplığım"* (Inter 13px caps).
- Ortada dev tek harf **"M"** (Fraunces 280px) — küratoryal logo.
- Altında *"Edisyon 2026"* (Inter caps 11px).
- Form sağa hizalı dar sütun (240px), input'lar tek alt çizgi.
- Birincil buton: 56px tam genişlik, Inter 15 medium caps "Giriş", siyah dolgu.

### LIST — "Koleksiyon Görünümü"
- Üst bar minimalist: sol "M" + sağ tek "+" ikonu.
- Başlık dev: *"Kitaplığım"* (Fraunces 96px italic, asimetrik — ekrana hafif taşar).
- Tab'lar: yatay kayan ince underline'lı liste (`Tümü 47 · Okuyorum 3 · Okunacak 12 ...`).
- **Asimetrik grid:** 12-col CSS grid, kitaplar farklı `col-span` ile yerleşir (1 → 4 → 2 → 6 → 3 ...). Her kart:
  - Üstte küçük numara `01 / 47`
  - Kapak (varsa) **kapak ÖNCELİKLİ** — Atlas tema kapak baskın olan tema
  - Altında küçük serif başlık + tek satır mono yazar + tarih
- Boş durum: dev italic Fraunces *"henüz boş."*

### DETAILS — "Sergi Etiketi"
- Üstte tam genişlik kapak (responsive — mobilde h-60vh, desktop'ta sol-yarı).
- **Sergi etiketi** layout: sağda dar sütun
  - Mono `01 / 47`
  - Başlık Fraunces 56 italic
  - Yazar Inter caps 12
  - 10/10 puan = 10 ince çubuk grafiği (3px×24px), dolu/boş
  - Tek paragraf düşünce (Inter 15, 1.6 line-height, max 380px width)
- **Altını çizdikleriniz** bölümü: her alıntı **dev pull-quote** (Fraunces italic 40–56px), arasında 64px boşluk, sayfa numarası mono küçük yan.
- Yolculuk: minimal — sol *"İstanbul · 14 Mart"* → sağ *"İzmir · 28 Mart"*, ortada ince çizgi, üstünde mono "14 GÜN".

### FORM — "Katalog Kaydı"
- Tek scroll, 1-sütun (mobil) veya 2-sütun (desktop).
- Her bölüm dev başlıkla ayrılır: *"01 — Künye"*, *"02 — Yolculuk"*, *"03 — Edinme"*, *"04 — Notlar"*.
- Input'lar tek alt çizgi (1px ink), label caps mono üstte, focus'ta accent terracotta.
- ISBN bloğu sade: input + 2 ince button (`Doldur` / `Tara`).
- Puan: 10 dikey çubuk (3×24px) — tıkla artar/azalır.
- Aksiyon: alt sticky tek satır — solda metin sayacı *"4 / 4 bölüm tamamlandı"*, sağda dolgu siyah "Yayına Al".

### DASHBOARD — "2026 Edisyonu"
- Üstte: `EDİSYON 2026 · NO. 17` mono.
- Dev *"On yedi cilt"* (Fraunces 88 italic).
- Asimetrik grid:
  - Büyük heatmap kartı (siyah hücre, beyaz grid, üzerinde *"Bu yıl 184 gün"*).
  - Yan stat dik çubuğu: 5800 sayfa, 12 yazar, 4 şehir, 7 favori.
  - Alt **harita kartı:** SVG line-art Türkiye + İstanbul, İzmir, Bodrum, Ankara şehirleri büyük noktalı, üzerlerinde küçük çekildiği kitap sayısı.
  - **En çok okunan yazar:** *"Tanpınar"* (Fraunces italic 64) + 4 ince kapak thumbnail.
- Streak: yatay bar — *"34 günlük seri"* dev numara + ince ilerleme barı.

---

# ④ Sage — Doğal & Yumuşak

> **Konsept:** Soğuk bir sabah, sage yeşili çay fincanı, krem keten örtü, taze kâğıt. Huzurlu, organik, yavaş. Form bir nefes alma akışıdır. Uygulama "yorma".

## Renk Tokenları
```css
--sg-bg:        #f0ebde;   /* krem */
--sg-paper:     #f7f3e8;
--sg-deep:      #e2dcc8;
--sg-sage:      #6b7d63;   /* sage yeşili (birincil aksiyon) */
--sg-sage-lite: #9aac8f;
--sg-clay:      #b87a52;   /* toprak/seramik */
--sg-rose:      #c98c8c;
--sg-ink:       #2c2a22;
--sg-ink-soft:  #5a554a;
--sg-ink-mute:  #8a8475;
--sg-rule:      rgba(44,42,34,0.14);
```

## Tipografi
- **Display:** `Fraunces` 400 italic, opsz 24–72 — yumuşak ve hafifçe el-çizgisel
- **Serif gövde:** `EB Garamond` 400/500
- **Sans:** `IBM Plex Sans` 400/500 (humanist, yuvarlak)
- **El yazısı (notlar, vurgular):** `Caveat` 400/500

## Şekil & Doku
- Köşeler büyük: 16–24px (organik). Pillerl tam yuvarlak.
- Çok yumuşak gölge: `0 8px 30px rgba(44,42,34,0.06)`.
- **Yaprak / dal SVG'leri** süsleme olarak kart köşelerinde — minimal stilize.
- Kalp atışı `pulse` 2.4s (durum noktalarında).

## Ekran Notları

### Auth — "Sıcak Karşılama"
- Üstte minik **çay fincanı + kitap** SVG ikonu (line-art, sage yeşili).
- Başlık: *"Tekrar hoş geldin."* (Fraunces italic 36).
- Alt başlık (Caveat 18, clay): *"bugün biraz okuyalım mı?"*.
- Input'lar yumuşak yuvarlak kart içinde (sage border 1px), label sans medium üstte.
- Birincil buton: yuvarlak (full radius) **sage yeşili dolgu** + beyaz "İçeri gel" + arka yapraklar.

### LIST — "Bahçe Görünümü"
- Üstte sade: *"Günaydın, Fatih"* (Fraunces italic 26) + alt Caveat *"23 cilt okumayı bekliyor"*.
- Tab'lar: yumuşak pill grup (active: sage dolgu beyaz metin).
- **Şu an okunan**: yumuşak krem kart, sol kapak (60×90), sağda ilerleme — 10 daire (yapraklar) yanyana, dolu/boş; *"%43"* mono küçük altta.
- **Liste:** 1 sütun mobilde, krem kartlar, yuvarlak köşe, kapak solda 50×72, sağda başlık + yazar + 10 yaprak puanı.
- Hover/dokunuş: kart hafif yukarı (`translateY(-2px)`), gölge artar.
- Boş durum: stilize line-art **fidan** SVG + *"İlk fidanını dik."*

### DETAILS — "Yaprak Yaprak"
- Üstte yumuşak krem yarım daire (radial gradient sage'e).
- Ortada kapak (110×165) yumuşak gölge.
- Başlık Fraunces italic 30, yazar küçük serif.
- Puan: 10 yaprak yatay sırada.
- **Düşünceler**: krem kart, yaprak süslemeli sol-üst köşe, EB Garamond italic 17.
- **Altını Çizdiklerim**: her alıntı yuvarlak köşeli karanfil-rose kart, Fraunces italic 22, sağ alt mono küçük *"S. 217"*.
- **Yolculuk**: 2 yumuşak pin (yeşil + clay) arasında dalgalı line, *"İstanbul → İzmir · 14 gün"*.
- En altta Caveat el yazısı: *"baharın geldiğini bu kitap haber verdi."*

### FORM — "Nefes nefes"
- Tek scroll, hava + boşluk bol. Her alan bir "sayfa" gibi geniş padding.
- Üstte tarif başlık: *"Yeni bir kitap, yeni bir mevsim."* (Fraunces italic).
- ISBN: krem yumuşak kutu, sage "TARA" butonu yuvarlak.
- Inputlar: krem dolgu, sage focus border, yumuşak.
- Lokasyon input'larında autocomplete chip'leri yapraklı.
- Puan: 10 yaprak, dokunulduğunda sage'e döner.
- Aksiyon: alt sticky büyük sage dolgu yuvarlak buton "kütüphaneye al".

### DASHBOARD — "Sezon Raporu"
- Üstte mevsim ikonu + *"Bahar 2026"* (Fraunces italic).
- Dev sage rakam **17** + Caveat altında *"kitap, bu mevsime kadar"*.
- 4 yumuşak kart: yapraklı arka plan ile sayfa, streak (35 gün ateş yerine **filiz**), yazar, şehir.
- **Heatmap:** yaprak şeklinde hücreler (rounded), dolu olduklarında sage yeşili.
- En altta dairesel **yazar koleksiyonları** — her yazar bir krem daire içinde, ortasında baş harfi, etrafında okunan kitap sayısı.

---

# ⑤ Mehtap — Mistik & Şiirsel

> **Konsept:** Ay ışığı altında okuma. Lavanta-nilüfer açık zemin, lacivert mürekkep, gümüş + altın yıldız vurguları. Şiirsel, sakin, romantik. Tema "akşam okuyucusu" için.

## Renk Tokenları
```css
--mh-bg:        #eaeaf3;   /* mehtap zemin */
--mh-paper:     #f3f1f9;
--mh-deep:      #ddd8ec;
--mh-ink:       #1a2347;   /* gece mürekkebi */
--mh-ink-soft:  #2f3a64;
--mh-ink-mute:  #6a708a;
--mh-silver:    #7a86a8;
--mh-gold:      #9a7a30;   /* eski altın yıldız */
--mh-gold-lite: #c9a44a;
--mh-rose:      #a4607a;   /* el yazısı vurgu */
--mh-rule:      rgba(26,35,71,0.18);
```

## Tipografi
- **Display:** `Cormorant Garamond` 500–600 italic — şiirsel
- **Serif gövde:** `Cormorant Garamond` 400 (gövdeyi de italik tutmak — bilinçli yumuşaklık)
- **Sans:** `IBM Plex Sans` 400 (sadece UI yardımcı)
- **Caps mikrokopi:** `IBM Plex Mono` 9px, `letter-spacing: 0.36em`, ⋆ yıldız süsleri
- **El yazısı kişisel:** `Caveat` 18–22px (rose tonu)

## Şekil & Doku
- Köşeler orta: 12–18px (yumuşak ama lüks).
- **Yıldız serpiştirme** — arka planda 30 nokta, %30–60 opacity, organik dağılım.
- **Altın iç çerçeve** premium butonlarda: `box-shadow: inset 0 0 0 3px ink, inset 0 0 0 4px gold`.
- ⋆ ve ✶ unicode karakterleri tematik bezeme.
- Kart zeminleri yarı şeffaf beyaz (`rgba(255,255,255,0.45)`).

## Ekran Notları

### Auth — "Geceye Davet"
- Üstte ay (custom SVG: dolu altın daire üzerine paper-renkli daire bindirilmiş).
- Caps şerit: *"⋆ MEHTAP · 2026 ⋆"*.
- Başlık: *"Kitaplığım"* (Cormorant italic 46).
- Alt iki satır şiir: *"Geceleri okuduğun her satır, / bir yıldız kadar küçük bir hatıra."*
- Input'lar alt çizgili, mono caps label.
- Birincil buton: yuvarlak pill, **lacivert ink + altın iç çerçeve**, *"⋆ geceye gir ⋆"*.
- Footer Caveat rose: *"okuyalım, hatırlayalım ✶"*.

### LIST — "Bu Akşam"
- Üst bar: ortada *"⋆ FASIL III ⋆"* mono.
- Başlık: *"Kitaplığım"* (Cormorant italic 40, ekrana taşan), alt italic *"47 cilt · ay ışığında bekliyor"*.
- Tab'lar italic serif, aktif olan altın 1.5px alt çizgi.
- **Şu an okunan**: yarı şeffaf altın iç-çerçeveli kart, sağ üstte dekoratif ⋆, ilerleme çubuğu altın gradient.
- Şiirsel ayraç: `─── ⋆ BÜTÜN CİLTLER ⋆ ───`.
- Liste: küçük sırt kapakları + italic başlıklar + 10 küçük yıldız puan + status mini caps.
- Favori: rose mini ⋆ sağda.

### DETAILS — "Hatıra Sayfası"
- Üstte ortalanmış kapak (120×180), üst-sol köşede minik **mehtap mührü** (paper daire içinde altın ay).
- Caps: *"ROMAN · 1967"* altın.
- Başlık: Cormorant italic 28, ortalı, alt yazar.
- 10 yıldız puan + büyük *"10 / 10"* italic.
- **EDİTORYAL DEV PULL-QUOTE**: ortalı *"⋆ ALTINI ÇİZDİĞİM · S. 9 ⋆"*, dev sol "" altın opacity, alıntı Cormorant italic 22, anahtar kelime altın renkte.
- Yolculuk: yıldızlar arası gradient çizgi, ortada paper-bg "14 GECE".
- En altta Caveat rose el yazısı düşünce: *"Macondo'nun yağmuru hâlâ kulağımda..."*

### FORM — "Yeni Fasıl"
- Üstte: *"⋆ YENİ FASIL ⋆"* + *"Bir yıldız daha ekle."* (italic 36).
- ISBN bloğu: yarı şeffaf kart + altın iç çizgi + lacivert "TARA" pill (altın iç çerçeve).
- Input'lar alt çizgili, italic Cormorant 17.
- Lokasyon Caveat 22 (kişisel his).
- Puan: 10 yıldız ⋆ — dolu altın, boş ink-mute.
- Aksiyon: solda "vazgeç" italic, sağda büyük lacivert + altın iç çerçeve "⋆ kütüphaneye ekle".

### DASHBOARD — "Mehtap 2026"
- Üstte minik ay + *"⋆ MEHTAP · 2026 ⋆"*.
- Dev italic **17** + altında *"kitap, bu yıl"* + Caveat rose: *"yedi yıldız daha kaldı ✶"*.
- **Takım yıldızı dashboard:** 5 stat, ekrana SVG kesik çizgilerle (yıldız hatları) bağlanır:
  - 5800 sayfa · 34 gün streak · 12 yazar · 4 şehir · 7 favori
  - Her stat üstünde küçük ⋆ + italic dev rakam + mono caps label.
- Heatmap: yarı şeffaf kart, lacivert hücreler (yıldızlı gece), altta ay isimleri mono.
- En altta şiirsel pull: *"Bir kitap, gecelerin **en sessiz** arkadaşıdır."*

---

## Etkileşim & Animasyon

| Eylem | Davranış |
|---|---|
| Kitap kartı tap | 250ms ease scale(0.98) → detay sayfası fade+up 320ms |
| Tab değişimi | Underline `transform: translateX` 220ms ease |
| Form kayıt | Buton spinner 700ms → toast bottom slide |
| ISBN tara | Tam ekran modal slide-up, kamera fade-in |
| Streak/heatmap | Sayfa girişinde sol→sağ stagger, hücreler 8ms delay |
| Tema değişimi | Tüm CSS custom property root'ta — 280ms ease transition |

**Reduced motion:** `@media (prefers-reduced-motion)` tüm transition'ları 0ms.

---

## Capacitor / Mobile Notları

- Status bar: temaya göre `light` / `dark` (Müzehher, Atlas, Sage, Mehtap → dark text, light bg → `light`; Parşömen kâğıdı için de `light`).
- Safe area insets (`env(safe-area-inset-top/bottom)`) tüm sticky bar'lara uygulanmalı.
- Bottom tab bar (`<TabBar>`) home-indicator için `padding-bottom: env(safe-area-inset-bottom)`.
- Kamera (ISBN tara): `BarcodeDetector` → fallback `@zxing/browser`. Tema sadece overlay UI'sini değiştirir, kamera akışı sabit.
- Haptic: `Haptics.impact({ style: ImpactStyle.Light })` puan ve favori toggle'larında.

---

## Tema Anahtarı (Theme Switcher)

Önerilen mimari:
```ts
type ThemeKey = 'muzehher' | 'parsomen' | 'atlas' | 'sage' | 'mehtap';

// CSS custom properties root'a basılır
document.documentElement.dataset.theme = themeKey;

// index.css
[data-theme="muzehher"] { --bg: #ece1cd; --ink: #2a1d10; ... }
[data-theme="parsomen"] { --bg: #f1ebe1; --ink: #1c1a16; ... }
/* ... */
```

Ayarlar ekranında **5 swatch kart** ile seçim. Tercih `localStorage` + Supabase user_settings tablosuna yazılır.

---

## Erişilebilirlik

- Kontrast oranı: tüm gövde metni ≥ 4.5:1, başlıklar ≥ 3:1.
- Min dokunmatik hedef: 44×44px.
- Focus halkası: tüm temalarda 2px ink/sage/gold offset 2px.
- Renk asla tek başına bilgi taşımaz — durum rozeti her zaman metin + nokta ikonu içerir.
- Form alanlarında `<label htmlFor>` zorunlu.

---

## Geliştirme Sırası (Önerilen)

1. **Token & tema altyapısı** — `theme.css`, `useTheme()` hook, switcher.
2. **Ortak bileşen library** — `<Cover>`, `<RatingDisplay>`, `<JourneyTimeline>`, `<HeatmapYear>` (tema-token tabanlı).
3. **Tek tema (önerilen: Atlas — en sade)** ile tüm ekranları çıkar.
4. Diğer 4 temayı **token override + bileşen variant** ile ekle (yeni JSX yazmadan, yalnızca ek varyant kuralları).
5. Mobil davranış + Capacitor entegrasyonu.
6. Dashboard, harita, koleksiyon eklentileri.
7. Tema seçici ekranı + onboarding.

---

## Korunması Gerekenler (Hatırlatma)

- ✅ Türkçe arayüz (her tema kendi terminolojisini kullansa da Türkçe kalır)
- ✅ Supabase Auth + DB + Storage yapısı (sadece 3 yeni nullable kolon)
- ✅ ISBN tarama akışı (zxing + BarcodeDetector)
- ✅ Lokasyon autocomplete
- ✅ Alıntı sayfa numarası
- ✅ Favori toggle (`isFavorite` veya `rating === 10`)
- ✅ Capacitor uyumluluğu (viewport, dokunmatik, kamera)
- ✅ PWA kurulabilirliği

---

*Bu doküman `Kitaplığım - 5 Tema.html` interaktif tasarım mockup'ı ile birlikte okunmalıdır. HTML dosyası tüm ekranların görsel referansını içerir.*
