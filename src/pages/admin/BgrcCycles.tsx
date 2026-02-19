import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiBadge } from '../../components/design-system/NfiBadge';
import { NfiButton } from '../../components/design-system/NfiButton';
import { NfiField } from '../../components/design-system/NfiField';
import { NfiModal } from '../../components/design-system/NfiModal';
import { useToast } from '../../components/design-system/Toast';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';

export function BgrcCycles() {
  const { showToast } = useToast();
  const [cycles, setCycles] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any>(null);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cycleName: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cyclesData, casesData] = await Promise.all([
        adminService.getBgrcCycles(),
        adminService.getAllCases(),
      ]);
      setCycles(cyclesData);
      setCases(casesData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load data', 'error');
    }
  };

  const handleCreate = () => {
    setEditingCycle(null);
    setFormData({ cycleName: '', startDate: '', endDate: '', isActive: true });
    setShowModal(true);
  };

  const handleEdit = (cycle: any) => {
    setEditingCycle(cycle);
    setFormData({
      cycleName: cycle.cycleName,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      isActive: cycle.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.cycleName || !formData.startDate || !formData.endDate) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCycle) {
        await adminService.updateBgrcCycle(editingCycle.cycleId, formData);
        showToast('Cycle updated successfully', 'success');
      } else {
        await adminService.createBgrcCycle(formData);
        showToast('Cycle created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving cycle:', error);
      showToast(error.message || 'Failed to save cycle', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cycleId: string) => {
    if (!confirm('Are you sure you want to delete this cycle?')) return;

    try {
      await adminService.deleteBgrcCycle(cycleId);
      showToast('Cycle deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error deleting cycle:', error);
      showToast(error.message || 'Failed to delete cycle', 'error');
    }
  };

  const handleAssignCases = (cycle: any) => {
    setSelectedCycle(cycle);
    const cycleCases = cases.filter(c => c.bgrcCycleId === cycle.cycleId);
    setSelectedCases(cycleCases.map(c => c.caseId));
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedCycle) return;

    setSubmitting(true);
    try {
      const previousCases = cases.filter(c => c.bgrcCycleId === selectedCycle.cycleId).map(c => c.caseId);

      for (const caseId of previousCases) {
        if (!selectedCases.includes(caseId)) {
          await adminService.unassignCaseFromCycle(caseId);
        }
      }

      for (const caseId of selectedCases) {
        if (!previousCases.includes(caseId)) {
          await adminService.assignCaseToCycle(caseId, selectedCycle.cycleId);
        }
      }

      showToast('Cases assigned successfully', 'success');
      setShowAssignModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error assigning cases:', error);
      showToast(error.message || 'Failed to assign cases', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCase = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">BGRC Cycles</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Manage BGRC cycles and case assignments</p>
          </div>
          <NfiButton onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            Add Cycle
          </NfiButton>
        </div>

        <NfiCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Cycle Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Start Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">End Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Cases</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.cycleId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{cycle.cycleName}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">
                      {new Date(cycle.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">
                      {new Date(cycle.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">
                      {cases.filter(c => c.bgrcCycleId === cycle.cycleId).length}
                    </td>
                    <td className="py-3 px-4">
                      <NfiBadge tone={cycle.isActive ? 'success' : 'error'}>
                        {cycle.isActive ? 'Active' : 'Inactive'}
                      </NfiBadge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAssignCases(cycle)}
                          className="text-green-600 hover:text-green-800"
                          title="Assign Cases"
                        >
                          <LinkIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(cycle)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cycle.cycleId)}
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
        title={editingCycle ? 'Edit Cycle' : 'Create Cycle'}
      >
        <div className="space-y-4">
          <NfiField label="Cycle Name" required>
            <input
              type="text"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.cycleName}
              onChange={(e) => setFormData({ ...formData, cycleName: e.target.value })}
            />
          </NfiField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Start Date" required>
              <input
                type="date"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </NfiField>

            <NfiField label="End Date" required>
              <input
                type="date"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </NfiField>
          </div>

          <NfiField label="Status">
            <select
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </NfiField>

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

      <NfiModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Cases to ${selectedCycle?.cycleName}`}
        size="large"
      >
        <div className="space-y-4">
          <p className="text-[var(--nfi-text-secondary)]">
            Select cases to assign to this cycle
          </p>

          <div className="max-h-96 overflow-y-auto border border-[var(--nfi-border)] rounded-lg p-4">
            {cases.map((c) => (
              <label key={c.caseId} className="flex items-center gap-3 py-2 hover:bg-gray-50 px-2 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCases.includes(c.caseId)}
                  onChange={() => toggleCase(c.caseId)}
                  className="w-4 h-4"
                />
                <span className="font-medium">{c.caseNumber}</span>
                <span className="text-sm text-[var(--nfi-text-secondary)]">
                  {c.babyName || 'Unnamed'} - {c.hospitalName}
                </span>
                <NfiBadge tone="neutral" size="sm">{c.caseStatus}</NfiBadge>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <NfiButton onClick={handleSaveAssignment} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Assignment'}
            </NfiButton>
            <NfiButton variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </NfiButton>
          </div>
        </div>
      </NfiModal>
    </Layout>
  );
}
