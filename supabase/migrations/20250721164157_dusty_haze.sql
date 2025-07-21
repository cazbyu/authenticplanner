/*
  # Create Notes Table for Key Relationships

  1. New Tables
    - `0007-ap-notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `key_relationship_id` (uuid, foreign key, nullable)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on notes table
    - Add policies for users to manage their own notes

  3. Relationships
    - Notes can be linked to key relationships
    - Foreign key constraint with cascade delete
*/

-- Create notes table
CREATE TABLE IF NOT EXISTS "0007-ap-notes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_relationship_id uuid,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "0007-ap-notes" 
ADD CONSTRAINT fk_notes_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-notes" 
ADD CONSTRAINT fk_notes_key_relationship 
FOREIGN KEY (key_relationship_id) REFERENCES "0007-ap-key-relationships"(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "0007-ap-notes" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own notes"
  ON "0007-ap-notes"
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_0007_ap_notes_updated_at
  BEFORE UPDATE ON "0007-ap-notes"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON "0007-ap-notes"(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_key_relationship_id ON "0007-ap-notes"(key_relationship_id);