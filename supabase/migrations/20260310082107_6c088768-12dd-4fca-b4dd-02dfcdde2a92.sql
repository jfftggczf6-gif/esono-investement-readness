-- Drop and recreate UPDATE policy with proper with_check
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Also add INSERT/UPDATE/DELETE policies for ovo-outputs bucket
CREATE POLICY "Authenticated users can upload ovo-outputs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ovo-outputs');

CREATE POLICY "Authenticated users can read ovo-outputs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ovo-outputs');