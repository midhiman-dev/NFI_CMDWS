import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, ChevronLeft } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiButton } from '../../components/design-system/NfiButton';
import { NfiModal } from '../../components/design-system/NfiModal';
import { NfiField } from '../../components/design-system/NfiField';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import { Link } from 'react-router-dom';
import type { DatasetRegistry } from '../../types';

export function DatasetRegistryPage() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [items, setItems] = useState<DatasetRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    sourceTable: '',
    refreshFrequency: 'Daily' as const,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await provider.listDatasetRegistry();
      setItems(data);
    } catch (error) {
      console.error('Error loading datasets:', error);
      showToast('Failed to load dataset registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingId) {
        await provider.updateDataset(editingId, formData);
        showToast('Dataset updated', 'success');
      } else {
        await provider.createDataset(formData);
        showToast('Dataset created', 'success');
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadItems();
    } catch (error) {
      console.error('Error saving dataset:', error);
      showToast('Failed to save dataset', 'error');
    }
  };

  const handleEdit = (item: DatasetRegistry) => {
    setEditingId(item.id);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      sourceTable: item.sourceTable || '',
      refreshFrequency: item.refreshFrequency,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;

    try {
      await provider.deleteDataset(id);
      showToast('Dataset deleted', 'success');
      loadItems();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      showToast('Failed to delete dataset', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      sourceTable: '',
      refreshFrequency: 'Daily',
      isActive: true,
    });
    setErrors({});
  };

  const handleOpenModal = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/reporting" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ChevronLeft size={20} />
            Back
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Dataset Registry</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Configure data sources and refresh schedules</p>
        </div>

        <NfiCard>
          <div className="space-y-4">
            <div className="flex justify-end">
              <NfiButton onClick={handleOpenModal} variant="primary">
                <Plus size={16} />
                Add Dataset
              </NfiButton>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
                <p className="text-[var(--nfi-text-secondary)]">Loading datasets...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--nfi-text-secondary)]">No datasets yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nfi-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Code</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Source Table</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Refresh</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                        <td className="py-3 px-4 text-[var(--nfi-text)] font-medium">{item.code}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text)]">{item.name}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-xs">
                          {item.sourceTable || '—'}
                        </td>
                        <td className="py-3 px-4 text-[var(--nfi-text)]">
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs font-medium">
                            {item.refreshFrequency}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              item.isActive
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} className="text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </NfiCard>

        <NfiModal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingId ? 'Edit Dataset' : 'Add Dataset'}
        >
          <div className="space-y-4">
            <NfiField label="Code" required error={errors.code}>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                placeholder="e.g., DS_001"
              />
            </NfiField>

            <NfiField label="Name" required error={errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                placeholder="Enter dataset name"
              />
            </NfiField>

            <NfiField label="Source Table">
              <input
                type="text"
                value={formData.sourceTable}
                onChange={(e) => setFormData({ ...formData, sourceTable: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                placeholder="e.g., cases, reports"
              />
            </NfiField>

            <NfiField label="Refresh Frequency">
              <select
                value={formData.refreshFrequency}
                onChange={(e) => setFormData({ ...formData, refreshFrequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </NfiField>

            <NfiField label="Description">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                placeholder="Enter description (optional)"
                rows={3}
              />
            </NfiField>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm text-[var(--nfi-text)]">
                Active
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </NfiModal>
      </div>
    </Layout>
  );
}
