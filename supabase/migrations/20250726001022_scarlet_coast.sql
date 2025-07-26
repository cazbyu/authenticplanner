/*
  # Create Task Notes System

  1. New Tables
    - `0007-ap-task-notes` - Junction table linking tasks to notes
    - `0007-ap-goal-notes` - Junction table linking 12-week goals to notes

  2. Changes
    - Remove notes column from tasks table (will be handled via join table)
    - All notes stored centrally in existing `0007-ap-notes` table

  3. Security
    - Enable RLS on new junction tables
    - Add policies for users to manage their own task-note relationships

  4. Relationships
    - Tasks can have multiple notes via junction table
    - 12-week goals can have multiple notes via junction table
    - Notes can be linked to multiple tasks/goals if needed
*/

-- Create task-notes junction table
CREATE TABLE IF NOT EXISTS "0007-ap-task-notes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  note_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, note_id)
);

-- Create goal-notes junction table
CREATE TABLE IF NOT EXISTS "0007-ap-goal-notes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  note_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, note_id)
);

-- Add foreign key constraints for task-notes
ALTER TABLE "0007-ap-task-notes" 
ADD CONSTRAINT fk_task_notes_task 
FOREIGN KEY (task_id) REFERENCES "0007-ap-tasks"(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-task-notes" 
ADD CONSTRAINT fk_task_notes_note 
FOREIGN KEY (note_id) REFERENCES "0007-ap-notes"(id) ON DELETE CASCADE;

-- Add foreign key constraints for goal-notes
ALTER TABLE "0007-ap-goal-notes" 
ADD CONSTRAINT fk_goal_notes_goal 
FOREIGN KEY (goal_id) REFERENCES "0007-ap-goals-12wk"(id) ON DELETE CASCADE;

ALTER TABLE "0007-ap-goal-notes" 
ADD CONSTRAINT fk_goal_notes_note 
FOREIGN KEY (note_id) REFERENCES "0007-ap-notes"(id) ON DELETE CASCADE;

-- Enable RLS on junction tables
ALTER TABLE "0007-ap-task-notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "0007-ap-goal-notes" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task-notes
CREATE POLICY "Users can manage their own task notes"
  ON "0007-ap-task-notes"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-tasks" 
      WHERE id = task_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-tasks" 
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for goal-notes
CREATE POLICY "Users can manage their own goal notes"
  ON "0007-ap-goal-notes"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "0007-ap-goals-12wk" 
      WHERE id = goal_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "0007-ap-goals-12wk" 
      WHERE id = goal_id AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON "0007-ap-task-notes"(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_note_id ON "0007-ap-task-notes"(note_id);
CREATE INDEX IF NOT EXISTS idx_goal_notes_goal_id ON "0007-ap-goal-notes"(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_notes_note_id ON "0007-ap-goal-notes"(note_id);