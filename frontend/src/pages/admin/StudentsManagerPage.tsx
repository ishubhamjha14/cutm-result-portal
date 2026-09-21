import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { StudentListItem, StudentListResponse } from '../../types';

export const StudentsManagerPage: React.FC = () => {
  const [studentsData, setStudentsData] = useState<StudentListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>(undefined);
  const [branches, setBranches] = useState<{ id: number; code: string; name: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: number; code: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<StudentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(null);
  
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    registration_number: '',
    name: '',
    branch_id: 1,
    program_id: 1,
    academic_session: '2024-2028',
    campus: 'Bhubaneswar Campus',
    email: '',
    phone: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    academic_session: '2024-2028',
    campus: 'Bhubaneswar Campus',
    email: '',
    phone: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStudents({
        page,
        limit: 15,
        search: searchTerm || undefined,
        branch_id: selectedBranch,
      });
      setStudentsData(data);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to load student roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.getBranches().then((b) => {
      setBranches(b);
      if (b.length > 0) setAddForm((prev) => ({ ...prev, branch_id: b[0].id }));
    }).catch(console.warn);
    api.getPrograms().then((p) => {
      setPrograms(p);
      if (p.length > 0) setAddForm((prev) => ({ ...prev, program_id: p[0].id }));
    }).catch(console.warn);
  }, []);

  useEffect(() => {
    loadData();
  }, [page, selectedBranch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStudent(addForm);
      setIsAddModalOpen(false);
      setActionSuccessMessage(`Student ${addForm.registration_number} successfully registered.`);
      setAddForm({
        registration_number: '',
        name: '',
        branch_id: branches[0]?.id || 1,
        program_id: programs[0]?.id || 1,
        academic_session: '2024-2028',
        campus: 'Bhubaneswar Campus',
        email: '',
        phone: '',
      });
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to create student.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.updateStudent(editItem.id, editForm);
      setEditItem(null);
      setActionSuccessMessage('Student metadata updated.');
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to update student.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      setActionSuccessMessage(`Student ${deleteTarget.registration_number} and records deleted.`);
      loadData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to delete student.');
    }
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Student Roster & Academic Registry
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            University enrolled student profiles, branch affiliations, and cumulative CGPA summaries.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white/95 dark:bg-slate-900/90 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Registration Number, Student Name, or Email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </form>

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

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Students Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Reg Number</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Discipline / Branch</th>
                <th className="px-4 py-3.5">Program</th>
                <th className="px-4 py-3.5">Session / Batch</th>
                <th className="px-4 py-3.5 text-center">Results Count</th>
                <th className="px-4 py-3.5 text-center">Cumulative CGPA</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                      <span>Loading student roster...</span>
                    </div>
                  </td>
                </tr>
              ) : studentsData?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No student records found.
                  </td>
                </tr>
              ) : (
                studentsData?.items.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {student.registration_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-300">{student.branch_code}</span> - {student.branch_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {student.program_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {student.academic_session}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {student.total_results_count} subjects
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.current_cgpa ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-mono font-bold text-xs">
                          {student.current_cgpa.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditItem(student);
                            setEditForm({
                              name: student.name,
                              academic_session: student.academic_session,
                              campus: student.campus,
                              email: student.email || '',
                              phone: student.phone || '',
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(student)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Register New Student
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
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Branch</label>
                  <select
                    value={addForm.branch_id}
                    onChange={(e) => setAddForm({ ...addForm, branch_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Program</label>
                  <select
                    value={addForm.program_id}
                    onChange={(e) => setAddForm({ ...addForm, program_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Batch Session</label>
                  <input
                    type="text"
                    value={addForm.academic_session}
                    onChange={(e) => setAddForm({ ...addForm, academic_session: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Campus</label>
                  <input
                    type="text"
                    value={addForm.campus}
                    onChange={(e) => setAddForm({ ...addForm, campus: e.target.value })}
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
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Edit Student Profile
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {editItem.registration_number}
                </p>
              </div>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Batch Session</label>
                  <input
                    type="text"
                    value={editForm.academic_session}
                    onChange={(e) => setEditForm({ ...editForm, academic_session: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Campus</label>
                  <input
                    type="text"
                    value={editForm.campus}
                    onChange={(e) => setEditForm({ ...editForm, campus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Delete Student Profile
              </h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Deleting student <strong className="text-slate-900 dark:text-white font-mono">{deleteTarget.registration_number}</strong> ({deleteTarget.name}) will also delete all associated semester results.
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
                Delete Student Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
