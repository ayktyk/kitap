-- 1. Create a bucket for book covers
-- Run this in the Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES ('book-covers', 'book-covers', true);

-- 2. Allow public access to read files 
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'book-covers' );

-- 3. Allow authenticated users to upload files
CREATE POLICY "Users can upload their own covers" 
ON storage.objects FOR INSERT 
WITH CHECK ( 
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
);

-- 4. Allow users to update/delete their own covers
CREATE POLICY "Users can update their own covers" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'book-covers' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own covers" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'book-covers' AND auth.uid() = owner );
