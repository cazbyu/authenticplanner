/*
  # Add follow_up column to tasks table

  1. Changes
    - Add follow_up column to 0007-ap-tasks table to store follow-up date/time
    - Column is nullable timestamptz type

  2. Security
    - No changes to existing RLS policies
    - Column inherits existing table permissions
*/

-- Add follow_up column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '0007-ap-tasks' AND column_name = 'follow_up'
  ) THEN
    ALTER TABLE "0007-ap-tasks" ADD COLUMN follow_up timestamptz;
  END IF;
END $$;

-- Create index for better performance on follow_up queries
CREATE INDEX IF NOT EXISTS idx_tasks_follow_up ON "0007-ap-tasks"(follow_up) WHERE follow_up IS NOT NULL;