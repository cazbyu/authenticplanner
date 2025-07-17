import React, { useState, useEffect } from 'react';
import { Plus, Check, UserPlus, X } from 'lucide-react';
import TaskEventForm from '../components/tasks/TaskEventForm';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { Task } from '../types';

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface DbTask extends Task {
  date: string | null;
  time: string | null;
  task_roles: { role_id: string }[];
  task_domains: { domain_id: string }[];
}

function Tasks() {
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('0007-ap-roles')
      .select('id, label')
      .eq('user_id', user.id);

    if (rolesData) {
      const rolesMap = rolesData.reduce((acc, role) => ({
        ...acc,
        [role.id]: role
      }), {});
      setRoles(rolesMap);
    }

    // Fetch domains
    const { data: domainsData } = await supabase
      .from('0007-ap-domains')
      .select('id, name');

    if (domainsData) {
      const domainsMap = domainsData.reduce((acc, domain) => ({
        ...acc,
        [domain.id]: domain
      }), {});
      setDomains(domainsMap);
    }

    // Fetch tasks with relationships
    const { data: tasksData } = await supabase
      .from('0007-ap-tasks')
      .select(`
        *,
        task_roles:0007-ap-task_roles(role_id),
        task_domains:0007-ap-task_domains(domain_id)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (tasksData) {
      setTasks(tasksData);
    }

    setLoading(false);
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel') => {
    const updates: any = {
      status: action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'pending',
    };
    
    if (action === 'complete') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('0007-ap-tasks')
      .update(updates)
      .eq('id', taskId);

    if (!error) {
      if (action === 'complete') {
        setTasks(tasks.filter(t => t.id !== taskId));
      } else {
        fetchInitialData();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc: Record<string, DbTask[]>, task) => {
    const date = task.date ? format(new Date(task.date), 'yyyy-MM-dd') : 'No Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        <button
          onClick={() => setShowTaskEventForm(true)}
          className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </button>
      </div>

      {showTaskEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskEventForm
              onClose={() => setShowTaskEventForm(false)}
              availableRoles={Object.values(roles)}
              availableDomains={Object.values(domains)}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(tasksByDate).map(([date, dateTasks]) => (
          <div key={date} className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-medium text-gray-700">
              {date === 'No Date' ? 'No Date' : format(new Date(date), 'MMMM d, yyyy')}
            </h3>
            <div className="space-y-2">
              {dateTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleTaskAction(task.id, 'complete')}
                      className="rounded-full border border-gray-300 p-1 hover:bg-green-100 hover:text-green-600"
                      title="Complete"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleTaskAction(task.id, 'delegate')}
                      className="rounded-full border border-gray-300 p-1 hover:bg-blue-100 hover:text-blue-600"
                      title="Delegate"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleTaskAction(task.id, 'cancel')}
                      className="rounded-full border border-gray-300 p-1 hover:bg-red-100 hover:text-red-600"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{task.title}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {task.task_roles?.map(({ role_id }) => (
                          roles[role_id] && (
                            <span key={role_id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {roles[role_id].label}
                            </span>
                          )
                        ))}
                        {task.task_domains?.map(({ domain_id }) => (
                          domains[domain_id] && (
                            <span key={domain_id} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                              {domains[domain_id].name}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                  {task.time && (
                    <span className="text-sm text-gray-500">
                      {format(new Date(`2000-01-01T${task.time}`), 'h:mm a')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tasks;