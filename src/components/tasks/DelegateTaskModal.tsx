import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { X } from "lucide-react";

interface DelegateTaskModalProps {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onDelegated: () => void;
}

const DelegateTaskModal: React.FC<DelegateTaskModalProps> = ({
  taskId,
  taskTitle,
  onClose,
  onDelegated,
}) => {
  const [delegateName, setDelegateName] = useState("");
  const [delegateEmail, setDelegateEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Insert into delegated table
      const { error: insertError } = await supabase
        .from("0007-ap-delegated")
        .insert([
          {
            task_id: taskId,
            name: delegateName,
            email: delegateEmail,
            notes: notes,
            delegated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        setError(insertError.message || "Error saving delegation");
        setSaving(false);
        return;
      }

      // Optionally, also update the task status to 'delegated' in tasks table
      const { error: updateError } = await supabase
        .from("0007-ap-tasks")
        .update({
          status: "delegated",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (updateError) {
        setError(updateError.message || "Error updating task status");
        setSaving(false);
        return;
      }

      setSaving(false);
      onDelegated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        {/* X Close Button */}
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-bold mb-4">Delegate Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-gray-700 mb-1 font-medium">Task</label>
            <div className="bg-gray-100 rounded px-3 py-2">{taskTitle}</div>
          </div>
          <div className="mb-3">
            <label className="block text-gray-700 mb-1 font-medium">Delegate Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={delegateName}
              onChange={e => setDelegateName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-gray-700 mb-1 font-medium">Delegate Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={delegateEmail}
              onChange={e => setDelegateEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">Notes (optional)</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && (
            <div className="text-red-500 mb-2">{error}</div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="text-gray-600 px-4 py-2 rounded hover:bg-gray-100"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? "Delegating..." : "Delegate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DelegateTaskModal;
