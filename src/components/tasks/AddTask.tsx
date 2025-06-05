import React, { useState } from "react";
import TaskForm from "./TaskForm";

export default function AddTask({ onTaskAdded }: { onTaskAdded?: () => void }) {
  const [showForm, setShowForm] = useState(false);

  const handleSave = () => {
    setShowForm(false);
    if (onTaskAdded) onTaskAdded();
  };

  return (
    <div>
      {!showForm && (
        <button
          className="bg-primary-500 text-white px-4 py-2 rounded"
          onClick={() => setShowForm(true)}
        >
          + Add Task
        </button>
      )}
      {showForm && (
        <TaskForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
