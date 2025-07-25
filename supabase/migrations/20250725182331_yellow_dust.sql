@@ .. @@
 -- Create goal tasks table
-CREATE TABLE IF NOT EXISTS "0007-ap-goal-tasks" (
+CREATE TABLE IF NOT EXISTS "0007-ap-tasks-12wkgoals" (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   goal_id uuid NOT NULL,
   weekly_goal_id uuid,
   task_id uuid NOT NULL,
   created_at timestamptz DEFAULT now(),
   UNIQUE(goal_id, task_id)
 );
@@ .. @@
-ALTER TABLE "0007-ap-goal-tasks" 
+ALTER TABLE "0007-ap-tasks-12wkgoals" 
 ADD CONSTRAINT fk_goal_tasks_goal 
-FOREIGN KEY (goal_id) REFERENCES "0007-ap-goals-12wk-main"(id) ON DELETE CASCADE;
+FOREIGN KEY (goal_id) REFERENCES "0007-ap-goals-12wk"(id) ON DELETE CASCADE;

-ALTER TABLE "0007-ap-goal-tasks" 
+ALTER TABLE "0007-ap-tasks-12wkgoals" 
 ADD CONSTRAINT fk_goal_tasks_weekly_goal 
 FOREIGN KEY (weekly_goal_id) REFERENCES "0007-ap-goal-weekly-goals"(id) ON DELETE CASCADE;

-ALTER TABLE "0007-ap-goal-tasks" 
+ALTER TABLE "0007-ap-tasks-12wkgoals" 
 ADD CONSTRAINT fk_goal_tasks_task 
 FOREIGN KEY (task_id) REFERENCES "0007-ap-tasks"(id) ON DELETE CASCADE;
@@ .. @@
-ALTER TABLE "0007-ap-goal-tasks" ENABLE ROW LEVEL SECURITY;
+ALTER TABLE "0007-ap-tasks-12wkgoals" ENABLE ROW LEVEL SECURITY;
@@ .. @@
 -- Create RLS policies for goal tasks
 CREATE POLICY "Users can manage their own goal tasks"
-  ON "0007-ap-goal-tasks"
+  ON "0007-ap-tasks-12wkgoals"
   FOR ALL
   TO authenticated
   USING (
     EXISTS (
-      SELECT 1 FROM "0007-ap-goals-12wk-main" 
+      SELECT 1 FROM "0007-ap-goals-12wk" 
       WHERE id = goal_id AND user_id = auth.uid()
     )
   )
   WITH CHECK (
     EXISTS (
-      SELECT 1 FROM "0007-ap-goals-12wk-main" 
+      SELECT 1 FROM "0007-ap-goals-12wk" 
       WHERE id = goal_id AND user_id = auth.uid()
     )
   );
@@ .. @@
-CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_id ON "0007-ap-goal-tasks"(goal_id);
+CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_id ON "0007-ap-tasks-12wkgoals"(goal_id);