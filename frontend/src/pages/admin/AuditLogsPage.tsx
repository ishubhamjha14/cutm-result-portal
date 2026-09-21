import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { AuditLogItem } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs({
        page,
        limit: 20,
        action: selectedAction || undefined,
        search: searchTerm || undefined,
      });
      setLogs(data.items);
      setTotalPages(data.total_pages);
      setTotalCount(data.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN_SUCCESS')) {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('FAILED') || action.includes('DELETE')) {
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
    }
    if (action.includes('IMPORT') || action.includes('CREATE')) {
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
    }
    if (action.includes('UPDATE')) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    }
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Administrative Audit Trail & Security Logs
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Immutable log of all examination result publications, student modifications, and administrative logins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
            Total Logged Events: <strong className="text-slate-900 dark:text-white">{totalCount}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white/95 dark:bg-slate-900/90 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Admin Email, Action, IP Address, or Details..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </form>

        <select
          value={selectedAction}
          onChange={(e) => {
            setSelectedAction(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="IMPORT_RESULTS">IMPORT_RESULTS</option>
          <option value="CREATE_RESULT">CREATE_RESULT</option>
          <option value="UPDATE_RESULT">UPDATE_RESULT</option>
          <option value="DELETE_RESULT">DELETE_RESULT</option>
          <option value="BULK_DELETE_RESULTS">BULK_DELETE_RESULTS</option>
          <option value="UPDATE_GRADE_CONFIG">UPDATE_GRADE_CONFIG</option>
          <option value="CREATE_STUDENT">CREATE_STUDENT</option>
        </select>

        <button
          onClick={loadLogs}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-40">Timestamp</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Admin Email</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">Details</th>
                <th className="px-4 py-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                      <span>Loading audit stream...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No audit records matching query filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 dark:text-slate-200">
                      {log.admin_email}
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-300">
                      {log.entity_type ? `${log.entity_type} ${log.entity_id ? `(#${log.entity_id})` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-md">
                      <span className="line-clamp-2">{log.details || '-'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60">
            <span>
              Showing page {page} of {totalPages} ({totalCount} total audit entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-900 font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
