/*
  # Rename tables to use 0007-ap- prefix

  1. Tables to rename
    - `onboarding_responses` → `0007-ap-onboarding-responses`
    - `onboarding_goals` → `0007-ap-onboarding-goals`
  
  2. Update policies and triggers
    - Drop old policies before renaming
    - Recreate policies with new table names
    - Update triggers with new naming convention
*/

-- First, drop existing policies on the original tables
DROP POLICY IF EXISTS "Users can read own onboarding responses" ON onboarding_responses;
DROP POLICY IF EXISTS "Users can insert own onboarding responses" ON onboarding_responses;
DROP POLICY IF EXISTS "Users can update own onboarding responses" ON onboarding_responses;

DROP POLICY IF EXISTS "Users can read own onboarding goals" ON onboarding_goals;
DROP POLICY IF EXISTS "Users can insert own onboarding goals" ON onboarding_goals;
DROP POLICY IF EXISTS "Users can update own onboarding goals" ON onboarding_goals;
DROP POLICY IF EXISTS "Users can delete own onboarding goals" ON onboarding_goals;

-- Drop existing triggers on the original tables
DROP TRIGGER IF EXISTS update_onboarding_responses_updated_at ON onboarding_responses;
DROP TRIGGER IF EXISTS update_onboarding_goals_updated_at ON onboarding_goals;

-- Now rename the tables
ALTER TABLE IF EXISTS onboarding_responses RENAME TO "0007-ap-onboarding-responses";
ALTER TABLE IF EXISTS onboarding_goals RENAME TO "0007-ap-onboarding-goals";

-- Enable RLS on the renamed tables (in case it was disabled during rename)
ALTER TABLE "0007-ap-onboarding-responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "0007-ap-onboarding-goals" ENABLE ROW LEVEL SECURITY;

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

-- Recreate triggers with new table names and updated naming convention
CREATE TRIGGER update_0007_ap_onboarding_responses_updated_at
  BEFORE UPDATE ON "0007-ap-onboarding-responses"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_0007_ap_onboarding_goals_updated_at
  BEFORE UPDATE ON "0007-ap-onboarding-goals"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();