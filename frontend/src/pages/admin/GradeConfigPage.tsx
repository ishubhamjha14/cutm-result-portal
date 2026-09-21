import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, AlertTriangle, X, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { GradeConfigItem } from '../../types';

export const GradeConfigPage: React.FC = () => {
  const [grades, setGrades] = useState<GradeConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<GradeConfigItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeConfigItem | null>(null);
  
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    grade_letter: '',
    grade_point: 8.0,
    description: 'Very Good',
    min_marks: 70.0,
    max_marks: 79.9,
    is_active: true,
  });

  const [editForm, setEditForm] = useState({
    grade_point: 8.0,
    description: 'Very Good',
    min_marks: 70.0,
    max_marks: 79.9,
    is_active: true,
  });

  const loadGrades = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGrades();
      setGrades(data);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to load grade scales.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGrade(addForm);
      setIsAddModalOpen(false);
      setActionSuccessMessage(`Grade ${addForm.grade_letter} successfully created.`);
      setAddForm({
        grade_letter: '',
        grade_point: 8.0,
        description: 'Very Good',
        min_marks: 70.0,
        max_marks: 79.9,
        is_active: true,
      });
      loadGrades();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to create grade scale.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.updateGrade(editItem.id, editForm);
      setEditItem(null);
      setActionSuccessMessage(`Grade ${editItem.grade_letter} configuration updated.`);
      loadGrades();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to update grade scale.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteGrade(deleteTarget.id);
      setDeleteTarget(null);
      setActionSuccessMessage(`Grade scale ${deleteTarget.grade_letter} deleted.`);
      loadGrades();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to delete grade scale.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
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
            Dynamic Grade Point Scale Configuration
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Define and fine-tune letter grade mappings. The calculation engine recalculates SGPA and CGPA dynamically from these values.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Letter Grade</span>
        </button>
      </div>

      {/* Informational Callout */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-900 dark:text-white block">Real-time Calculation Synchronized</strong>
          <span>
            When you adjust grade point mappings, all subsequent student marksheet lookups immediately evaluate with the updated scale.
          </span>
        </div>
      </div>

      {/* Normal Grades Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider border border-indigo-500/20">
              Normal Grades (Academic Scale)
            </span>
            <span className="text-xs text-slate-500">O (10) → F (0)</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Letter Grade</th>
                  <th className="px-4 py-3.5 text-center">Grade Point (GP)</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-center">Marks Range</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                        <span>Loading grade scales...</span>
                      </div>
                    </td>
                  </tr>
                ) : grades.filter((g) => !['M', 'S', 'R'].includes(g.grade_letter)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No normal grade scales defined.
                    </td>
                  </tr>
                ) : (
                  grades
                    .filter((g) => !['M', 'S', 'R'].includes(g.grade_letter))
                    .map((grade) => (
                      <tr key={grade.id} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-300">
                            {grade.grade_letter}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {grade.grade_point.toFixed(1)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-medium">
                          {grade.description}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                          {grade.min_marks.toFixed(1)}% - {grade.max_marks.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              grade.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {grade.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditItem(grade);
                                setEditForm({
                                  grade_point: grade.grade_point,
                                  description: grade.description,
                                  min_marks: grade.min_marks,
                                  max_marks: grade.max_marks,
                                  is_active: grade.is_active,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(grade)}
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
      </div>

      {/* Special Statuses Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider border border-amber-500/20">
              Special Status (Non-Grade Status Values)
            </span>
            <span className="text-xs text-slate-500">M (Mal Practice), S (Absent), R (Repeat/Reappear)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
          <strong>Non-Grade Point Status Policy:</strong> Special statuses represent official examination status designations. They do NOT automatically receive grade points or earned credits unless explicitly configured by the administrator.
        </div>

        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Status Code</th>
                  <th className="px-4 py-3.5 text-center">Configured GP</th>
                  <th className="px-4 py-3.5">Status Meaning</th>
                  <th className="px-4 py-3.5 text-center">Classification</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Loading special statuses...
                    </td>
                  </tr>
                ) : grades.filter((g) => ['M', 'S', 'R'].includes(g.grade_letter)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No special statuses defined.
                    </td>
                  </tr>
                ) : (
                  grades
                    .filter((g) => ['M', 'S', 'R'].includes(g.grade_letter))
                    .map((grade) => (
                      <tr key={grade.id} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                            grade.grade_letter === 'R'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : grade.grade_letter === 'M'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}>
                            {grade.grade_letter}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {grade.grade_point.toFixed(1)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-medium">
                          {grade.description}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                          Special Status Flag
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              grade.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {grade.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditItem(grade);
                                setEditForm({
                                  grade_point: grade.grade_point,
                                  description: grade.description,
                                  min_marks: grade.min_marks,
                                  max_marks: grade.max_marks,
                                  is_active: grade.is_active,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(grade)}
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
      </div>

      {/* Add Grade Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Add Letter Grade Scale
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Grade Letter *</label>
                  <input
                    type="text"
                    required
                    value={addForm.grade_letter}
                    onChange={(e) => setAddForm({ ...addForm, grade_letter: e.target.value.toUpperCase() })}
                    placeholder="O / E / A / B"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Grade Point *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={addForm.grade_point}
                    onChange={(e) => setAddForm({ ...addForm, grade_point: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Description</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="Outstanding / Very Good"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Min Marks %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.min_marks}
                    onChange={(e) => setAddForm({ ...addForm, min_marks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Max Marks %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.max_marks}
                    onChange={(e) => setAddForm({ ...addForm, max_marks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
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
                  Save Scale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Grade Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Edit Grade Scale ({editItem.grade_letter})
              </h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Grade Point (GP)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={editForm.grade_point}
                  onChange={(e) => setEditForm({ ...editForm, grade_point: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Min Marks %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.min_marks}
                    onChange={(e) => setEditForm({ ...editForm, min_marks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase">Max Marks %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.max_marks}
                    onChange={(e) => setEditForm({ ...editForm, max_marks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
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
                  Update Scale
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
                Delete Grade Scale
              </h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Are you sure you want to delete grade scale <strong className="text-slate-900 dark:text-white font-mono font-bold">'{deleteTarget.grade_letter}'</strong>?
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
                Delete Grade Scale
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
