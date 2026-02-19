import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiBadge } from '../../components/design-system/NfiBadge';
import { NfiButton } from '../../components/design-system/NfiButton';
import { NfiField } from '../../components/design-system/NfiField';
import { NfiModal } from '../../components/design-system/NfiModal';
import { useToast } from '../../components/design-system/Toast';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const MILESTONES = [3, 6, 9, 12, 18, 24];
const METRIC_TYPES = ['BOOLEAN', 'TEXT'];

export function FollowupMetrics() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    milestoneMonths: 3,
    metricName: '',
    metricType: 'BOOLEAN',
    allowNa: false,
    displayOrder: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await adminService.getFollowupMetricDefinitions();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
      showToast('Failed to load metrics', 'error');
    }
  };

  const handleCreate = () => {
    setEditingMetric(null);
    setFormData({
      milestoneMonths: 3,
      metricName: '',
      metricType: 'BOOLEAN',
      allowNa: false,
      displayOrder: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (metric: any) => {
    setEditingMetric(metric);
    setFormData({
      milestoneMonths: metric.milestoneMonths,
      metricName: metric.metricName,
      metricType: metric.metricType,
      allowNa: metric.allowNa,
      displayOrder: metric.displayOrder,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.metricName) {
      showToast('Please enter metric name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMetric) {
        await adminService.updateFollowupMetricDefinition(editingMetric.definitionId, formData);
        showToast('Metric updated successfully', 'success');
      } else {
        await adminService.createFollowupMetricDefinition(formData);
        showToast('Metric created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving metric:', error);
      showToast(error.message || 'Failed to save metric', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (definitionId: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;

    try {
      await adminService.deleteFollowupMetricDefinition(definitionId);
      showToast('Metric deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error deleting metric:', error);
      showToast(error.message || 'Failed to delete metric', 'error');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Follow-up Metrics</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Define metrics for milestone-based follow-ups</p>
          </div>
          <NfiButton onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            Add Metric
          </NfiButton>
        </div>

        <NfiCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Milestone</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Metric Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Allow N/A</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.definitionId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4"><NfiBadge tone="accent">{metric.milestoneMonths}M</NfiBadge></td>
                    <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{metric.metricName}</td>
                    <td className="py-3 px-4"><NfiBadge tone="neutral">{metric.metricType}</NfiBadge></td>
                    <td className="py-3 px-4">
                      <NfiBadge tone={metric.allowNa ? 'success' : 'neutral'}>
                        {metric.allowNa ? 'Yes' : 'No'}
                      </NfiBadge>
                    </td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{metric.displayOrder}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(metric)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(metric.definitionId)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NfiCard>
      </div>

      <NfiModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMetric ? 'Edit Metric' : 'Create Metric'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Milestone Months" required>
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.milestoneMonths}
                onChange={(e) => setFormData({ ...formData, milestoneMonths: parseInt(e.target.value) })}
              >
                {MILESTONES.map((m) => (
                  <option key={m} value={m}>{m} months</option>
                ))}
              </select>
            </NfiField>

            <NfiField label="Metric Type" required>
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.metricType}
                onChange={(e) => setFormData({ ...formData, metricType: e.target.value })}
              >
                {METRIC_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </NfiField>
          </div>

          <NfiField label="Metric Name" required>
            <input
              type="text"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.metricName}
              onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
            />
          </NfiField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Allow N/A">
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.allowNa ? 'yes' : 'no'}
                onChange={(e) => setFormData({ ...formData, allowNa: e.target.value === 'yes' })}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </NfiField>

            <NfiField label="Display Order">
              <input
                type="number"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </NfiField>
          </div>

          <div className="flex gap-3 pt-4">
            <NfiButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </NfiButton>
            <NfiButton variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </NfiButton>
          </div>
        </div>
      </NfiModal>
    </Layout>
  );
}
