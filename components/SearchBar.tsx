'use client';

import { FormEvent, useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSearch(query);
  }

  function handleClear() {
    setQuery('');
    onSearch('');
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or description..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md font-medium hover:bg-gray-400"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
