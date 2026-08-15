'use client';

import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import SearchBar from '@/components/SearchBar';
import DocumentList from '@/components/DocumentList';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">📄 Document Manager</h1>
          <p className="text-gray-600 mt-1">Upload, search, and manage your documents</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <UploadForm onSuccess={handleUploadSuccess} />
          </div>

          <div className="lg:col-span-2">
            <SearchBar onSearch={handleSearch} />
            <DocumentList searchQuery={searchQuery} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
}
