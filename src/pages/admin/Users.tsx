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

const ROLES = [
  { value: 'hospital_spoc', label: 'Hospital SPOC' },
  { value: 'hospital_doctor', label: 'Hospital Doctor' },
  { value: 'verifier', label: 'Verifier' },
  { value: 'committee_member', label: 'Committee Member' },
  { value: 'beni_volunteer', label: 'BENI Volunteer' },
  { value: 'admin', label: 'Admin' },
];

export function Users() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: '',
    hospitalId: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, hospitalsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getHospitals(),
      ]);
      setUsers(usersData);
      setHospitals(hospitalsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load users', 'error');
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      fullName: '',
      role: '',
      hospitalId: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      hospitalId: user.hospitalId || '',
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.fullName || !formData.role) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.userId, {
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          hospitalId: formData.hospitalId || undefined,
          isActive: formData.isActive,
        });
        showToast('User updated successfully', 'success');
      } else {
        await adminService.createUser({
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          hospitalId: formData.hospitalId || undefined,
          isActive: formData.isActive,
        });
        showToast('User created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      showToast(error.message || 'Failed to save user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminService.deleteUser(userId);
      showToast('User deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showToast(error.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Users</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Manage system users and roles</p>
          </div>
          <NfiButton onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            Add User
          </NfiButton>
        </div>

        <NfiCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Hospital</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{user.fullName}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{user.email}</td>
                    <td className="py-3 px-4">
                      <NfiBadge tone="accent">{ROLES.find(r => r.value === user.role)?.label || user.role}</NfiBadge>
                    </td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{user.hospitalName || '-'}</td>
                    <td className="py-3 px-4">
                      <NfiBadge tone={user.isActive ? 'success' : 'error'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </NfiBadge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.userId)}
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
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <div className="space-y-4">
          <NfiField label="Full Name" required>
            <input
              type="text"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </NfiField>

          <NfiField label="Email" required>
            <input
              type="email"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </NfiField>

          <NfiField label="Role" required>
            <select
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="">Select role...</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </NfiField>

          {(formData.role === 'hospital_spoc' || formData.role === 'hospital_doctor') && (
            <NfiField label="Hospital">
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.hospitalId}
                onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
              >
                <option value="">Select hospital...</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.hospitalId} value={hospital.hospitalId}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </NfiField>
          )}

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
    </Layout>
  );
}
