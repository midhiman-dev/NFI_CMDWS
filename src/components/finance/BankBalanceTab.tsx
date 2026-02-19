import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiModal } from '../design-system/NfiModal';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';

interface BankSnapshot {
  id: string;
  snapshot_date: string;
  account_name: string;
  account_number?: string;
  balance: number;
  account_type: string;
  notes?: string;
}

export function BankBalanceTab() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [snapshots, setSnapshots] = useState<BankSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    snapshot_date: new Date().toISOString().split('T')[0],
    account_name: '',
    account_number: '',
    balance: '',
    account_type: 'Savings',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const data = await provider.getBankBalanceSnapshots();
      setSnapshots(data);
    } catch (error) {
      console.error('Error loading snapshots:', error);
      showToast('Failed to load bank balance snapshots', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.snapshot_date) {
      newErrors.snapshot_date = 'Date is required';
    }
    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required';
    }
    if (!formData.balance || parseFloat(formData.balance) < 0) {
      newErrors.balance = 'Balance must be greater than or equal to 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        snapshot_date: formData.snapshot_date,
        account_name: formData.account_name,
        account_number: formData.account_number || null,
        balance: parseFloat(formData.balance),
        account_type: formData.account_type,
        notes: formData.notes || null,
      };

      if (editingId) {
        await provider.updateBankSnapshot(editingId, payload);
        showToast('Bank balance snapshot updated', 'success');
      } else {
        await provider.createBankSnapshot(payload);
        showToast('Bank balance snapshot created', 'success');
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadSnapshots();
    } catch (error) {
      console.error('Error saving snapshot:', error);
      showToast('Failed to save bank balance snapshot', 'error');
    }
  };

  const handleEdit = (snapshot: BankSnapshot) => {
    setEditingId(snapshot.id);
    setFormData({
      snapshot_date: snapshot.snapshot_date,
      account_name: snapshot.account_name,
      account_number: snapshot.account_number || '',
      balance: snapshot.balance.toString(),
      account_type: snapshot.account_type,
      notes: snapshot.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this snapshot?')) return;

    try {
      await provider.deleteBankSnapshot(id);
      showToast('Bank balance snapshot deleted', 'success');
      loadSnapshots();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      showToast('Failed to delete bank balance snapshot', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      snapshot_date: new Date().toISOString().split('T')[0],
      account_name: '',
      account_number: '',
      balance: '',
      account_type: 'Savings',
      notes: '',
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

  const getTotalBalance = () => {
    return snapshots.reduce((sum, s) => sum + s.balance, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NfiButton onClick={handleOpenModal} variant="primary">
          <Plus size={16} />
          Add Snapshot
        </NfiButton>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
          <p className="text-[var(--nfi-text-secondary)]">Loading snapshots...</p>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--nfi-text-secondary)]">No bank balance snapshots yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Account Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Account Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Balance</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Notes</th>
                  <th className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{new Date(snapshot.snapshot_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{snapshot.account_name}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{snapshot.account_type}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)] font-medium">₹{snapshot.balance.toLocaleString()}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-xs max-w-xs truncate">{snapshot.notes}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(snapshot)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(snapshot.id)}
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
          <div className="pt-4 border-t border-[var(--nfi-border)]">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-[var(--nfi-text-secondary)]">Total Balance</p>
                <p className="text-lg font-bold text-[var(--nfi-text)]">₹{getTotalBalance().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <NfiModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Bank Balance Snapshot' : 'Add Bank Balance Snapshot'}
      >
        <div className="space-y-4">
          <NfiField label="Date" required error={errors.snapshot_date}>
            <input
              type="date"
              value={formData.snapshot_date}
              onChange={(e) => setFormData({ ...formData, snapshot_date: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
            />
          </NfiField>

          <NfiField label="Account Name" required error={errors.account_name}>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter account name"
            />
          </NfiField>

          <NfiField label="Account Number">
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter account number (optional)"
            />
          </NfiField>

          <NfiField label="Account Type">
            <select
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
            >
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
              <option value="FD">Fixed Deposit</option>
            </select>
          </NfiField>

          <NfiField label="Balance" required error={errors.balance}>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter balance"
              min="0"
              step="0.01"
            />
          </NfiField>

          <NfiField label="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter notes (optional)"
              rows={3}
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
  );
}
