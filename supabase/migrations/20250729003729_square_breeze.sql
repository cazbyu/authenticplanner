/*
  # Create Missing Notes Junction Tables

  1. New Tables
    - `0007-ap-note-roles` - Junction table linking notes to roles
    - `0007-ap-note-key-relationships` - Junction table linking notes to key relationships (already exists)
    - `0007-ap-note-domains` - Junction table linking notes to domains
    - `0007-ap-note-delegates` - Junction table linking notes to delegates
    - `0007-ap-note-deposit-ideas` - Junction table linking notes to deposit ideas

  2. Security
    - Enable RLS on all new junction tables
    - Add policies for users to manage their own note relationships

  3. Relationships
    - Proper foreign key constraints with cascade delete
    - Unique constraints to prevent duplicate relationships
*/

-- Create note-roles junction table
CREATE TABLE IF NOT EXISTS "0007-ap-note-roles" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, role_id)
);

-- Create note-domains junction table
CREATE TABLE IF NOT EXISTS "0007-ap-note-domains" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, domain_id)
);

-- Create note-delegates junction table
CREATE TABLE IF NOT EXISTS "0007-ap-note-delegates" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  delegate_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, delegate_id)
);

-- Create note-deposit-ideas junction table
CREATE TABLE IF NOT EXISTS "0007-ap-note-deposit-ideas" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  deposit_idea_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, deposit_idea_id)
);

-- Add foreign key constraints for note-roles
ALTER TABLE "0007-ap-note-roles" 
ADD CONSTRAINT fk_note_roles_note 
FOREIGN KEY (note_id) REFERENCES "0007-ap-notes"(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-note-roles" 
ADD CONSTRAINT fk_note_roles_role 
FOREIGN KEY (role_id) REFERENCES "0007-ap-roles"(id) ON DELETE CASCADE;

-- Add foreign key constraints for note-domains
ALTER TABLE "0007-ap-note-domains" 
ADD CONSTRAINT fk_note_domains_note 
FOREIGN KEY (note_id) REFERENCES "0007-ap-notes"(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-note-domains" 
ADD CONSTRAINT fk_note_domains_domain 
FOREIGN KEY (domain_id) REFERENCES "0007-ap-domains"(id) ON DELETE CASCADE;

-- Add foreign key constraints for note-delegates
ALTER TABLE "0007-ap-note-delegates" 
ADD CONSTRAINT fk_note_delegates_note 
FOREIGN KEY (note_id) REFERENCES "0007-ap-notes"(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-note-delegates" 
ADD CONSTRAINT fk_note_delegates_delegate 
FOREIGN KEY (delegate_id) REFERENCES "0007-ap-delegates"(id) ON DELETE CASCADE;

-- Add foreign key constraints for note-deposit-ideas
ALTER TABLE "0007-ap-note-deposit-ideas" 
ADD CONSTRAINT fk_note_deposit_ideas_note 
FOREIGN KEY (note_id) REFERENCES "0007-ap-notes"(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-note-deposit-ideas" 
ADD CONSTRAINT fk_note_deposit_ideas_deposit_idea 
FOREIGN KEY (deposit_idea_id) REFERENCES "0007-ap-deposit-ideas"(id) ON DELETE CASCADE;

-- Enable RLS on all junction tables
ALTER TABLE "0007-ap-note-roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "0007-ap-note-domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "0007-ap-note-delegates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "0007-ap-note-deposit-ideas" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for note-roles
CREATE POLICY "Users can manage their own note roles"
  ON "0007-ap-note-roles"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for note-domains
CREATE POLICY "Users can manage their own note domains"
  ON "0007-ap-note-domains"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for note-delegates
CREATE POLICY "Users can manage their own note delegates"
  ON "0007-ap-note-delegates"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for note-deposit-ideas
CREATE POLICY "Users can manage their own note deposit ideas"
  ON "0007-ap-note-deposit-ideas"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-notes" 
      WHERE id = note_id AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_note_roles_note_id ON "0007-ap-note-roles"(note_id);
CREATE INDEX IF NOT EXISTS idx_note_roles_role_id ON "0007-ap-note-roles"(role_id);
CREATE INDEX IF NOT EXISTS idx_note_domains_note_id ON "0007-ap-note-domains"(note_id);
CREATE INDEX IF NOT EXISTS idx_note_domains_domain_id ON "0007-ap-note-domains"(domain_id);
CREATE INDEX IF NOT EXISTS idx_note_delegates_note_id ON "0007-ap-note-delegates"(note_id);
CREATE INDEX IF NOT EXISTS idx_note_delegates_delegate_id ON "0007-ap-note-delegates"(delegate_id);
CREATE INDEX IF NOT EXISTS idx_note_deposit_ideas_note_id ON "0007-ap-note-deposit-ideas"(note_id);
CREATE INDEX IF NOT EXISTS idx_note_deposit_ideas_deposit_idea_id ON "0007-ap-note-deposit-ideas"(deposit_idea_id);