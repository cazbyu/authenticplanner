/*
  # Add unique constraint to onboarding_responses table

  1. Changes
    - Add unique constraint on `user_id` column in `0007-ap-onboarding_responses` table
    - This enables upsert operations using ON CONFLICT with user_id

  2. Security
    - No changes to existing RLS policies
    - Maintains data integrity by ensuring one response record per user
*/

-- Add unique constraint to user_id column in onboarding_responses table
ALTER TABLE "0007-ap-onboarding_responses" 
ADD CONSTRAINT unique_onboarding_responses_user_id UNIQUE (user_id);