import React from "react";

// Example types. Adjust these if your project uses different ones:
interface UniversalTaskCardProps {
  task: {
    id: string;
    title: string;
    due_date?: string;
    tags?: string[]; // Add domains/roles here as needed
    roles?: string[];
    domains?: string[];
    // ...other task fields
  };
  onOpen: (task: any) => void;
  onComplete?: (taskId: string) => void;
  onDelegate?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
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
}) => {
  return (
    <div
      className="flex items-center justify-between border rounded-lg shadow bg-white mb-3 px-4 py-3 hover:shadow-md cursor-pointer transition"
      onClick={() => onOpen(task)}
    >
      {/* Left colored bar */}
      <div className="w-1 h-full rounded-l bg-blue-500 mr-4" />
      {/* Main task info */}
      <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
        <div className="font-semibold text-lg mb-0.5">{task.title}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3M16 7V3M4 11h16M5 21h14a2 2 0 002-2v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" /></svg>
            Due {formatDueDate(task.due_date)}
          </span>
        </div>
        {/* Roles/domains as chips (optional) */}
        <div className="flex flex-wrap gap-2">
          {task.roles?.map(role => (
            <span key={role} className="bg-gray-200 rounded-full px-2 py-0.5 text-xs">{role}</span>
          ))}
          {task.domains?.map(domain => (
            <span key={domain} className="bg-purple-200 rounded-full px-2 py-0.5 text-xs">{domain}</span>
          ))}
        </div>
      </div>
      {/* Actions (right side) */}
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
