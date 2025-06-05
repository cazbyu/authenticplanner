import React from "react";

// Example props interface (customize as needed for your schema)
interface TaskCardProps {
  task: {
    id: string;
    task: string;
    is_authentic_deposit?: boolean;
    is_twelve_week_goal?: boolean;
    is_urgent?: boolean;
    is_important?: boolean;
    priority_number?: number;
    roles?: { id: string; label: string }[];
    domains?: string[];
    date?: string;
    time?: string;
    duration?: string;
    notes?: string;
    status?: string;
    delegated_to?: string;
    follow_up_at?: string;
    // Add any additional fields you use
  };
  onEdit?: (task: any) => void;
  onDelete?: (taskId: string) => void;
  onMarkComplete?: (taskId: string) => void;
}

const domainColors: Record<string, string> = {
  Physical: "bg-green-200 text-green-900",
  Intellectual: "bg-blue-200 text-blue-900",
  Social: "bg-pink-200 text-pink-900",
  Emotional: "bg-yellow-200 text-yellow-900",
  Spiritual: "bg-purple-200 text-purple-900",
  Financial: "bg-orange-200 text-orange-900",
  Recreational: "bg-teal-200 text-teal-900",
  Community: "bg-gray-200 text-gray-900",
};

export default function TaskCard({ task, onEdit, onDelete, onMarkComplete }: TaskCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 mb-4 border-l-4
      ${task.is_authentic_deposit ? "border-green-500" : task.is_twelve_week_goal ? "border-blue-500" : "border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>
            {task.task}
          </span>
          {task.is_authentic_deposit && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
              Authentic Deposit
            </span>
          )}
          {task.is_twelve_week_goal && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              12-Week Goal
            </span>
          )}
          {task.is_urgent && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              Urgent
            </span>
          )}
          {task.is_important && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
              Important
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              title="Edit Task"
              className="text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
              onClick={() => onEdit(task)}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              title="Delete Task"
              className="text-red-600 hover:bg-red-100 px-2 py-1 rounded"
              onClick={() => onDelete(task.id)}
            >
              Delete
            </button>
          )}
          {onMarkComplete && task.status !== "completed" && (
            <button
              title="Mark Complete"
              className="text-green-600 hover:bg-green-100 px-2 py-1 rounded"
              onClick={() => onMarkComplete(task.id)}
            >
              ✓
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {(task.roles || []).map(role =>
          <span key={role.id} className="bg-gray-200 px-2 py-0.5 rounded text-xs">{role.label}</span>
        )}
        {(task.domains || []).map(domain =>
          <span
            key={domain}
            className={`px-2 py-0.5 rounded text-xs font-semibold ${domainColors[domain] || "bg-gray-100 text-gray-700"}`}>
            {domain}
          </span>
        )}
      </div>

      <div className="flex gap-6 mt-2 text-sm text-gray-700">
        {task.date && (
          <span>
            <span className="font-medium">Date:</span> {task.date}
          </span>
        )}
        {task.time && (
          <span>
            <span className="font-medium">Time:</span> {task.time}
          </span>
        )}
        {task.duration && (
          <span>
            <span className="font-medium">Duration:</span> {task.duration}
          </span>
        )}
        {task.priority_number && (
          <span>
            <span className="font-medium">Priority:</span> {task.priority_number}
          </span>
        )}
        {task.delegated_to && (
          <span>
            <span className="font-medium">Delegated to:</span> {task.delegated_to}
          </span>
        )}
        {task.follow_up_at && (
          <span>
            <span className="font-medium">Follow up:</span> {task.follow_up_at}
          </span>
        )}
      </div>

      {task.notes && (
        <div className="mt-2 text-xs text-gray-600 border-t pt-2">
          <span className="font-semibold">Notes:</span> {task.notes}
        </div>
      )}
    </div>
  );
}
