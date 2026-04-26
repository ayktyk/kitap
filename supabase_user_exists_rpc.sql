-- Şifre sıfırlama akışında "kayıtlı mail mi?" kontrolü için RPC fonksiyonu.
-- Supabase Dashboard -> SQL Editor'da bir kez çalıştırın.
--
-- NOT: Bu, e-posta enumerasyonuna izin verir (kötü niyetli biri hangi adreslerin
-- kayıtlı olduğunu öğrenebilir). UX kararı olarak kabul edildi.

create or replace function public.user_exists(email_to_check text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  found_count int;
begin
  select count(*)
    into found_count
    from auth.users
   where lower(email) = lower(email_to_check);
  return found_count > 0;
end;
$$;

-- Anonim (anon) ve giriş yapmış (authenticated) kullanıcılar bu fonksiyonu
-- çağırabilsin diye yetki veriyoruz.
grant execute on function public.user_exists(text) to anon, authenticated;
