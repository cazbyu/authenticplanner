/*
  # Update key_relationships table to use image_path instead of image_url

  1. Changes
    - Add image_path column to 0007-ap-key_relationships table
    - Rename existing image_url column data to image_path
  
  2. Security
    - No changes to RLS policies
*/

-- Add image_path column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-key_relationships' AND column_name = 'image_path'
  ) THEN
    ALTER TABLE "0007-ap-key_relationships" ADD COLUMN "image_path" text;
  END IF;
END $$;

-- Copy data from image_url to image_path if image_path is null
UPDATE "0007-ap-key_relationships"
SET "image_path" = "image_url"
WHERE "image_path" IS NULL AND "image_url" IS NOT NULL;