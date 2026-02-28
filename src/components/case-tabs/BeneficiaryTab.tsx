import { useState, useEffect } from 'react';
import { Edit2, Save, X, Baby } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import type { ChildProfile } from '../../types';

interface Props {
  caseId: string;
}

const EMPTY: ChildProfile = {
  caseId: '',
  beneficiaryName: '',
  gender: 'Male',
  dob: '',
  admissionDate: '',
};

export function BeneficiaryTab({ caseId }: Props) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [data, setData] = useState<ChildProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ChildProfile>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await provider.getBeneficiary(caseId);
      setData(result);
      if (result) setForm(result);
    } catch { /* safe fallback */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const startEdit = () => {
    setForm(data || { ...EMPTY, caseId });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.beneficiaryName.trim()) { showToast('Baby name is required', 'error'); return; }
    if (!form.dob) { showToast('Date of birth is required', 'error'); return; }
    setSaving(true);
    try {
      const { caseId: _, ...rest } = form;
      await provider.upsertBeneficiary(caseId, rest);
      showToast('Beneficiary details saved', 'success');
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
            <Baby size={20} className="text-blue-600" />
            Edit Beneficiary (Baby) Details
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NfiField label="Baby Name" required>
            <input type="text" className="nfi-input" value={form.beneficiaryName} onChange={e => setForm({ ...form, beneficiaryName: e.target.value })} />
          </NfiField>
          <NfiField label="Gender" required>
            <select className="nfi-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' })}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </NfiField>
          <NfiField label="Date of Birth" required>
            <input type="date" className="nfi-input" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
          </NfiField>
          <NfiField label="Birth Weight (kg)">
            <input type="number" step="0.01" className="nfi-input" value={form.birthWeightKg ?? ''} onChange={e => setForm({ ...form, birthWeightKg: e.target.value ? +e.target.value : undefined })} />
          </NfiField>
          <NfiField label="Gestational Age (weeks)">
            <input type="number" className="nfi-input" value={form.gestationalAgeWeeks ?? ''} onChange={e => setForm({ ...form, gestationalAgeWeeks: e.target.value ? +e.target.value : undefined })} />
          </NfiField>
          <NfiField label="Current Weight (kg)">
            <input type="number" step="0.01" className="nfi-input" value={form.currentWeightKg ?? ''} onChange={e => setForm({ ...form, currentWeightKg: e.target.value ? +e.target.value : undefined })} />
          </NfiField>
          <NfiField label="Beneficiary No">
            <input type="text" className="nfi-input" value={form.beneficiaryNo ?? ''} onChange={e => setForm({ ...form, beneficiaryNo: e.target.value })} />
          </NfiField>
          <div className="md:col-span-2">
            <NfiField label="Morbidity / Conditions">
              <textarea className="nfi-input resize-none" rows={2} value={form.morbidity ?? ''} onChange={e => setForm({ ...form, morbidity: e.target.value })} />
            </NfiField>
          </div>
        </div>
      </div>
    );
  }

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
          <Baby size={20} className="text-blue-600" />
          Beneficiary (Baby) Details
        </h3>
        <NfiButton size="sm" variant="secondary" onClick={startEdit}>
          <Edit2 size={16} className="mr-1" /> {data ? 'Edit' : 'Add'}
        </NfiButton>
      </div>
      {!data ? (
        <div className="py-8 text-center text-[var(--nfi-text-secondary)] bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No beneficiary data recorded yet. Click "Add" to enter details.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
          <KV label="Baby Name" value={data.beneficiaryName} />
          <KV label="Gender" value={data.gender} />
          <KV label="Date of Birth" value={data.dob ? new Date(data.dob).toLocaleDateString() : undefined} />
          <KV label="Birth Weight" value={data.birthWeightKg != null ? `${data.birthWeightKg} kg` : undefined} />
          <KV label="Gestational Age" value={data.gestationalAgeWeeks != null ? `${data.gestationalAgeWeeks} weeks` : undefined} />
          <KV label="Current Weight" value={data.currentWeightKg != null ? `${data.currentWeightKg} kg` : undefined} />
          <KV label="Beneficiary No" value={data.beneficiaryNo} />
          <KV label="Admission Date" value={data.admissionDate ? new Date(data.admissionDate).toLocaleDateString() : undefined} />
          <div className="md:col-span-2 lg:col-span-3">
            <KV label="Morbidity / Conditions" value={data.morbidity} />
          </div>
        </div>
      )}
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
