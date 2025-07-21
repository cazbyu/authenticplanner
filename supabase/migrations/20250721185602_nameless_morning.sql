/*
  # Fix Notes Table Schema

  1. Ensure the notes table exists with correct structure
  2. Add missing columns if they don't exist
  3. Refresh schema cache

  This migration ensures the 0007-ap-notes table has the correct structure
  that matches what the application expects.
*/

-- Ensure the table exists with all required columns
CREATE TABLE IF NOT EXISTS "0007-ap-notes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_relationship_id uuid,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Check and add content column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-notes' AND column_name = 'content'
  ) THEN
    ALTER TABLE "0007-ap-notes" ADD COLUMN content text NOT NULL DEFAULT '';
  END IF;

  -- Check and add user_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "0007-ap-notes" ADD COLUMN user_id uuid NOT NULL;
  END IF;

  -- Check and add key_relationship_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-notes' AND column_name = 'key_relationship_id'
  ) THEN
    ALTER TABLE "0007-ap-notes" ADD COLUMN key_relationship_id uuid;
  END IF;

  -- Check and add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-notes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "0007-ap-notes" ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Check and add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-notes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "0007-ap-notes" ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add user foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notes_user' AND table_name = '0007-ap-notes'
  ) THEN
    ALTER TABLE "0007-ap-notes" 
    ADD CONSTRAINT fk_notes_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add key relationship foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notes_key_relationship' AND table_name = '0007-ap-notes'
  ) THEN
    ALTER TABLE "0007-ap-notes" 
    ADD CONSTRAINT fk_notes_key_relationship 
    FOREIGN KEY (key_relationship_id) REFERENCES "0007-ap-key-relationships"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE "0007-ap-notes" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can manage their own notes" ON "0007-ap-notes";

-- Create RLS policy
CREATE POLICY "Users can manage their own notes"
  ON "0007-ap-notes"
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create or replace the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_0007_ap_notes_updated_at ON "0007-ap-notes";
CREATE TRIGGER update_0007_ap_notes_updated_at
  BEFORE UPDATE ON "0007-ap-notes"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON "0007-ap-notes"(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_key_relationship_id ON "0007-ap-notes"(key_relationship_id);

-- Force schema cache refresh by updating table comment
COMMENT ON TABLE "0007-ap-notes" IS 'Notes linked to key relationships - schema refreshed';