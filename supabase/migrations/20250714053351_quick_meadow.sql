/*
  # Update Key Relationships Image Handling

  1. Changes
    - Ensure image_path column exists on 0007-ap-key_relationships table
    - Update existing records to use proper image paths instead of full URLs
    - Add helper function to extract image paths from URLs

  2. Security
    - No changes to security policies
*/

-- First, ensure the image_path column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '0007-ap-key_relationships' AND column_name = 'image_path'
  ) THEN
    ALTER TABLE "0007-ap-key_relationships" ADD COLUMN image_path TEXT;
  END IF;
END $$;

-- Create a function to extract the path from a URL
CREATE OR REPLACE FUNCTION extract_image_path(url TEXT) 
RETURNS TEXT AS $$
DECLARE
  path TEXT;
  parts TEXT[];
  bucket_index INTEGER;
BEGIN
  IF url IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If it's not a URL, assume it's already a path
  IF position('://' IN url) = 0 THEN
    RETURN url;
  END IF;
  
  -- Split the URL by '/'
  parts := string_to_array(url, '/');
  
  -- Find the index of the bucket name
  bucket_index := 0;
  FOR i IN 1..array_length(parts, 1) LOOP
    IF parts[i] = '0007-key-relationship-images' THEN
      bucket_index := i;
      EXIT;
    END IF;
  END LOOP;
  
  -- If bucket found, extract the path after it
  IF bucket_index > 0 AND bucket_index < array_length(parts, 1) THEN
    path := '';
    FOR i IN (bucket_index + 1)..array_length(parts, 1) LOOP
      path := path || parts[i];
      IF i < array_length(parts, 1) THEN
        path := path || '/';
      END IF;
    END LOOP;
    RETURN path;
  END IF;
  
  -- If we can't extract a path, return the original
  RETURN url;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to use image_path instead of image_url
UPDATE "0007-ap-key_relationships"
SET image_path = extract_image_path(image_url)
WHERE image_url IS NOT NULL AND (image_path IS NULL OR image_path = '');

-- Drop the function as it's no longer needed
DROP FUNCTION extract_image_path(TEXT);