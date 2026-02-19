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

export function Hospitals() {
  const { showToast } = useToast();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    state: '',
    contactPerson: '',
    phone: '',
    email: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await adminService.getHospitals();
      setHospitals(data);
    } catch (error) {
      console.error('Error loading hospitals:', error);
      showToast('Failed to load hospitals', 'error');
    }
  };

  const handleCreate = () => {
    setEditingHospital(null);
    setFormData({
      name: '',
      code: '',
      city: '',
      state: '',
      contactPerson: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (hospital: any) => {
    setEditingHospital(hospital);
    setFormData({
      name: hospital.name,
      code: hospital.code,
      city: hospital.city,
      state: hospital.state,
      contactPerson: hospital.contactPerson || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
      isActive: hospital.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.city || !formData.state) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingHospital) {
        await adminService.updateHospital(editingHospital.hospitalId, formData);
        showToast('Hospital updated successfully', 'success');
      } else {
        await adminService.createHospital(formData);
        showToast('Hospital created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving hospital:', error);
      showToast(error.message || 'Failed to save hospital', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (hospitalId: string) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return;

    try {
      await adminService.deleteHospital(hospitalId);
      showToast('Hospital deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error deleting hospital:', error);
      showToast(error.message || 'Failed to delete hospital', 'error');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Hospitals</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Manage hospital master data</p>
          </div>
          <NfiButton onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            Add Hospital
          </NfiButton>
        </div>

        <NfiCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">City</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">State</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((hospital) => (
                  <tr key={hospital.hospitalId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{hospital.name}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{hospital.code}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{hospital.city}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{hospital.state}</td>
                    <td className="py-3 px-4">
                      <NfiBadge tone={hospital.isActive ? 'success' : 'error'}>
                        {hospital.isActive ? 'Active' : 'Inactive'}
                      </NfiBadge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(hospital)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(hospital.hospitalId)}
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
        title={editingHospital ? 'Edit Hospital' : 'Create Hospital'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Hospital Name" required>
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </NfiField>

            <NfiField label="Hospital Code" required>
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </NfiField>

            <NfiField label="City" required>
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </NfiField>

            <NfiField label="State" required>
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </NfiField>

            <NfiField label="Contact Person">
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </NfiField>

            <NfiField label="Phone">
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </NfiField>

            <NfiField label="Email">
              <input
                type="email"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </NfiField>

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
