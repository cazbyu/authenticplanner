/*
  # Rename tables to use 0007-ap- prefix

  1. Table Renames
    - `onboarding_responses` → `0007-ap-onboarding-responses`
    - `onboarding_goals` → `0007-ap-onboarding-goals`
    - `users` → `0007-ap-users` (if exists)

  2. Update Foreign Key References
    - Update all foreign key constraints to reference new table names
    - Maintain referential integrity

  3. Security
    - Recreate RLS policies with new table names
    - Maintain same security model
*/

-- Rename onboarding_responses to 0007-ap-onboarding-responses
ALTER TABLE IF EXISTS onboarding_responses RENAME TO "0007-ap-onboarding-responses";

-- Rename onboarding_goals to 0007-ap-onboarding-goals  
ALTER TABLE IF EXISTS onboarding_goals RENAME TO "0007-ap-onboarding-goals";

-- Update any foreign key constraints that reference the old table names
-- (Note: The current schema doesn't show foreign keys to these tables, but this is for future-proofing)

-- Update RLS policies for renamed tables
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can read own onboarding responses" ON "0007-ap-onboarding-responses";
DROP POLICY IF EXISTS "Users can insert own onboarding responses" ON "0007-ap-onboarding-responses";
DROP POLICY IF EXISTS "Users can update own onboarding responses" ON "0007-ap-onboarding-responses";

DROP POLICY IF EXISTS "Users can read own onboarding goals" ON "0007-ap-onboarding-goals";
DROP POLICY IF EXISTS "Users can insert own onboarding goals" ON "0007-ap-onboarding-goals";
DROP POLICY IF EXISTS "Users can update own onboarding goals" ON "0007-ap-onboarding-goals";
DROP POLICY IF EXISTS "Users can delete own onboarding goals" ON "0007-ap-onboarding-goals";

-- Recreate policies with correct table names
CREATE POLICY "Users can read own onboarding responses"
  ON "0007-ap-onboarding-responses"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding responses"
  ON "0007-ap-onboarding-responses"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding responses"
  ON "0007-ap-onboarding-responses"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own onboarding goals"
  ON "0007-ap-onboarding-goals"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding goals"
  ON "0007-ap-onboarding-goals"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding goals"
  ON "0007-ap-onboarding-goals"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding goals"
  ON "0007-ap-onboarding-goals"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update triggers to use new table names
DROP TRIGGER IF EXISTS update_onboarding_responses_updated_at ON "0007-ap-onboarding-responses";
DROP TRIGGER IF EXISTS update_onboarding_goals_updated_at ON "0007-ap-onboarding-goals";

CREATE TRIGGER update_0007_ap_onboarding_responses_updated_at
  BEFORE UPDATE ON "0007-ap-onboarding-responses"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_0007_ap_onboarding_goals_updated_at
  BEFORE UPDATE ON "0007-ap-onboarding-goals"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();