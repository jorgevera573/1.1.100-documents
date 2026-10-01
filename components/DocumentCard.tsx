'use client';

import { useState } from 'react';
import type { DocumentDTO } from '@/lib/types';
import MetadataEditor from './MetadataEditor';

interface DocumentCardProps {
  document: DocumentDTO;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

export default function DocumentCard({ document: doc, onDelete, onUpdate }: DocumentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const id = doc._id?.toString() || doc._id;

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      onDelete(id);
    } catch {
      alert('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/documents/${id}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.nombre || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch {
      alert('Failed to download document');
    } finally {
      setIsDownloading(false);
    }
  }

  const fileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
      <div className="min-w-0 break-words bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {isEditing ? (
        <MetadataEditor
          document={doc}
          onSuccess={() => {
            setIsEditing(false);
            onUpdate();
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{doc.nombre}</h3>
            {doc.descripcion && (
              <p className="text-gray-600 text-sm mb-3">{doc.descripcion}</p>
            )}
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                <strong>Size:</strong> {fileSize(doc.tamaño)}
              </p>
              <p>
                <strong>Uploaded:</strong> {formatDate(doc.fecha)}
              </p>
              <p>
                <strong>Type:</strong> {doc.contentType || 'unknown'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md font-medium hover:bg-amber-700 text-sm"
            >
              Edit
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400 text-sm"
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:bg-gray-400 text-sm"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
