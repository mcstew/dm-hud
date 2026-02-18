import React, { useState, useEffect } from 'react';
import { IconFilter, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import * as dbOps from '../lib/db';

export default function AILogsView({ userId = null, compact = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [functionFilter, setFunctionFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = compact ? 20 : 50;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await dbOps.adminFetchAILogs({
        userId: userId || undefined,
        functionType: functionFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load AI logs:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [userId, functionFilter, page]);

  const FUNCTION_TYPES = ['entity_extraction', 'riff', 'report', 'polish'];
  const FUNCTION_COLORS = {
    entity_extraction: 'text-indigo-400 bg-indigo-900/30',
    riff: 'text-amber-400 bg-amber-900/30',
    report: 'text-emerald-400 bg-emerald-900/30',
    polish: 'text-pink-400 bg-pink-900/30',
  };

  return (
    <div>
      {!compact && <h2 className="text-2xl font-bold text-white mb-6">AI Logs</h2>}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex items-center gap-2">
          <IconFilter size={14} className="text-gray-500" />
          <select
            value={functionFilter}
            onChange={(e) => { setFunctionFilter(e.target.value); setPage(0); }}
            className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All types</option>
            {FUNCTION_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-gray-900/30 border border-gray-800 rounded-lg overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
                >
                  {expandedId === log.id ? <IconChevronDown size={14} className="text-gray-500" /> : <IconChevronRight size={14} className="text-gray-500" />}

                  <span className={`text-xs px-2 py-0.5 rounded ${FUNCTION_COLORS[log.function_type] || 'text-gray-400 bg-gray-800'}`}>
                    {log.function_type.replace('_', ' ')}
                  </span>

                  {!userId && log.profiles && (
                    <span className="text-xs text-gray-400">{log.profiles.display_name || log.profiles.email}</span>
                  )}

                  <span className="text-xs text-gray-500 ml-auto">
                    {log.tokens_in && `${log.tokens_in}→${log.tokens_out} tokens`}
                    {log.duration_ms && ` · ${log.duration_ms}ms`}
                  </span>

                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>

                  {log.error && <span className="text-xs text-red-400">Error</span>}
                </button>

                {/* Expanded detail */}
                {expandedId === log.id && (
                  <div className="px-4 pb-4 border-t border-gray-800 space-y-3">
                    {log.error && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <p className="text-xs text-red-300 font-mono">{log.error}</p>
                      </div>
                    )}

                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1">User Prompt</p>
                      <pre className="text-xs text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">{log.user_prompt}</pre>
                    </div>

                    {log.response_text && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">Response</p>
                        <pre className="text-xs text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">{log.response_text}</pre>
                      </div>
                    )}

                    {log.parsed_result && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">Parsed Result</p>
                        <pre className="text-xs text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">{JSON.stringify(log.parsed_result, null, 2)}</pre>
                      </div>
                    )}

                    {log.system_prompt && (
                      <details className="text-xs">
                        <summary className="text-gray-500 cursor-pointer hover:text-gray-300">System prompt</summary>
                        <pre className="text-gray-400 bg-gray-950 border border-gray-800 rounded-lg p-3 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">{log.system_prompt}</pre>
                      </details>
                    )}

                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Model: {log.model}</span>
                      <span>ID: {log.id.slice(0, 8)}...</span>
                      {log.campaign_id && <span>Campaign: {log.campaign_id.slice(0, 8)}...</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {logs.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No logs found</p>}

          {/* Pagination */}
          {logs.length === PAGE_SIZE && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-gray-500 text-xs">Page {page + 1}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-xs"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
