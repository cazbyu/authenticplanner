import React from "react";
import TaskForm from "./TaskForm";

export default function EditTask({ task, onTaskUpdated, onCancel }: {
  task: any;
  onTaskUpdated?: () => void;
  onCancel: () => void;
}) {
  return (
    <TaskForm
      initialTask={task}
      onSave={onTaskUpdated}
      onCancel={onCancel}
    />
  );
}
