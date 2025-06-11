/*
  # Fix table naming consistency for onboarding tables

  This migration ensures that onboarding tables follow the 0007-ap- naming convention.
  It checks for existing tables and only performs operations that are needed.
*/

-- Check if old tables exist and rename them if they do
-- If they don't exist, the tables are likely already renamed

DO $$
BEGIN
  -- Check if onboarding_responses exists and rename it
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_responses') THEN
    -- Drop policies on old table first
    DROP POLICY IF EXISTS "Users can read own onboarding responses" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can insert own onboarding responses" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can update own onboarding responses" ON onboarding_responses;
    
    -- Drop triggers on old table
    DROP TRIGGER IF EXISTS update_onboarding_responses_updated_at ON onboarding_responses;
    
    -- Rename the table
    ALTER TABLE onboarding_responses RENAME TO "0007-ap-onboarding-responses";
    
    -- Enable RLS
    ALTER TABLE "0007-ap-onboarding-responses" ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
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
    
    -- Create new trigger
    CREATE TRIGGER update_0007_ap_onboarding_responses_updated_at
      BEFORE UPDATE ON "0007-ap-onboarding-responses"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
      
    RAISE NOTICE 'Renamed onboarding_responses to 0007-ap-onboarding-responses';
  ELSE
    RAISE NOTICE 'Table onboarding_responses does not exist - likely already renamed';
  END IF;

  -- Check if onboarding_goals exists and rename it
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_goals') THEN
    -- Drop policies on old table first
    DROP POLICY IF EXISTS "Users can read own onboarding goals" ON onboarding_goals;
    DROP POLICY IF EXISTS "Users can insert own onboarding goals" ON onboarding_goals;
    DROP POLICY IF EXISTS "Users can update own onboarding goals" ON onboarding_goals;
    DROP POLICY IF EXISTS "Users can delete own onboarding goals" ON onboarding_goals;
    
    -- Drop triggers on old table
    DROP TRIGGER IF EXISTS update_onboarding_goals_updated_at ON onboarding_goals;
    
    -- Rename the table
    ALTER TABLE onboarding_goals RENAME TO "0007-ap-onboarding-goals";
    
    -- Enable RLS
    ALTER TABLE "0007-ap-onboarding-goals" ENABLE ROW LEVEL SECURITY;
    
    -- Create new policies
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
    
    -- Create new trigger
    CREATE TRIGGER update_0007_ap_onboarding_goals_updated_at
      BEFORE UPDATE ON "0007-ap-onboarding-goals"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
      
    RAISE NOTICE 'Renamed onboarding_goals to 0007-ap-onboarding-goals';
  ELSE
    RAISE NOTICE 'Table onboarding_goals does not exist - likely already renamed';
  END IF;
END $$;

-- Ensure the renamed tables have proper policies and triggers even if they already existed
-- This is idempotent and safe to run multiple times

-- Ensure RLS is enabled on the correctly named tables
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '0007-ap-onboarding-responses') THEN
    ALTER TABLE "0007-ap-onboarding-responses" ENABLE ROW LEVEL SECURITY;
    
    -- Ensure policies exist (these will only be created if they don't already exist)
    CREATE POLICY IF NOT EXISTS "Users can read own onboarding responses"
      ON "0007-ap-onboarding-responses"
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert own onboarding responses"
      ON "0007-ap-onboarding-responses"
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update own onboarding responses"
      ON "0007-ap-onboarding-responses"
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '0007-ap-onboarding-goals') THEN
    ALTER TABLE "0007-ap-onboarding-goals" ENABLE ROW LEVEL SECURITY;
    
    -- Ensure policies exist (these will only be created if they don't already exist)
    CREATE POLICY IF NOT EXISTS "Users can read own onboarding goals"
      ON "0007-ap-onboarding-goals"
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert own onboarding goals"
      ON "0007-ap-onboarding-goals"
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update own onboarding goals"
      ON "0007-ap-onboarding-goals"
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete own onboarding goals"
      ON "0007-ap-onboarding-goals"
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;