import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiModal } from '../design-system/NfiModal';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';

interface ExpenseTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  category: string;
  approved_by?: string;
  notes?: string;
}

export function ExpenseTransactionsTab() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Program',
    approved_by: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await provider.getExpenseTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      showToast('Failed to load expense transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.transaction_date) {
      newErrors.transaction_date = 'Date is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        transaction_date: formData.transaction_date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        approved_by: formData.approved_by || null,
        notes: formData.notes || null,
      };

      if (editingId) {
        await provider.updateExpenseTransaction(editingId, payload);
        showToast('Expense transaction updated', 'success');
      } else {
        await provider.createExpenseTransaction(payload);
        showToast('Expense transaction created', 'success');
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showToast('Failed to save expense transaction', 'error');
    }
  };

  const handleEdit = (transaction: ExpenseTransaction) => {
    setEditingId(transaction.id);
    setFormData({
      transaction_date: transaction.transaction_date,
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
      approved_by: transaction.approved_by || '',
      notes: transaction.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await provider.deleteExpenseTransaction(id);
      showToast('Expense transaction deleted', 'success');
      loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast('Failed to delete expense transaction', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'Program',
      approved_by: '',
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

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryTotal = (category: string) => {
    return transactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NfiButton onClick={handleOpenModal} variant="primary">
          <Plus size={16} />
          Add Transaction
        </NfiButton>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
          <p className="text-[var(--nfi-text-secondary)]">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--nfi-text-secondary)]">No expense transactions yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Category</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved By</th>
                  <th className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{transaction.description}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        transaction.category === 'Program'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.category}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)] font-medium">₹{transaction.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-xs">{transaction.approved_by || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-right">
                <p className="text-sm text-[var(--nfi-text-secondary)]">Program Expenses</p>
                <p className="text-lg font-bold text-[var(--nfi-text)]">₹{getCategoryTotal('Program').toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--nfi-text-secondary)]">Operations Expenses</p>
                <p className="text-lg font-bold text-[var(--nfi-text)]">₹{getCategoryTotal('Operations').toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--nfi-text-secondary)]">Total Expenses</p>
                <p className="text-lg font-bold text-[var(--nfi-text)]">₹{getTotalAmount().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <NfiModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Expense Transaction' : 'Add Expense Transaction'}
      >
        <div className="space-y-4">
          <NfiField label="Date" required error={errors.transaction_date}>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
            />
          </NfiField>

          <NfiField label="Description" required error={errors.description}>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter description"
            />
          </NfiField>

          <NfiField label="Category" required error={errors.category}>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
            >
              <option value="Program">Program</option>
              <option value="Operations">Operations</option>
            </select>
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

          <NfiField label="Approved By">
            <input
              type="text"
              value={formData.approved_by}
              onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              placeholder="Enter approver name (optional)"
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
