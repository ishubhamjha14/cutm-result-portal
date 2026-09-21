import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { ResultListItem, ResultListResponse } from '../../types';

export const ResultsManagerPage: React.FC = () => {
  const [resultsData, setResultsData] = useState<ResultListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>(undefined);
  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(undefined);
  const [selectedSession, setSelectedSession] = useState<string>('');
  
  const [branches, setBranches] = useState<{ id: number; code: string; name: string }[]>([]);
  const [semesters, setSemesters] = useState<{ id: number; semester_number: number; name: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ResultListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResultListItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Add Form State
  const [addForm, setAddForm] = useState({
    registration_number: '',
    student_name: '',
    branch_code: 'CSE',
    program_code: 'BTECH',
    academic_session: '2024-2028',
    semester: 1,
    subject_code: '',
    subject_name: '',
    credits: 4.0,
    grade: 'O',
    examination_month_year: 'DECEMBER-2025',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    credits: 4.0,
    grade: 'O',
    grade_point: 10.0,
    status: 'PASS',
    examination_month_year: 'DECEMBER-2025',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getResults({
        page,
        limit: 15,
        search: searchTerm || undefined,
        branch_id: selectedBranch,
        semester_id: selectedSemester,
        academic_session: selectedSession || undefined,
      });
      setResultsData(data);
      setSelectedIds([]);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to load results.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.getBranches().then(setBranches).catch(console.warn);
    api.getSemesters().then(setSemesters).catch(console.warn);
  }, []);

  useEffect(() => {
    loadData();
  }, [page, selectedBranch, selectedSemester, selectedSession]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleSelectAll = () => {
    if (!resultsData) return;
    if (selectedIds.length === resultsData.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resultsData.items.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Add Single Result Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createResult(addForm);
      setIsAddModalOpen(false);
      setActionSuccessMessage('Result record successfully created.');
      setAddForm({
        registration_number: '',
        student_name: '',
        branch_code: 'CSE',
        program_code: 'BTECH',
        academic_session: '2024-2028',
        semester: 1,
        subject_code: '',
        subject_name: '',
        credits: 4.0,
        grade: 'O',
        examination_month_year: 'DECEMBER-2025',
      });
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to create result.');
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.updateResult(editItem.id, editForm);
      setEditItem(null);
      setActionSuccessMessage('Result record successfully updated.');
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to update result.');
    }
  };

  // Delete Single Submit
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteResult(deleteTarget.id);
      setDeleteTarget(null);
      setActionSuccessMessage('Result record successfully deleted.');
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to delete result.');
    }
  };

  // Bulk Delete Submit
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.length === 0) return;
    try {
      const resp = await api.bulkDeleteResults(selectedIds);
      setIsBulkDeleteModalOpen(false);
      setActionSuccessMessage(`Successfully deleted ${resp.deleted_count} result records.`);
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Bulk delete failed.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const query = new URLSearchParams();
    if (selectedBranch) query.append('branch_id', selectedBranch.toString());
    if (selectedSemester) query.append('semester_id', selectedSemester.toString());
    if (selectedSession) query.append('academic_session', selectedSession);
    window.open(`/api/admin/results/export?${query.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Toast Feedback Banners */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{actionErrorMessage}</span>
          </div>
          <button onClick={() => setActionErrorMessage(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Student Result Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            View, edit, search, filter, and modify individual subject grades and credits.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Result</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white/95 dark:bg-slate-900/90 shadow-sm">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Reg No, Student Name, or Subject Code..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </form>

        {/* Branch Filter */}
        <select
          value={selectedBranch || ''}
          onChange={(e) => {
            setSelectedBranch(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} - {b.name}
            </option>
          ))}
        </select>

        {/* Semester Filter */}
        <select
          value={selectedSemester || ''}
          onChange={(e) => {
            setSelectedSemester(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="">All Semesters</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Results Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <button onClick={handleSelectAll} className="cursor-pointer text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    {resultsData && selectedIds.length === resultsData.items.length && resultsData.items.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Reg Number</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Branch</th>
                <th className="px-4 py-3.5 text-center">Sem</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5 text-center">Credits</th>
                <th className="px-4 py-3.5 text-center">Grade</th>
                <th className="px-4 py-3.5 text-center">Grade Point</th>
                <th className="px-4 py-3.5 text-center">Credit Points</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                      <span>Loading academic records...</span>
                    </div>
                  </td>
                </tr>
              ) : resultsData?.items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    No result records found matching your filters.
                  </td>
                </tr>
              ) : (
                resultsData?.items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isFail = item.grade === 'F' || item.status === 'FAIL';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors ${
                        isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.registration_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {item.student_name}
                      </td>
                      <td className="px-4 py-3">{item.branch_code}</td>
                      <td className="px-4 py-3 text-center font-mono">{item.semester}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold mr-1.5">
                          {item.subject_code}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">{item.subject_name}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium">
                        {item.credits.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold font-mono text-[11px] border ${
                            isFail
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : item.grade === 'O'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {item.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{item.grade_point.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {item.credit_points.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFail
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditItem(item);
                              setEditForm({
                                credits: item.credits,
                                grade: item.grade,
                                grade_point: item.grade_point,
                                status: item.status,
                                examination_month_year: item.examination_month_year,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Result"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete Result"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {resultsData && resultsData.total_pages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60">
            <span>
              Showing {((page - 1) * resultsData.limit) + 1} to{' '}
              {Math.min(page * resultsData.limit, resultsData.total)} of{' '}
              <strong className="text-slate-900 dark:text-white">{resultsData.total.toLocaleString()}</strong> results
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-bold text-slate-900 dark:text-white">
                {page} / {resultsData.total_pages}
              </span>
              <button
                disabled={page >= resultsData.total_pages}
                onClick={() => setPage((p) => Math.min(resultsData.total_pages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Result Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Add Individual Subject Result
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Registration No *</label>
                  <input
                    type="text"
                    required
                    value={addForm.registration_number}
                    onChange={(e) => setAddForm({ ...addForm, registration_number: e.target.value.toUpperCase() })}
                    placeholder="24CSE12345"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.student_name}
                    onChange={(e) => setAddForm({ ...addForm, student_name: e.target.value })}
                    placeholder="Shubham Kumar Jha"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Branch Code</label>
                  <select
                    value={addForm.branch_code}
                    onChange={(e) => setAddForm({ ...addForm, branch_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="CSE">CSE</option>
                    <option value="CSE-AIML">CSE-AIML</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Semester</label>
                  <select
                    value={addForm.semester}
                    onChange={(e) => setAddForm({ ...addForm, semester: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Batch Session</label>
                  <input
                    type="text"
                    value={addForm.academic_session}
                    onChange={(e) => setAddForm({ ...addForm, academic_session: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={addForm.subject_code}
                    onChange={(e) => setAddForm({ ...addForm, subject_code: e.target.value.toUpperCase() })}
                    placeholder="CSE3001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.subject_name}
                    onChange={(e) => setAddForm({ ...addForm, subject_name: e.target.value })}
                    placeholder="Machine Learning"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="20"
                    required
                    value={addForm.credits}
                    onChange={(e) => setAddForm({ ...addForm, credits: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Grade</label>
                  <select
                    value={addForm.grade}
                    onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  >
                    <option value="O">O (10 GP)</option>
                    <option value="E">E (9 GP)</option>
                    <option value="A">A (8 GP)</option>
                    <option value="B">B (7 GP)</option>
                    <option value="C">C (6 GP)</option>
                    <option value="D">D (5 GP)</option>
                    <option value="F">F (0 GP)</option>
                    <option value="M">M (Mal Practice)</option>
                    <option value="S">S (Absent)</option>
                    <option value="R">R (Repeat/Reappear)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Exam Month/Year</label>
                  <input
                    type="text"
                    value={addForm.examination_month_year}
                    onChange={(e) => setAddForm({ ...addForm, examination_month_year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Create Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Result Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Edit Student Result
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {editItem.registration_number} • {editItem.subject_code} (Sem {editItem.semester})
                </p>
              </div>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="20"
                    required
                    value={editForm.credits}
                    onChange={(e) => setEditForm({ ...editForm, credits: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Grade</label>
                  <select
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  >
                    <option value="O">O (10 GP)</option>
                    <option value="E">E (9 GP)</option>
                    <option value="A">A (8 GP)</option>
                    <option value="B">B (7 GP)</option>
                    <option value="C">C (6 GP)</option>
                    <option value="D">D (5 GP)</option>
                    <option value="F">F (0 GP)</option>
                    <option value="M">M (Mal Practice)</option>
                    <option value="S">S (Absent)</option>
                    <option value="R">R (Repeat/Reappear)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="BACKLOG">BACKLOG</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Exam Session</label>
                  <input
                    type="text"
                    value={editForm.examination_month_year}
                    onChange={(e) => setEditForm({ ...editForm, examination_month_year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Confirm Result Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Are you sure you want to delete the result record for student{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{deleteTarget.registration_number}</strong>{' '}
              in subject <strong className="text-slate-900 dark:text-white font-mono">{deleteTarget.subject_code}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-600/25"
              >
                Delete Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Confirm Bulk Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently delete selected results</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Are you sure you want to delete all <strong className="text-rose-600 dark:text-rose-400 font-bold">{selectedIds.length}</strong> selected result entries?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-600/25"
              >
                Confirm Bulk Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
