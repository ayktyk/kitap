# Kitaplığım — Tasarım Rehberi

Bu doküman, **Kitaplığım (MyLibrary)** uygulamasının tüm ekranlarını, akışlarını, veri modelini ve mevcut tasarım dilini eksiksiz anlatır. Amaç: Yeni bir tasarım önerisi yapmadan önce uygulamanın ne olduğunu, kimin için yapıldığını ve hangi etkileşimleri içerdiğini tam olarak kavramaktır.

---

## 1. Uygulama Nedir?

**Kitaplığım**, kişisel bir kütüphane yönetim uygulamasıdır. Kullanıcı kendi okuduğu, okuyacağı ve sahip olduğu kitapları tek bir yerde toplar; her kitabın yanına okuma yolculuğunu, alıntılarını ve düşüncelerini ekler.

Goodreads veya Storygraph gibi sosyal kitap ağlarından farklıdır:
- **Sosyal değildir** — başkalarıyla paylaşım, takip, yorum yoktur.
- **Kişiseldir** — kütüphane sadece kullanıcıya aittir.
- **Hatıra defteri gibidir** — bir kitabı nerede okuduğun, nereden aldığın, hangi cümlenin altını çizdiğin önemlidir.

### Hedef Kullanıcı
- Kitabı yalnızca okumakla kalmayıp **deneyimini de kaydetmek** isteyen okurlar
- Notlarını, alıntılarını, düşüncelerini bir yerde toplamak isteyenler
- "Bu kitabı 2022 yazında Bodrum'da okumuştum" gibi anıları korumak isteyenler

### Dil
Tamamen **Türkçe** arayüz. Mikrokopi, durum etiketleri, butonlar — hepsi Türkçe.

---

## 2. Teknik Bağlam

| Alan | Teknoloji |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Stil | Tailwind CSS v4 |
| Backend | Supabase (Auth + Postgres + Storage) |
| Mobil | Capacitor (iOS + Android wrapper, PWA destekli) |
| Barkod tarama | `@zxing/browser` + native `BarcodeDetector` API |
| İkonlar | `lucide-react` |
| Arka plan efekti | `@paper-design/shaders-react` (MeshGradient) |
| Tipografi | Inter (sans) + Merriweather (serif) |

PWA olarak da kurulabilir, mobilde Capacitor ile native build alır. Bu yüzden tasarım **mobile-first** düşünülmeli, ama desktop'ta da güzel durmalı.

---

## 3. Veri Modeli (Bir Kitap Neyi İçerir?)

Tasarımın merkezinde tek bir varlık var: **Book**. Bir kitap şu alanlardan oluşur:

```ts
{
  // Temel bilgi
  id: string
  title: string             // Kitap adı
  author: string            // Yazar
  coverUrl?: string         // Kapak görseli URL
  rating: number            // 1–10 arası puan
  pageCount: number         // Sayfa sayısı
  genre?: string            // Tür (Roman, Klasik vb.)

  // Durum
  status: 'READING' | 'WANT_TO_READ' | 'READ' | 'ABANDONED'
  isFavorite?: boolean

  // Okuma süreci
  startDate: string         // Başlangıç tarihi
  endDate: string           // Bitiş tarihi
  startLocation: string     // Başladığım yer ("İstanbul", "Ev")
  endLocation: string       // Bitirdiğim yer ("İzmir, Tatil")

  // Edinme
  purchaseDate: string      // Satın alma tarihi
  purchaseLocation: string  // Nereden ("D&R Kadıköy", "Amazon", "Sahaf")

  // İçerik
  thoughts: string          // Kitap hakkında düşünceler (uzun metin)
  quotes: Quote[]           // Altı çizilen alıntılar (metin + sayfa no)

  createdAt: number
}
```

Bu yapı önemli: **bir kitap sadece "kitap" değil, bir okuma deneyiminin kaydı**. Tasarım bunu hissettirmeli.

### Kitap Durumları (Status)
- `READING` — **Okuyorum** (yeşil)
- `WANT_TO_READ` — **Okunacak** (mavi)
- `READ` — **Okundu** (nötr/beyaz)
- `ABANDONED` — **Yarım Bıraktım** (nötr)

---

## 4. Uygulamanın Ekranları

Uygulama 4 temel "view state" üzerinden çalışır: `LIST`, `ADD`, `EDIT`, `DETAILS`. Bunlara giriş ekranı (`Auth`) ve kenar menüsü (`Sidebar`) eşlik eder.

---

### 4.1. Giriş Ekranı (Auth)

**Amaç:** Kullanıcı e-posta + şifre ile Supabase üzerinden giriş yapar veya kayıt olur.

**İçerik:**
- Ortada cam-efektli (glass) kart
- Üstte kütüphane (Library) ikonu, kutu içinde
- Başlık: "Tekrar Hoş Geldiniz" / "Yeni Hesap Oluştur"
- Alt başlık: "Favori kitaplarınız sizi bekliyor." / "Kitaplığınızı buluta taşımaya hazır mısınız?"
- E-posta input (Mail ikonu solda)
- Şifre input (Lock ikonu solda)
- Beyaz dolu birincil buton (Giriş Yap / Kayıt Ol) — siyah metin
- Altta "Zaten hesabınız var mı?" / "Yeni bir kütüphane oluşturmak ister misiniz?" geçiş bağlantısı
- Hata kutusu (kırmızı ton, animasyonlu nokta)

**Arka plan:** Tüm uygulama gibi siyah + animasyonlu MeshGradient (koyu gri tonlar).

---

### 4.2. Ana Liste (LIST View)

Uygulamanın yüzü. Kullanıcı giriş yapınca buraya iner.

#### 4.2.1. Üst Navigasyon (Nav Bar)
Sticky, blur'lu, üstte:
- **Sol:** Kütüphane ikonu (Sidebar açar) + "Kitaplığım" başlığı (serif, kalın) + altında küçük caps "Kişisel Kütüphane" mikrokopisi
- **Sağ (desktop):** Kullanıcı email rozeti + filtre tab grubu (Tümü / Favoriler / Okuyorum / Okunacak / Okundu) + büyük "Ekle" butonu (+ ikonu)
- **Sağ (mobile):** Sadece "Ekle" butonu, filtreler aşağıda gösterilir

#### 4.2.2. Sayfa Başlığı
- Aktif filtreye göre değişen büyük serif başlık:
  - `ALL` → "Kitaplığım"
  - `FAVORITES` → "Favori Kitaplarım"
  - `READING` → "Şu An Okuduklarım"
  - `WANT_TO_READ` → "Okunacaklar"
  - `READ` → "Bitirdiğim Kitaplar"
  - `ABANDONED` → "Yarım Bıraktıklarım"

#### 4.2.3. Mobil Filtre Şeridi
Desktop'ta üst nav'da olan filtre tab'ları, mobilde başlığın altında yatay scroll'lu pill grup olarak gösterilir.

#### 4.2.4. İstatistik Şeridi
Başlığın altında küçük, soluk bir satır:
- ⚪ X kitap
- 🟢 X okuyor
- 🔵 X bitti
- 🌸 X favori
- "X sayfa okundu" (toplam)

Her metrik renkli noktalı, glow efektli.

#### 4.2.5. Arama + Sıralama Kartı
Cam-efektli yuvarlak köşeli (rounded-3xl) bir kart içinde:
- **Arama input** (Search ikonu) — kitap, yazar, tür, alıntı, not içinde arama yapar
- **Sıralama select** (ArrowUpDown ikonu) — En yeni / Ada göre / Yazara göre / Puana göre / Sayfa sayısına göre
- Altta: kaç sonuç bulunduğu + filtreyi sıfırlama bağlantısı

#### 4.2.6. Kitap Kartları (Grid)
- Mobil: 1 sütun
- Tablet: 2 sütun
- Desktop: 3 sütun

Her kart (BookList.tsx'teki `BookList` bileşeni):
- Başlık (serif, kalın, hover'da maviye dönüyor)
- Yazar adı + tür rozeti (yan yana, "•" ile ayrılmış)
- Hover'da sağ üstte düzenleme (Edit2) ikonu belirir
- 10'lu yıldız puanlama gösterimi
- Durum rozeti (renkli, küçük caps): OKUYORUM / OKUNACAK / OKUNDU / YARIM
- Alt kısımda Calendar + BookOpen ikonlarıyla başlangıç tarihi ve sayfa sayısı (küçük chip'ler)
- Eğer alıntı varsa: alt çizgiyle ayrılmış, italik serif tek satır alıntı önizlemesi
- Alt kenarda ince gradient çizgi (hover'da parlar)

**Önemli:** Kapak görseli kart üzerinde **gösterilmiyor şu an** — sadece detay sayfasında var. Bu redesign için bir karar noktası.

#### 4.2.7. Boş Durum (Empty State)
Hiç kitap yoksa veya arama sonuçsuzsa:
- Ortalanmış, sade
- Kitap (BookOpen) ikonu büyük ve cam efektli kutuda
- Başlık: "Kütüphaneniz Henüz Sessiz" (veya "Aradığın ifadeye uygun kitap bulunamadı")
- Açıklama: "Yeni bir kitap ekleyerek kütüphanenizi canlandırın..."

---

### 4.3. Kitap Detayı (DETAILS View)

Bir karta tıklanınca açılır. Tek kitabın hatıra sayfası gibi tasarlanmış.

**Yapı (BookDetails.tsx):**

1. **Üst banner** — Yarı şeffaf, animasyonlu (pulse), 160px yüksekliğinde
   - Sol üstte "Geri Dön" pill butonu (ArrowLeft)
   - Sağ üstte beyaz "Düzenle" butonu (siyah metin, dolu)

2. **Kapak + Başlık (ortalanmış)**
   - Banner'a binen 176×256 kapak (göl efekti, hover'da büyür)
   - Kapak yoksa: BookOpen ikonu placeholder
   - Altında: serif 3xl başlık → yazar adı → durum rozeti + tür rozeti yan yana
   - En altta 10'lu yıldız puanlama (büyük, 22px)

3. **Okuma Yolculuğu (Journey) bölümü**
   - Küçük başlık: "OKUMA YOLCULUĞU" (caps, geniş tracking)
   - 3 nokta: Başlangıç (yeşil MapPin) → Saat ikonu (ortada, animasyonlu) → Bitiş (mavi MapPin)
   - Her uçta lokasyon + tarih
   - Aralarında ince çizgi

4. **Düşüncelerim** (varsa)
   - Küçük caps başlık
   - Büyük yumuşak kart, iç içe gölge
   - Arka planda dev silik Quote ikonu (-12° döndürülmüş, dekoratif)
   - Serif italik, geniş satır aralıklı (1.9) metin

5. **Altını Çizdiklerim** (varsa)
   - "Altını Çizdiklerim (3)" başlığı
   - Her alıntı ayrı kartta, dev silik Quote ikonu dekoratif
   - Serif italik, hover'da hafif sağa kayar
   - Sağ altta "— Sayfa 142" notu (varsa)

6. **Edinme detayları** (varsa)
   - En altta ince çizgi üstünde, ortalanmış mini şerit
   - Calendar + tarih, ShoppingBag + satın alınan yer

**Atmosfer:** Bu sayfa "hatıra defteri" hissi vermeli. Kullanıcı buraya geldiğinde kendi okuma anısını yaşamalı.

---

### 4.4. Kitap Ekle / Düzenle (ADD / EDIT View)

Aynı bileşen (`BookForm.tsx`) iki mod için kullanılır.

**Yapı:** Modal-benzeri büyük cam kart, dikey scroll'lu form.

#### 4.4.1. Üst Bar
- Sol: Favori toggle butonu (Star ikonu, aktifken mavi/dolu) + "Yeni Kitap Ekle" / "Kitabı Düzenle" başlığı + altında "KÜTÜPHANE KAYIT SİSTEMİ" mikrokopisi
- Sağ: Kapatma (X) butonu

#### 4.4.2. Tab Şeridi (4 sekme)
1. **Genel Bilgiler** (BookOpen ikonu)
2. **Okuma Süreci** (Calendar ikonu)
3. **Edinme** (ShoppingBag ikonu)
4. **Düşünceler ve Alıntılar** (BookOpen ikonu)

Aktif tab: alt kenarda beyaz çizgi + arka planda hafif highlight.

#### 4.4.3. Tab 1 — Genel Bilgiler
**ISBN/Barkod Bloğu** (üstte, ayrı kartta):
- ISBN input (Barcode ikonu)
- "ISBN Doldur" butonu (beyaz dolu) — ISBN'den Google Books / Open Library / Wikipedia'dan kitap bilgisi çeker (`bookLookupService.ts`)
- "Tara" butonu — kameradan barkod okur (BarcodeDetector veya ZXing fallback)
- Sonuç mesajı (başarılı/hatalı)

**Kapak + Form Alanları:**
- Sol: 112×160 kapak yükleme alanı (kesikli border, Camera ikonu placeholder, hover'da "Değiştir" overlay'i, yükleme sırasında spinner)
- Sağ: 2 sütun grid
  - Kitap Adı
  - Yazar
  - Sayfa Sayısı (number)
  - Tür

**Durum + Puan:**
- Durum select (Okumak İstiyorum / Okuyorum / Okundu / Yarım Bıraktım)
- Kişisel Puanım — 10'lu yıldız (interaktif). Puan verilince otomatik durum "Okundu" olur.

#### 4.4.4. Tab 2 — Okuma Süreci
2 sütun grid:
- Başlangıç Tarihi (date) + yeşil nokta
- Başlangıç Yeri (text + autocomplete; önceki kayıtlardan öneri sunar)
- Bitiş Tarihi (date) + mavi nokta
- Bitiş Yeri (text + autocomplete)

#### 4.4.5. Tab 3 — Edinme
2 sütun grid:
- Satın Alma Tarihi (date)
- Satın Alınan Yer (text + autocomplete)

#### 4.4.6. Tab 4 — Düşünceler ve Alıntılar
- **Düşüncelerim** — büyük serif textarea (h-48), placeholder: "Bu kitap bana neler hissettirdi?"
- **Alıntılar** bölümü:
  - "Yeni Alıntı Ekle" butonu (+ ikonu, pill buton)
  - Her alıntı ayrı kartta:
    - Auto-resize textarea (serif italik, transparent border)
    - "Sayfa" mini number input
    - Hover'da sağda Trash2 silme butonu
  - Boşken: kesikli border boş alan

#### 4.4.7. Alt Aksiyon Çubuğu
- **Sol (sadece düzenleme modunda):** "Kitabı Sil" butonu — tıklayınca "Emin misiniz?" + "Evet, Sil" / "Vazgeç" iki aşamalı onay
- **Sağ:** "İptal" (border'lı) + "Kaydet" (beyaz dolu, hover'da glow). Yükleme sırasında spinner ve "Kaydediliyor" / "Resim Yükleniyor" yazısı.

#### 4.4.8. Barkod Tarayıcı Modal
"Tara" basılınca açılan tam ekran overlay:
- Üstte "ISBN Tara" başlığı + "Barkodu kameraya doğru tut." mikrokopisi + kapatma X
- Ortada 3:4 oranında kamera görüntüsü (rounded-2xl)
- Altta tam genişlikte "Kapat" butonu

---

### 4.5. Sidebar (Yan Menü)

Sol üstteki Library butonuna tıklanınca soldan açılan 280px genişliğinde panel.

**Yapı (Sidebar.tsx):**
1. **Header:** Library ikonu kutuda + "Menü" başlığı (serif) + sağda kapatma X
2. **Kullanıcı Bilgisi:** Avatarlı (email'in ilk 2 harfi büyük) küçük kart, "KÜTÜPHANECİ" caps başlığı + email
3. **Navigasyon:**
   - Kitaplığım (Library)
   - Favorilerim (Star, mavi)
   - Şu An Okunanlar (Clock)
   - Okunacaklar (Bookmark)
   - Bitirdiklerim (Calendar)
   
   Aktif olan beyaz arka planlı, border'lı.
4. **Footer:** "Çıkış Yap" butonu (kırmızı ton, LogOut ikonu)

Açılınca arkasında siyah blur'lu overlay.

---

## 5. Mevcut Tasarım Dili

### 5.1. Renk Paleti
- **Arka plan:** Saf siyah (#000) + üzerine animasyonlu MeshGradient (koyu gri: `#101010`, `#1a1a1a`, `#2a2a2a`, `#010101`)
- **Yüzeyler:** `rgba(255,255,255,0.03–0.10)` — şeffaf beyaz katmanlar
- **Metin hiyerarşisi:** `text-white` (vurgu) → `text-white/70` → `text-white/50` → `text-white/40` → `text-white/20` (en silik)
- **Border:** `border-white/5` ile `border-white/10` arası
- **Vurgu renkleri (sınırlı):**
  - Yeşil (`green-400/500`) — "Okuyorum", başlangıç noktası
  - Mavi (`blue-400/500`) — "Okunacak", "Favori", bitiş noktası
  - Pembe (`pink-400`) — Favori sayacı
  - Sarı (`yellow-400/500`) — Yıldız puanlama
  - Kırmızı (`red-400/500`) — Hata, silme
  - Amber (`amber-500`) — Uyarı

**Kritik:** Renk çok cimri kullanılıyor. Hakim ton siyah/beyaz/gri. Renkler sadece **durum bildirimi** için.

### 5.2. Tipografi
- **Sans (Inter)** — gövde, butonlar, form alanları
- **Serif (Merriweather)** — başlıklar, kitap adları, alıntılar, düşünceler

Tipografik hiyerarşi:
- 4xl serif bold — sayfa başlıkları
- 3xl-4xl serif black — kitap adı (detay)
- xl serif bold — kart başlıkları
- xs/sm sans medium — gövde
- **10px black uppercase tracking-[0.2em–0.3em]** — etiketler, mikrokopi (çok karakteristik!)

### 5.3. Şekil ve Köşe Yarıçapı
- Küçük kontroller: `rounded-md / rounded-lg`
- Form alanları, butonlar: `rounded-xl / rounded-2xl`
- Büyük kartlar, panaroller: `rounded-3xl`
- Pillerl/rozetler: `rounded-full`

### 5.4. Glass / Blur Efekti
Tüm yüzeylerde `backdrop-blur-xl` veya `backdrop-blur-3xl` kullanılıyor. `glass` utility class'ı:
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
```

### 5.5. Animasyon ve Mikro-etkileşimler
- `animate-fade-in-up` — sayfa geçişlerinde aşağıdan yukarı belirme
- `card-hover` — kartlarda hover'da -8px translate + scale(1.02) + glow
- Butonlarda `hover:scale-105 active:scale-95`
- `animate-pulse` — bekleme/durum noktalarında nabız
- Hover'da renk geçişleri 200–500ms

### 5.6. İkonografi
Tek kaynak: `lucide-react`. Outline stili. Boyutlar 12–24px arası, sıklıkla 14/16/18.

---

## 6. Kullanıcı Akışları (Önemli Senaryolar)

### Akış 1: İlk Defa Kullanım
1. Auth ekranı → Kayıt Ol → e-posta doğrulama
2. Giriş yap → boş LIST view ("Kütüphaneniz Henüz Sessiz")
3. "Ekle" butonuna bas → BookForm (Tab 1)

### Akış 2: ISBN ile Hızlı Ekleme
1. LIST view → Ekle
2. Tab 1'de ISBN input'a numara gir veya "Tara" ile barkodu okut
3. "ISBN Doldur" → form otomatik dolar (başlık, yazar, sayfa, tür, kapak)
4. Kullanıcı kendi notlarını ekler → Kaydet

### Akış 3: Okuma Yolculuğunu Belgeleme
1. Kitap kartına tıkla → DETAILS view
2. Düzenle → Tab 2 (Okuma Süreci)
3. Tarih + lokasyon gir → Kaydet
4. DETAILS view'da "Okuma Yolculuğu" görsel zaman çizgisi olarak görünür

### Akış 4: Alıntı Toplama
1. DETAILS → Düzenle → Tab 4
2. "Yeni Alıntı Ekle" → metni yaz, sayfa no gir
3. Kaydet → DETAILS'te "Altını Çizdiklerim" bölümünde görünür

### Akış 5: Arama ve Filtreleme
1. LIST view → arama kutusuna "kafka" yaz → tüm kitaplarda (başlık, yazar, tür, alıntı, not) arar
2. Sıralama select → "Puana göre"
3. Sidebar'dan veya nav'dan filtre değiştir → "Sadece Favoriler"

---

## 7. Mobil Davranış (Kritik!)

Bu uygulama **Capacitor ile native mobil app** olarak da paketleniyor. Yani mobil deneyim öncelik:

- Üst nav'da desktop filtreler gizlenir, mobilde başlık altında scroll'lu pill grup
- "Ekle" butonu metni gizlenir, sadece + ikonu kalır
- Form 2-sütun grid'leri tek sütuna iner
- Kitap kartları 1 sütun
- Sidebar tam ekrana yakın açılır
- Barkod tarama özelliği özellikle mobilde değerli — kameraya barkod gösterip ekleme

---

## 8. Mevcut Tasarımın Güçlü Yanları (Korunmalı mı Tartışılmalı)

- **Hatıra defteri hissi** — özellikle DETAILS view'daki yolculuk + alıntı + düşünce yapısı
- **Sade/cimri renk kullanımı** — yalnızca durum için renk
- **Türkçe-doğal mikrokopi** — "Kütüphaneniz Henüz Sessiz", "Tekrar Hoş Geldiniz"
- **Tipografik kontrast** — serif başlıklar + sans gövde + abartılı caps mikrokopi
- **Glass + animated background** — modern, yaşayan his

## 9. Mevcut Tasarımın Zayıf Yanları (Yeniden Düşünülebilir)

- **Liste kartlarında kapak yok** — kitap görselliği zayıf, sadece metin
- **MeshGradient arka plan dikkat dağıtıcı olabilir** — özellikle uzun form okumalarında
- **10'lu puanlama yıldızla zorlama** — 10 yıldız satıra sığmıyor, küçük kalıyor
- **Tab navigasyon (BookForm)** — bilgi ayrı sayfalardaymış gibi hissettiriyor, akış kesik
- **"Düzenle" için detayda buton, kart üzerinde hover-only** — keşfedilmesi zor, mobilde hover yok
- **Filtre sayısı çok ve ikiye bölünmüş** — hem nav'da hem mobilde, hem sidebar'da
- **İstatistik şeridi pasif** — sadece sayı veriyor, üzerine tıklanmıyor
- **Boş durum monoton** — hep aynı kitap ikonu
- **Detay banner'ı yarım kalmış hissi** — sadece animasyon, kapakla bağlantısız
- **Okuma yolculuğu zaman çizgisi 2 noktayla sınırlı** — başlangıç/bitiş, ara duraklar yok
- **Kart üzerinde alıntı önizlemesi** — ham görünüyor, tipografik öne çıkış zayıf

---

## 10. Tasarım Hedefleri (Yeni Tasarım İçin Öneriler)

Yeni tasarımcı şu sorulara cevap aramalı:

1. **Bir kitap kartı vitrindeki bir kitap gibi mi durmalı, dosyadaki bir kayıt gibi mi?**
2. **Kapak görseli ne kadar baskın olmalı?** (Goodreads tarzı kapak öncelikli mi, yoksa metin/duygu öncelikli mi?)
3. **Liste vs. raf vs. magazin layout** — kullanıcı 100+ kitap eklediğinde nasıl gezinecek?
4. **DETAILS sayfası bir "kitap kapağı" gibi açılmalı mı?** (kitap kapağı büyük → içerik aşağıda akıyor — Apple Books / Readwise tarzı)
5. **Renk dilinde yumuşak bir vurgu rengi eklenmeli mi?** (şu an saf beyaz/gri — bir akademik hafiflik var ama soğuk olabilir)
6. **Okuma yolculuğunu daha zengin gösterebilir miyiz?** (harita, takvim, ilerleme bar'ı gibi)
7. **Form 4 sekme yerine tek akış (scroll) olabilir mi?** (her şey tek sayfada gözle görülür)
8. **İstatistikler dashboard olabilir mi?** (yıllık okuma, en çok okuduğun yazar, ortalama puan vb.)
9. **Karanlık modun yanına açık mod gelmeli mi?** (şu an sadece dark)
10. **Mobil önce mi tasarlanmalı?** (uygulama Capacitor ile native paketleniyor)

---

## 11. Korunması Gerekenler (Vazgeçilmezler)

- **Türkçe arayüz** — tüm metinler Türkçe kalmalı
- **Supabase entegrasyonu** — Auth + DB + Storage yapısı değişmeyecek; veri modeli aynı kalmalı
- **ISBN tarama akışı** — barkod ile kitap ekleme önemli bir özellik
- **Lokasyon autocomplete** — kullanıcının önceki girdilerinden öneri çıkarmak değerli
- **Alıntı sayfa numarası** — okuyucular için önemli detay
- **Favori toggle** — hem `isFavorite` hem `rating === 10` favori sayılıyor
- **Capacitor uyumluluğu** — viewport meta'lar, dokunmatik etkileşim, kamera erişimi

---

## 12. Tasarımdan Beklenen Çıktı

Claude Design'dan beklenen:
1. **Tüm ekranların yeniden yorumu** (Auth, LIST, DETAILS, FORM, Sidebar)
2. **Yeni bir tasarım sistemi** (renk, tipografi, şekil, gölge, hareket)
3. **En az 1 desktop + 1 mobil mockup** her ana ekran için
4. **Component katalog** (kart, buton, input, rozet, modal varyantları)
5. **Boş durum ve loading varyantları**
6. **Yeni tasarımın "neden" hikâyesi** — hangi karar neden alındı

---

## Ek: Dosya Haritası (Geliştiriciye Yardım İçin)

```
kitaplık/
├── App.tsx                      # Ana uygulama, view state, auth, filtreleme
├── index.html                   # PWA meta + fontlar
├── index.css                    # Tailwind + glass utility + animasyonlar
├── types.ts                     # Book, Quote, BookStatus tipleri
├── components/
│   ├── Auth.tsx                 # Giriş/Kayıt ekranı
│   ├── Sidebar.tsx              # Sol menü
│   ├── BookList.tsx             # Kitap kartları grid
│   ├── BookDetails.tsx          # Tek kitap detay sayfası
│   ├── BookForm.tsx             # Ekleme/düzenleme formu (4 tab + barkod)
│   └── RatingStars.tsx          # 10'lu yıldız puanlama
├── services/
│   ├── supabaseService.ts       # CRUD + storage upload
│   ├── bookLookupService.ts     # ISBN → Google Books / Open Library / Wikipedia
│   ├── geminiService.ts         # (kullanılmıyor — AI özellikleri kaldırıldı)
│   └── storageService.ts
└── lib/
    └── supabase.ts              # Supabase client
```

---

**Not:** Yakın zamanda yapılan değişiklikler (`git log`):
- AI özellikleri ve dekoratif filler metinler kaldırıldı
- Form alanları boyut olarak eşitlendi, alıntı textarea auto-expand
- Header'a home navigasyonu, sidebar navigasyonu düzeltildi
- PWA ikonu temiz kitap yığını tasarımıyla yenilendi

Yani uygulama şu an **sade, fonksiyonel ve kişisel** bir kütüphane uygulaması olarak konumlanmış. Tasarım da bu yönü güçlendirmeli.
