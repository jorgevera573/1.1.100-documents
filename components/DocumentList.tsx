'use client';

import { useEffect, useState } from 'react';
import DocumentCard from './DocumentCard';
import type { DocumentDTO } from '@/lib/types';

interface DocumentListProps {
  searchQuery: string;
  refreshTrigger: number;
}

export default function DocumentList({ searchQuery, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('q', searchQuery);
        }
        params.append('limit', '50');

        const response = await fetch(`/api/documents?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch documents');
        }

        setDocuments(result.data || []);
        setTotal(result.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [searchQuery, refreshTrigger]);

  function handleDelete(id: string) {
    setDocuments(documents.filter((doc) => (doc._id?.toString() || doc._id) !== id));
    setTotal(total - 1);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading documents...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">Error: {error}</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {searchQuery ? 'No documents match your search.' : 'No documents found. Upload one to get started!'}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        {searchQuery ? `Search Results` : 'All Documents'} ({total})
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <DocumentCard
            key={doc._id?.toString() || doc._id}
            document={doc}
            onDelete={handleDelete}
            onUpdate={() => {
              // Trigger refresh by re-fetching
              const params = new URLSearchParams();
              if (searchQuery) {
                params.append('q', searchQuery);
              }
              params.append('limit', '50');

              fetch(`/api/documents?${params.toString()}`)
                .then((res) => res.json())
                .then((result) => {
                  setDocuments(result.data || []);
                  setTotal(result.total || 0);
                })
                .catch((err) => console.error('Refresh error:', err));
            }}
          />
        ))}
      </div>
    </div>
  );
}
