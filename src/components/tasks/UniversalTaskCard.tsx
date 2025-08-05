import React from "react";

// Helper for sidebar color
function getPriorityColor(task: any) {
  if (task.status === "completed") return "bg-blue-500";
  if (task.is_urgent && task.is_important) return "bg-red-500";
  if (!task.is_urgent && task.is_important) return "bg-green-500";
  if (task.is_urgent && !task.is_important) return "bg-yellow-400";
  return "bg-gray-400";
}

interface UniversalTaskCardProps {
  task: {
    id: string;
    title: string;
    due_date?: string;
    is_urgent?: boolean;
    is_important?: boolean;
    roles?: string[];
    domains?: string[];
    // ...other fields
  };
  onOpen: (task: any) => void;
  onComplete?: (taskId: string) => void;
  onDelegate?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onFollowUp?: (taskId: string) => void;
}

const formatDueDate = (date?: string) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const UniversalTaskCard: React.FC<UniversalTaskCardProps> = ({
  task,
  onOpen,
  onComplete,
  onDelegate,
  onCancel,
  onFollowUp,
}) => {
  return (
    <div
      className="flex items-center justify-between border rounded-lg shadow bg-white mb-3 px-4 py-3 hover:shadow-md cursor-pointer transition"
      onClick={() => onOpen(task)}
    >
      {/* Sidebar */}
      <div
  className={`flex items-center justify-between border rounded-lg shadow bg-white mb-3 px-4 py-3 hover:shadow-md cursor-pointer transition border-l-8 ${getPriorityColor(task)}`}
  onClick={() => onOpen(task)}
>

      {/* Main content */}
      <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
        <div className="font-semibold text-lg mb-0.5 flex items-center gap-2">
          {task.title}
          {task.due_date && (
            <span className="text-xs text-gray-500 font-normal">
              ({formatDueDate(task.due_date)})
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {task.roles?.length > 0 && (
            <span className="text-xs font-semibold text-gray-500">R:</span>
          )}
          {task.roles?.map(role => (
            <span key={role} className="bg-gray-200 rounded-full px-2 py-0.5 text-xs">{role}</span>
          ))}
          {task.domains?.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 ml-2">D:</span>
          )}
          {task.domains?.map(domain => (
            <span key={domain} className="bg-purple-200 rounded-full px-2 py-0.5 text-xs">{domain}</span>
          ))}
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-3 ml-2 shrink-0">
        {onComplete && (
          <button
            className="hover:text-green-600"
            title="Complete"
            onClick={e => { e.stopPropagation(); onComplete(task.id); }}
          >✓</button>
        )}
        {onDelegate && (
          <button
            className="hover:text-blue-600"
            title="Delegate"
            onClick={e => { e.stopPropagation(); onDelegate(task.id); }}
          >👤+</button>
        )}
        {onFollowUp && (
  <button
    className="hover:text-indigo-600"
    title="Follow Up"
    onClick={e => { e.stopPropagation(); onFollowUp(task.id); }}
  >
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  </button>
)}
        {onCancel && (
          <button
            className="hover:text-red-600"
            title="Cancel"
            onClick={e => { e.stopPropagation(); onCancel(task.id); }}
          >✕</button>
        )}
      </div>
    </div>
  );
};

export default UniversalTaskCard;
