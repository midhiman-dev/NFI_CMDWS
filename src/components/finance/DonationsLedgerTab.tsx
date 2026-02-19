import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiModal } from '../design-system/NfiModal';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';

interface DonationEntry {
  id: string;
  entry_date: string;
  donor_name: string;
  amount: number;
  category: string;
  notes?: string;
}

export function DonationsLedgerTab() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [entries, setEntries] = useState<DonationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    donor_name: '',
    amount: '',
    category: 'Cash',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await provider.getDonationsLedger();
      setEntries(data);
    } catch (error) {
      console.error('Error loading donations:', error);
      showToast('Failed to load donations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.entry_date) {
      newErrors.entry_date = 'Date is required';
    }
    if (!formData.donor_name.trim()) {
      newErrors.donor_name = 'Donor name is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        entry_date: formData.entry_date,
        donor_name: formData.donor_name,
        amount: parseFloat(formData.amount),
        category: formData.category,
        notes: formData.notes || null,
      };

      if (editingId) {
        await provider.updateDonationEntry(editingId, payload);
        showToast('Donation entry updated', 'success');
      } else {
        await provider.createDonationEntry(payload);
        showToast('Donation entry created', 'success');
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadEntries();
    } catch (error) {
      console.error('Error saving donation:', error);
      showToast('Failed to save donation entry', 'error');
    }
  };

  const handleEdit = (entry: DonationEntry) => {
    setEditingId(entry.id);
    setFormData({
      entry_date: entry.entry_date,
      donor_name: entry.donor_name,
      amount: entry.amount.toString(),
      category: entry.category,
      notes: entry.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await provider.deleteDonationEntry(id);
      showToast('Donation entry deleted', 'success');
      loadEntries();
    } catch (error) {
      console.error('Error deleting donation:', error);
      showToast('Failed to delete donation entry', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      donor_name: '',
      amount: '',
      category: 'Cash',
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NfiButton onClick={handleOpenModal} variant="primary">
          <Plus size={16} />
          Add Entry
        </NfiButton>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
          <p className="text-[var(--nfi-text-secondary)]">Loading entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--nfi-text-secondary)]">No donation entries yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--nfi-border)]">
                <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Donor Name</th>
                <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Notes</th>
                <th className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                  <td className="py-3 px-4 text-[var(--nfi-text)]">{new Date(entry.entry_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-[var(--nfi-text)]">{entry.donor_name}</td>
                  <td className="text-right py-3 px-4 text-[var(--nfi-text)] font-medium">₹{entry.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-[var(--nfi-text)]">{entry.category}</td>
                  <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-xs max-w-xs truncate">{entry.notes}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
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

      <NfiModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Donation Entry' : 'Add Donation Entry'}
      >
        <div className="space-y-4">
          <NfiField label="Date" required error={errors.entry_date}>
            <input
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
            />
          </NfiField>

          <NfiField label="Donor Name" required error={errors.donor_name}>
            <input
              type="text"
              value={formData.donor_name}
              onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter donor name"
            />
          </NfiField>

          <NfiField label="Amount" required error={errors.amount}>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </NfiField>

          <NfiField label="Category">
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
            >
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Online">Online</option>
            </select>
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
