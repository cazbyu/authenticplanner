import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import TaskCard from "./TaskCard";

export default function TaskList() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }
      const userId = user.id;
      // Fetch tasks, joining roles/domains
      const { data, error } = await supabase
  .from("0007-ap-tasks")
  .select(`
    id, user_id, task, is_authentic_deposit, is_twelve_week_goal, is_urgent, is_important, priority_number,
    date, time, duration, notes, status, created_at, updated_at,
    task_roles:0007-ap-task_roles (role_id),
    task_domains:0007-ap-task_domains (domain_id)
  `)
  .eq("user_id", userId)
  .order("date", { ascending: true });

      if (error) {
        setTasks([]);
      } else {
        // Optionally, map role/domain IDs to labels/names if you want
        setTasks(data);
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
