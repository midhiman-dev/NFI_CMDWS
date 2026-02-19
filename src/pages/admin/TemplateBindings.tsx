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
import type { TemplateBinding, TemplateRegistry, KpiCatalog, DatasetRegistry } from '../../types';

export function TemplateBindingsPage() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [bindings, setBindings] = useState<TemplateBinding[]>([]);
  const [templates, setTemplates] = useState<TemplateRegistry[]>([]);
  const [kpis, setKpis] = useState<KpiCatalog[]>([]);
  const [datasets, setDatasets] = useState<DatasetRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    templateId: '',
    kpiId: '',
    datasetId: '',
    fieldName: '',
    sortOrder: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bindingsData, templatesData, kpisData, datasetsData] = await Promise.all([
        provider.listTemplateBindings(),
        provider.listTemplateRegistry(),
        provider.listKpiCatalog(),
        provider.listDatasetRegistry(),
      ]);
      setBindings(bindingsData);
      setTemplates(templatesData);
      setKpis(kpisData);
      setDatasets(datasetsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load bindings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.templateId) {
      newErrors.templateId = 'Template is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingId) {
        await provider.updateTemplateBinding(editingId, {
          templateId: formData.templateId,
          kpiId: formData.kpiId || undefined,
          datasetId: formData.datasetId || undefined,
          fieldName: formData.fieldName || undefined,
          sortOrder: formData.sortOrder,
        });
        showToast('Binding updated', 'success');
      } else {
        await provider.createTemplateBinding({
          templateId: formData.templateId,
          kpiId: formData.kpiId || undefined,
          datasetId: formData.datasetId || undefined,
          fieldName: formData.fieldName || undefined,
          sortOrder: formData.sortOrder,
        });
        showToast('Binding created', 'success');
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving binding:', error);
      showToast('Failed to save binding', 'error');
    }
  };

  const handleEdit = (item: TemplateBinding) => {
    setEditingId(item.id);
    setFormData({
      templateId: item.templateId,
      kpiId: item.kpiId || '',
      datasetId: item.datasetId || '',
      fieldName: item.fieldName || '',
      sortOrder: item.sortOrder,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this binding?')) return;

    try {
      await provider.deleteTemplateBinding(id);
      showToast('Binding deleted', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting binding:', error);
      showToast('Failed to delete binding', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      templateId: '',
      kpiId: '',
      datasetId: '',
      fieldName: '',
      sortOrder: 0,
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

  const getTemplateName = (id: string) => templates.find(t => t.id === id)?.name || id;
  const getKpiName = (id: string) => kpis.find(k => k.id === id)?.name || id;
  const getDatasetName = (id: string) => datasets.find(d => d.id === id)?.name || id;

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
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Template Bindings</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Map KPIs and datasets to templates</p>
        </div>

        <NfiCard>
          <div className="space-y-4">
            <div className="flex justify-end">
              <NfiButton onClick={handleOpenModal} variant="primary">
                <Plus size={16} />
                Add Binding
              </NfiButton>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
                <p className="text-[var(--nfi-text-secondary)]">Loading bindings...</p>
              </div>
            ) : bindings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--nfi-text-secondary)]">No bindings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nfi-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Template</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">KPI</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Dataset</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Field Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Sort</th>
                      <th className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bindings.map((binding) => (
                      <tr key={binding.id} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                        <td className="py-3 px-4 text-[var(--nfi-text)] font-medium">{getTemplateName(binding.templateId)}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text)] text-xs">{binding.kpiId ? getKpiName(binding.kpiId) : '—'}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text)] text-xs">{binding.datasetId ? getDatasetName(binding.datasetId) : '—'}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-xs">{binding.fieldName || '—'}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text)]">{binding.sortOrder}</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(binding)}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} className="text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(binding.id)}
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
          title={editingId ? 'Edit Binding' : 'Add Binding'}
        >
          <div className="space-y-4">
            <NfiField label="Template" required error={errors.templateId}>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              >
                <option value="">Select a template</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </NfiField>

            <NfiField label="KPI">
              <select
                value={formData.kpiId}
                onChange={(e) => setFormData({ ...formData, kpiId: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              >
                <option value="">Select a KPI (optional)</option>
                {kpis.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.code})</option>
                ))}
              </select>
            </NfiField>

            <NfiField label="Dataset">
              <select
                value={formData.datasetId}
                onChange={(e) => setFormData({ ...formData, datasetId: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              >
                <option value="">Select a dataset (optional)</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </NfiField>

            <NfiField label="Field Name">
              <input
                type="text"
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                placeholder="e.g., total_cases, approval_rate"
              />
            </NfiField>

            <NfiField label="Sort Order">
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                placeholder="0"
              />
            </NfiField>

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
