import { useState, useEffect } from 'react';
import { Edit2, Save, X, IndianRupee } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import type { FinancialCaseDetails } from '../../types';

interface Props {
  caseId: string;
}

const EMPTY: FinancialCaseDetails = { caseId: '', estimateAmount: 0 };

function fmt(amount?: number): string {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function FinancialTab({ caseId }: Props) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [data, setData] = useState<FinancialCaseDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FinancialCaseDetails>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await provider.getFinancial(caseId); setData(r); if (r) setForm(r); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const startEdit = () => { setForm(data || { ...EMPTY, caseId }); setEditing(true); };

  const numField = (key: keyof FinancialCaseDetails) => ({
    value: form[key] != null ? String(form[key]) : '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value === '' ? undefined : +e.target.value }),
  });

  const handleSave = async () => {
    if (!form.estimateAmount || form.estimateAmount <= 0) { showToast('Estimated bill is required', 'error'); return; }
    setSaving(true);
    try {
      const { caseId: _, ...rest } = form;
      await provider.upsertFinancial(caseId, rest);
      showToast('Financial details saved', 'success');
      setEditing(false);
      await load();
    } catch { showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-8 text-center text-[var(--nfi-text-secondary)]">Loading...</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)] flex items-center gap-2">
            <IndianRupee size={20} className="text-emerald-700" />
            Edit Financial Details
          </h3>
          <div className="flex gap-2">
            <NfiButton variant="secondary" size="sm" onClick={() => setEditing(false)}>
              <X size={16} className="mr-1" /> Cancel
            </NfiButton>
            <NfiButton size="sm" onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-1" /> {saving ? 'Saving...' : 'Save'}
            </NfiButton>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-[var(--nfi-text-secondary)] uppercase tracking-wide">Bill Details</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Estimated Bill Amount" required>
              <input type="number" className="nfi-input" {...numField('estimateAmount')} />
            </NfiField>
            <NfiField label="Final Bill Amount">
              <input type="number" className="nfi-input" {...numField('finalBillAmount')} />
            </NfiField>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-[var(--nfi-text-secondary)] uppercase tracking-wide">Deductions & Contributions</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Hospital Discount">
              <input type="number" className="nfi-input" {...numField('hospitalDiscount')} />
            </NfiField>
            <NfiField label="Govt Scheme Contribution">
              <input type="number" className="nfi-input" {...numField('govtSchemeContribution')} />
            </NfiField>
            <NfiField label="Insurance Amount">
              <input type="number" className="nfi-input" {...numField('insuranceAmount')} />
            </NfiField>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-[var(--nfi-text-secondary)] uppercase tracking-wide">NFI Funding</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="NFI Requested Amount">
              <input type="number" className="nfi-input" {...numField('nfiRequestedAmount')} />
            </NfiField>
            <NfiField label="NFI Approved Amount">
              <input type="number" className="nfi-input" {...numField('nfiApprovedAmount')} />
            </NfiField>
            <NfiField label="Payment Method">
              <select className="nfi-input" value={form.paymentMethod ?? ''} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="">Select...</option>
                <option value="BankTransfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </NfiField>
          </div>
        </fieldset>
      </div>
    );
  }

  const totalDeductions = (data?.hospitalDiscount || 0) + (data?.govtSchemeContribution || 0) + (data?.insuranceAmount || 0);
  const netPayable = (data?.estimateAmount || 0) - totalDeductions;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Structured intake data has moved to the <strong>Intake Forms</strong> tab.
          Complete the Fund Application and Interim Summary forms there for comprehensive intake capture.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] flex items-center gap-2">
          <IndianRupee size={20} className="text-emerald-700" />
          Financial Details
        </h3>
        <NfiButton size="sm" variant="secondary" onClick={startEdit}>
          <Edit2 size={16} className="mr-1" /> {data ? 'Edit' : 'Add'}
        </NfiButton>
      </div>
      {!data ? (
        <div className="py-8 text-center text-[var(--nfi-text-secondary)] bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No financial data recorded yet. Click "Add" to enter details.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Estimated Bill" value={fmt(data.estimateAmount)} variant="blue" />
            <SummaryCard label="Final Bill" value={fmt(data.finalBillAmount)} variant="slate" />
            <SummaryCard label="NFI Requested" value={fmt(data.nfiRequestedAmount)} variant="amber" />
            <SummaryCard label="NFI Approved" value={fmt(data.nfiApprovedAmount)} variant="green" />
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--nfi-text-secondary)] uppercase tracking-wide mb-3">Deductions & Contributions</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6">
              <KV label="Hospital Discount" value={fmt(data.hospitalDiscount)} />
              <KV label="Govt Scheme" value={fmt(data.govtSchemeContribution)} />
              <KV label="Insurance" value={fmt(data.insuranceAmount)} />
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg flex justify-between text-sm">
              <span className="text-[var(--nfi-text-secondary)]">Total Deductions</span>
              <span className="font-semibold text-[var(--nfi-text)]">{fmt(totalDeductions)}</span>
            </div>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg flex justify-between text-sm">
              <span className="text-blue-800">Net Amount Payable</span>
              <span className="font-bold text-blue-900">{fmt(netPayable)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--nfi-text-secondary)] uppercase tracking-wide mb-2">Payment</p>
            <KV label="Payment Method" value={data.paymentMethod ? data.paymentMethod.replace(/([A-Z])/g, ' $1').trim() : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, variant }: { label: string; value: string; variant: string }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    slate: 'bg-slate-50 border-slate-200',
  };
  return (
    <div className={`p-3 rounded-lg border ${styles[variant] || styles.slate}`}>
      <p className="text-[10px] font-medium text-[var(--nfi-text-secondary)] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-base font-bold text-[var(--nfi-text)]">{value}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--nfi-text-secondary)] mb-0.5 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-[var(--nfi-text)]">{value || <span className="text-gray-400">N/A</span>}</p>
    </div>
  );
}
