# Supabase Tasima Plani

Bu belge, Kitaplik projesini Supabase free planindan cikarmak icin en uygun ucretsiz tasima yolunu ozetler. Amaç, Supabase'deki iki ucretsiz proje hakkindan birini daha kapsamli bir projeye ayirmak ve Kitaplik uygulamasini daha dusuk bakim maliyetli bir yapıya almak.

## Kisa Karar

Bu proje icin en uygun ve en kolay yol: Supabase'i tamamen cikarip uygulamayi **local-first IndexedDB + JSON yedek/ice aktarma** yapisina tasimak.

Neden:

- Projedeki ana backend ihtiyaci basit: `books` CRUD, auth ve kapak yukleme.
- Veri modeli kucuk ve tek kullanicili kullanim icin uygun.
- Projede zaten eski bir yerel kayit servisi var: `services/storageService.ts`.
- Hicbir ucretsiz cloud kotasina, proje limitine veya inactive pause riskine bagli kalinmaz.
- Supabase slotu tamamen bosalir.

Bedel:

- Login ve otomatik cihazlar arasi senkron kalkar.
- Veri cihaz/browser icinde yasar.
- Cihazlar arasi tasima JSON yedek/ice aktarma ile yapilir.

## Onemli Not

Supabase projesini hemen silmemek gerekir.

Mevcut export kitaplari JSON'a cikariyor, fakat kapaklar sadece `coverUrl` olarak kaliyor. Kapak URL'leri Supabase Storage'a gidiyorsa proje silinince kapaklar kirilir.

Bu nedenle once:

- Supabase aktifken tum kitap verisi alinmali.
- Supabase Storage'daki kapaklar indirilmeli.
- Yeni yedek formatina kapaklar da dahil edilmeli.
- Yeni surumde import/export akisi kapak dahil dogrulanmali.

## Secenekler

### 1. Onerilen: Local-first

Maliyet: $0

Zorluk: dusuk

Tahmini sure: 0.5-1 gun

Artilar:

- Supabase slotu tamamen bosalir.
- Backend yok.
- Hosting ayni kalabilir.
- Ucretsiz cloud limitlerine bagimli degil.
- Bakim maliyeti en dusuk secenek.

Eksiler:

- Cloud sync yok.
- Auth yok.
- Veri kaybi riskini azaltmak icin duzenli yedek almak gerekir.

### 2. Cloud Sync Sarti Varsa: Firebase Auth + Firestore + Cloudinary

Firebase Spark planinda odeme yontemi gerekmeden Auth ve Firestore kullanilabiliyor. Firestore'un ucretsiz limitleri bu proje icin fazlasiyla yeterli gorunuyor.

Kapak yukleme icin Firebase Cloud Storage yerine Cloudinary daha mantikli olabilir. Firebase Cloud Storage tarafinda yeni bucket/pricing konusu daha dikkatli ele alinmali.

Maliyet: $0 kalabilir

Zorluk: orta

Tahmini sure: 1-2 gun

Artilar:

- Login korunur.
- Cloud sync korunur.
- Firestore limitleri kucuk kisisel kitaplik icin yeterli.

Eksiler:

- Iki servis yonetilir.
- Daha fazla migration isi cikar.
- Security rules ve auth state yeniden yazilir.
- Kapak yukleme icin ayri servis veya ek ayar gerekir.

### 3. Appwrite Cloud

Appwrite, Supabase'e benzer sekilde auth, database ve storage sunar.

Maliyet: $0

Zorluk: orta

Eksiler:

- Free planda yine 2 proje limiti var.
- Free projeler 1 hafta inaktivitede pause ediliyor.
- Supabase slot probleminden kacarken benzer bir platform kisitina giriliyor.

Bu nedenle Kitaplik gibi basit ve kisisel bir proje icin ilk tercih olmamali.

### 4. Cloudflare D1/R2/Workers

Cloudflare tarafinda D1, R2 ve Workers ucretsiz kotalari guclu. Ancak bu proje icin "en kolay" secenek degil.

Artilar:

- Ucretsiz kotalar yuksek.
- D1 ve R2 kucuk projeler icin uygun.
- Egress tarafinda avantajli.

Eksiler:

- Auth, sifre sifirlama, API ve guvenlik katmani ozel kod ister.
- Migration is yuku daha fazladir.
- Frontend-only Supabase SDK deneyiminden daha fazla backend koduna gecilir.

## Onerilen Tasima Plani

1. Supabase projesi aktifken mevcut verinin tam yedegini al.
2. Supabase Storage'daki kapaklari tespit et.
3. Kapaklari indir, mumkunse WebP'ye kucult.
4. Yeni `libraryService` adaptoru olustur:
   - `getBooks`
   - `saveBook`
   - `deleteBook`
   - `exportBooks`
   - `importBooks`
   - `saveCoverImage`
5. Kitaplari IndexedDB'de sakla.
6. Kapaklari ayri bir IndexedDB object store'da blob olarak sakla.
7. `App.tsx` icindeki Supabase session/auth akislarini kaldir.
8. Uygulama login yerine direkt kitaplik ekranina acilsin.
9. `components/Auth.tsx`, `lib/supabase.ts` ve Supabase SQL/RPC bagimliliklarini devreden cikar.
10. Import/export formatini kapak dahil tam yedek yap.
11. `npm run build` ile dogrula.
12. Manuel olarak su akislari test et:
    - kitap ekleme
    - kitap duzenleme
    - kitap silme
    - kapak yukleme
    - ISBN ile doldurma
    - export
    - import
13. Yeni surum calistiktan ve yedek dogrulandiktan sonra Supabase projesini pause veya delete et.

## Hizli Ara Cozum

Supabase dokumanlarina gore paused projeler free proje limitine sayilmiyor. Kitaplik kisa sure offline kalabilir diyorsan, en hizli cozum projeyi pause etmek olabilir.

Ancak uygulama aktif kullanilacaksa kalici cozum local-first migration'dir.

## Kaynaklar

- Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Firebase pricing: https://firebase.google.com/pricing
- Firebase Auth limits: https://firebase.google.com/docs/auth/limits
- Cloudinary billing: https://cloudinary.com/documentation/billing_and_plans
- Appwrite pricing: https://appwrite.io/pricing
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
