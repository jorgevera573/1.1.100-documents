'use client';

import { FormEvent, useState } from 'react';

interface MetadataEditorProps {
  document: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MetadataEditor({ document, onSuccess, onCancel }: MetadataEditorProps) {
  const [nombre, setNombre] = useState(document.nombre);
  const [descripcion, setDescripcion] = useState(document.descripcion || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const id = document._id?.toString() || document._id;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          descripcion,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Update failed');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={loading}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">{error}</div>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md font-medium hover:bg-gray-400 disabled:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
