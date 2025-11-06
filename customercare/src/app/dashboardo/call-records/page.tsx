'use client';

import { useState, useEffect } from 'react';
import api from '@/app/services/axios';
import { useRouter } from 'next/navigation';

export default function CallRecords() {
  const router = useRouter();
  const [view, setView] = useState<'calls' | 'analysis'>('calls');
  const [search, setSearch] = useState('');
  const [calls, setCalls] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get('/auth/verify-token-organizer/', { withCredentials: true });
      } catch (error) {
        router.push('/logino/');
      }
    };

    async function fetchAll() {
      try {
        const response = await api.get('/datarecords/', { withCredentials: true });
        setCalls(response.data.Calls.sort((a, b) => b.id - a.id));
        setAnalysis(response.data.analyses.sort((a, b) => b.id - a.id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
    fetchAll();
  }, []);

  const filterRows = (rows, keys) =>
    rows.filter((row) =>
      keys.some((k) =>
        String(row[k]).toLowerCase().includes(search.toLowerCase())
      )
    );

  const callColumns = [
    { key: 'id', label: 'ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'duration', label: 'Duration' },
    { key: 'status', label: 'Status' },
    { key: 'sentiment_score', label: 'Sentiment Score' },
    { key: 'user', label: 'User ID' },
  ];

  const analysisColumns = [
    { key: 'id', label: 'ID' },
    { key: 'employee_sentiment', label: 'Employee Sentiment' },
    { key: 'emotion', label: 'Emotion' },
    { key: 'confidence_score', label: 'Confidence Score' },
    { key: 'call', label: 'Call ID' },
    { key: 'user', label: 'User ID' },
  ];

  const fullRows = view === 'calls'
    ? filterRows(calls, callColumns.map(c => c.key))
    : filterRows(analysis, analysisColumns.map(c => c.key));

  const columns = view === 'calls' ? callColumns : analysisColumns;

  // Pagination
  const totalPages = Math.ceil(fullRows.length / rowsPerPage);
  const rows = fullRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Interaction Records</h1>
          <p className="text-gray-600">Detailed call and sentiment analysis history</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  view === 'calls' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
                onClick={() => { setView('calls'); setCurrentPage(1); }}
              >
                Call Records
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  view === 'analysis' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
                onClick={() => { setView('analysis'); setCurrentPage(1); }}
              >
                Sentiments & Emotions
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search records..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length > 0 ? (
                  rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {columns.map(col => {
                        let value = String(row[col.key]);

                        if (col.key === 'sentiment_score' || col.key === 'confidence_score') {
                          const score = parseFloat(value);
                          const color =
                            score > 0.7 ? 'text-green-600' : score < 0.3 ? 'text-red-600' : 'text-gray-600';
                          return (
                            <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${color}`}>
                              {score.toFixed(2)}
                            </td>
                          );
                        }

                        if (col.key === 'status') {
                          const statusColor =
                            value === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : value === 'in-progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800';
                          return (
                            <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                {value}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'emotion') {
                          return (
                            <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                              {value}
                            </td>
                          );
                        }

                        return (
                          <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting your search query</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="px-3 py-1 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="px-3 py-1 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
