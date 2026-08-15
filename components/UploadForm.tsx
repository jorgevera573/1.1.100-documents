'use client';

import { FormEvent, ChangeEvent, useState } from 'react';

interface UploadFormProps {
  onSuccess: () => void;
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setSuccess('Document uploaded successfully!');
      (e.target as HTMLFormElement).reset();
      setTimeout(() => {
        setSuccess('');
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Document</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          File *
        </label>
        <input
          type="file"
          name="archivo"
          required
          disabled={loading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name *
        </label>
        <input
          type="text"
          name="nombre"
          required
          disabled={loading}
          placeholder="Enter document name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          name="descripcion"
          disabled={loading}
          placeholder="Enter document description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-md">{success}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
