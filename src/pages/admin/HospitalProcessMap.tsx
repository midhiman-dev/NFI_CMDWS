import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiBadge } from '../../components/design-system/NfiBadge';
import { NfiButton } from '../../components/design-system/NfiButton';
import { NfiField } from '../../components/design-system/NfiField';
import { NfiModal } from '../../components/design-system/NfiModal';
import { useToast } from '../../components/design-system/Toast';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../App';
import type { HospitalProcessMapWithDetails } from '../../data/providers/DataProvider';

export function HospitalProcessMap() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [mappings, setMappings] = useState<HospitalProcessMapWithDetails[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMap, setEditingMap] = useState<HospitalProcessMapWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    hospitalId: '',
    processType: '',
    isActive: true,
    effectiveFromDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mappingsData, hospitalsData] = await Promise.all([
        provider.listHospitalProcessMaps(),
        provider.getHospitals(),
      ]);
      setMappings(mappingsData);
      setHospitals(hospitalsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load hospital process maps', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMappedHospitalIds = () => {
    if (editingMap) {
      return mappings.filter(m => m.mapId !== editingMap.mapId).map(m => m.hospitalId);
    }
    return mappings.map(m => m.hospitalId);
  };

  const getAvailableHospitals = () => {
    const mappedIds = getMappedHospitalIds();
    return hospitals.filter(h => !mappedIds.includes(h.hospitalId) || (editingMap?.hospitalId === h.hospitalId));
  };

  const handleCreate = () => {
    setEditingMap(null);
    setFormData({
      hospitalId: '',
      processType: '',
      isActive: true,
      effectiveFromDate: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleEdit = (map: HospitalProcessMapWithDetails) => {
    setEditingMap(map);
    setFormData({
      hospitalId: map.hospitalId,
      processType: map.processType,
      isActive: map.isActive,
      effectiveFromDate: map.effectiveFromDate,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.hospitalId || !formData.processType) {
      showToast('Please select hospital and process type', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMap) {
        await provider.updateHospitalProcessMap(editingMap.mapId, {
          processType: formData.processType,
          isActive: formData.isActive,
          effectiveFromDate: formData.effectiveFromDate,
        });
        showToast('Mapping updated successfully', 'success');
      } else {
        await provider.createHospitalProcessMap({
          hospitalId: formData.hospitalId,
          processType: formData.processType,
          isActive: formData.isActive,
          effectiveFromDate: formData.effectiveFromDate,
        });
        showToast('Mapping created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      showToast(error.message || 'Failed to save mapping', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mapId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      await provider.deleteHospitalProcessMap(mapId);
      showToast('Mapping deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      showToast(error.message || 'Failed to delete mapping', 'error');
    }
  };

  const processTypes = ['BRC', 'BRRC', 'BGRC', 'BCRC', 'NON_BRC'];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Hospital Process Map</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Manage hospital to process type mappings</p>
          </div>
          <NfiButton onClick={handleCreate} disabled={loading || getAvailableHospitals().length === 0}>
            <Plus size={16} className="mr-1" />
            Add Mapping
          </NfiButton>
        </div>

        {getAvailableHospitals().length === 0 && mappings.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-900 font-medium">All hospitals have process mappings</p>
              <p className="text-blue-800 text-sm mt-1">Edit or delete mappings to add more hospitals</p>
            </div>
          </div>
        )}

        {loading ? (
          <NfiCard>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading mappings...</p>
            </div>
          </NfiCard>
        ) : mappings.length === 0 ? (
          <NfiCard>
            <div className="text-center py-12">
              <p className="text-[var(--nfi-text-secondary)] mb-4">No process mappings configured</p>
              <NfiButton onClick={handleCreate} disabled={getAvailableHospitals().length === 0}>
                <Plus size={16} className="mr-1" />
                Create First Mapping
              </NfiButton>
            </div>
          </NfiCard>
        ) : (
          <NfiCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Hospital</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Process Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Active</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Effective From</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Updated At</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((map) => (
                    <tr key={map.mapId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{map.hospitalName}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium">
                          {map.processType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <NfiBadge tone={map.isActive ? 'success' : 'error'}>
                          {map.isActive ? 'Active' : 'Inactive'}
                        </NfiBadge>
                      </td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{map.effectiveFromDate}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">
                        {new Date(map.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(map)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(map.mapId)}
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
        )}
      </div>

      <NfiModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMap ? 'Edit Hospital Process Map' : 'Create Hospital Process Map'}
      >
        <div className="space-y-4">
          <NfiField label="Hospital" required>
            <select
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.hospitalId}
              onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
              disabled={editingMap !== null}
            >
              <option value="">Select hospital</option>
              {getAvailableHospitals().map((h) => (
                <option key={h.hospitalId} value={h.hospitalId}>
                  {h.name}
                </option>
              ))}
            </select>
          </NfiField>

          <NfiField label="Process Type" required>
            <select
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.processType}
              onChange={(e) => setFormData({ ...formData, processType: e.target.value })}
            >
              <option value="">Select process type</option>
              {processTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </NfiField>

          <NfiField label="Effective From Date" required>
            <input
              type="date"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.effectiveFromDate}
              onChange={(e) => setFormData({ ...formData, effectiveFromDate: e.target.value })}
            />
          </NfiField>

          <NfiField label="Status">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--nfi-border)] text-[var(--nfi-primary)]"
              />
              <span className="text-[var(--nfi-text)]">Active</span>
            </label>
          </NfiField>

          <div className="flex gap-2 justify-end pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-[var(--nfi-border)] rounded-lg text-[var(--nfi-text)] hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <NfiButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingMap ? 'Update' : 'Create'}
            </NfiButton>
          </div>
        </div>
      </NfiModal>
    </Layout>
  );
}
