// src/components/calendar/EventFormModal.tsx
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

interface EventFormModalProps {
  initialStart: string; // ISO string from dateClick
  initialEnd: string;
  onClose: () => void;
  onSaved: () => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({
  initialStart,
  initialEnd,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      const selected = e.target.files[0];
      // limit to 10MB
      if (selected.size / 1024 / 1024 > 10) {
        setError('File size must be under 10MB.');
        return;
      }
      setError(null);
      setFile(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setLoading(true);

    let fileUrl: string | null = null;
    // 1) If a file is selected, upload it to Supabase Storage
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${supabase.auth.user()?.id ?? 'anon'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('calendar-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        setError('File upload failed.');
        setLoading(false);
        return;
      }
      // Get public URL (since bucket is public)
      const { publicURL } = supabase.storage
        .from('calendar-attachments')
        .getPublicUrl(filePath);
      fileUrl = publicURL;
    }

    // 2) Insert event into Supabase
    const { error: insertError } = await supabase
      .from('0007-ap-calendar-events')
      .insert([
        {
          user_id: supabase.auth.user()?.id,
          title: title.trim(),
          description: description.trim() || null,
          start_time: startTime,
          end_time: endTime || null,
          all_day: false,
          is_task_linked: false,
          file_url: fileUrl,
        },
      ]);

    if (insertError) {
      setError('Failed to save event.');
      setLoading(false);
      return;
    }

    // 3) Done – call onSaved() to refresh the calendar, then close
    setLoading(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">New Event</h2>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium mb-1">Start Time *</label>
            <input
              type="datetime-local"
              value={startTime.slice(0, 16)} // "YYYY-MM-DDTHH:mm"
              onChange={(e) =>
                setStartTime(new Date(e.target.value).toISOString())
              }
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime.slice(0, 16)}
              onChange={(e) =>
                setEndTime(new Date(e.target.value).toISOString())
              }
              className="w-full rounded border px-3 py-2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border px-3 py-2"
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Attachment (max 10MB)
            </label>
            <input
              type="file"
              accept=".jpg,.png,.pdf,.docx"
              onChange={handleFileChange}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary-600 px-4 py-1 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;
