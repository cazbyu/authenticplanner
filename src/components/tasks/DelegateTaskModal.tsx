import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { X, User, Phone, Mail, FileText } from 'lucide-react';

interface DelegateTaskModalProps {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onDelegated: () => void;
}

interface DelegateForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const DelegateTaskModal: React.FC<DelegateTaskModalProps> = ({
  taskId,
  taskTitle,
  onClose,
  onDelegated
}) => {
  const [form, setForm] = useState<DelegateForm>({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Check if delegate already exists for this user by name
      const { data: existingDelegate, error: delegateQueryError } = await supabase
        .from('0007-ap-delegates')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', form.name.trim())
        .maybeSingle();

      if (delegateQueryError) {
        console.error('Error querying delegate:', delegateQueryError);
        setError('Failed to check existing delegate');
        return;
      }
      let delegateId: string;

      if (existingDelegate) {
        // Use existing delegate ID
        delegateId = existingDelegate.id;
        
        // Update the existing delegate with new information if provided
        const updateData: any = {};
        if (form.phone.trim() && !existingDelegate.phone) {
          updateData.phone = form.phone.trim();
        }
        if (form.email.trim() && !existingDelegate.email) {
          updateData.email = form.email.trim();
        }
        if (form.notes.trim()) {
          updateData.notes = form.notes.trim();
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('0007-ap-delegates')
            .update(updateData)
            .eq('id', delegateId);
          
          if (updateError) {
            console.error('Error updating delegate:', updateError);
            // Don't fail the whole operation for this
          }
        }
      } else {
        // Create new delegate
        const { data: newDelegate, error: delegateError } = await supabase
          .from('0007-ap-delegates')
          .insert([{
            user_id: user.id,
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            notes: form.notes.trim() || null
          }])
          .select()
          .single();

        if (delegateError || !newDelegate) {
          console.error('Error creating delegate:', delegateError);
          setError('Failed to create delegate contact');
          return;
        }

        delegateId = newDelegate.id;
      }

      // Update the task with delegation information
      const { error: taskError } = await supabase
        .from('0007-ap-tasks')
        .update({
          delegated_to_contact_id: delegateId,
          completion_action: 'delegate',
          status: 'delegated',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (taskError) {
        console.error('Error updating task:', taskError);
        setError('Failed to delegate task');
        return;
      }

      toast.success(`Task delegated to ${form.name}`);
      onDelegated();

    } catch (err) {
      console.error('Error delegating task:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Delegate Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Task:</strong> {taskTitle}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-1" />
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter delegate's name"
              required
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter email address"
            />
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="h-4 w-4 inline mr-1" />
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any notes about this delegation..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Delegating...' : 'Delegate Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DelegateTaskModal;