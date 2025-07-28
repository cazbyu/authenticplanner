/*
  # Rename deposit idea roles table

  1. Changes
    - Rename `0007-ap-deposit-idea-roles` to `0007-ap-roles-deposit-ideas`
    - Update all foreign key constraints
    - Update all RLS policies
    - Maintain data integrity

  2. Security
    - Preserve all existing RLS policies
    - Maintain user access controls
*/

-- Rename the table
ALTER TABLE IF EXISTS "0007-ap-deposit-idea-roles" 
RENAME TO "0007-ap-roles-deposit-ideas";

-- Update any indexes that reference the old table name
DROP INDEX IF EXISTS idx_deposit_idea_roles_deposit_idea_id;
DROP INDEX IF EXISTS idx_deposit_idea_roles_role_id;

CREATE INDEX IF NOT EXISTS idx_roles_deposit_ideas_deposit_idea_id 
ON "0007-ap-roles-deposit-ideas"(deposit_idea_id);

CREATE INDEX IF NOT EXISTS idx_roles_deposit_ideas_role_id 
ON "0007-ap-roles-deposit-ideas"(role_id);

-- Update any policies that reference the old table name
DROP POLICY IF EXISTS "Users can manage their own deposit idea roles" ON "0007-ap-roles-deposit-ideas";

CREATE POLICY "Users can manage their own roles deposit ideas"
  ON "0007-ap-roles-deposit-ideas"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-deposit-ideas" 
      WHERE id = deposit_idea_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-deposit-ideas" 
      WHERE id = deposit_idea_id AND user_id = auth.uid()
    )
  );