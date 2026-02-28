import { useState, useEffect } from 'react';
import { Edit2, Save, X, Stethoscope } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import type { ClinicalCaseDetails } from '../../types';

interface Props {
  caseId: string;
  onDatesChanged?: () => void;
}

const EMPTY: ClinicalCaseDetails = { caseId: '', diagnosis: '', summary: '' };

export function ClinicalTab({ caseId, onDatesChanged }: Props) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [data, setData] = useState<ClinicalCaseDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClinicalCaseDetails>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await provider.getClinicalDetails(caseId); setData(r); if (r) setForm(r); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const startEdit = () => { setForm(data || { ...EMPTY, caseId }); setEditing(true); };

  const handleSave = async () => {
    if (!form.diagnosis.trim()) { showToast('Diagnosis is required', 'error'); return; }
    setSaving(true);
    try {
      const { caseId: _, ...rest } = form;
      await provider.upsertClinical(caseId, rest);
      if (rest.admissionDate || rest.dischargeDate) {
        await provider.updateClinicalDates(caseId, { admissionDate: rest.admissionDate, dischargeDate: rest.dischargeDate });
      }
      showToast('Clinical details saved', 'success');
      setEditing(false);
      await load();
      onDatesChanged?.();
    } catch { showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-8 text-center text-[var(--nfi-text-secondary)]">Loading...</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)] flex items-center gap-2">
            <Stethoscope size={20} className="text-rose-600" />
            Edit Clinical Details
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
          <div className="md:col-span-2">
            <NfiField label="Diagnosis" required>
              <input type="text" className="nfi-input" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
            </NfiField>
          </div>
          <NfiField label="Admission Date">
            <input type="date" className="nfi-input" value={form.admissionDate ?? ''} onChange={e => setForm({ ...form, admissionDate: e.target.value })} />
          </NfiField>
          <NfiField label="Discharge Date">
            <input type="date" className="nfi-input" value={form.dischargeDate ?? ''} onChange={e => setForm({ ...form, dischargeDate: e.target.value })} />
          </NfiField>
          <NfiField label="NICU Days">
            <input type="number" className="nfi-input" value={form.nicuDays ?? ''} onChange={e => setForm({ ...form, nicuDays: e.target.value ? +e.target.value : undefined })} />
          </NfiField>
          <NfiField label="Current Status">
            <select className="nfi-input" value={form.currentStatus ?? ''} onChange={e => setForm({ ...form, currentStatus: e.target.value })}>
              <option value="">Select...</option>
              <option value="Stable">Stable</option>
              <option value="Critical">Critical</option>
              <option value="Recovering">Recovering</option>
              <option value="Discharged">Discharged</option>
              <option value="Deceased">Deceased</option>
            </select>
          </NfiField>
          <NfiField label="Attending Doctor">
            <input type="text" className="nfi-input" value={form.doctorName ?? ''} onChange={e => setForm({ ...form, doctorName: e.target.value })} />
          </NfiField>
          <NfiField label="Complications">
            <input type="text" className="nfi-input" value={form.complications ?? ''} onChange={e => setForm({ ...form, complications: e.target.value })} />
          </NfiField>
          <div className="md:col-span-2">
            <NfiField label="Doctor Notes / Summary">
              <textarea className="nfi-input resize-none" rows={4} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
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
          <Stethoscope size={20} className="text-rose-600" />
          Clinical Details
        </h3>
        <NfiButton size="sm" variant="secondary" onClick={startEdit}>
          <Edit2 size={16} className="mr-1" /> {data ? 'Edit' : 'Add'}
        </NfiButton>
      </div>
      {!data ? (
        <div className="py-8 text-center text-[var(--nfi-text-secondary)] bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No clinical data recorded yet. Click "Add" to enter details.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs font-medium text-[var(--nfi-text-secondary)] mb-1 uppercase tracking-wide">Diagnosis</p>
            <p className="text-sm font-semibold text-[var(--nfi-text)]">{data.diagnosis || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
            <KV label="Admission Date" value={data.admissionDate ? new Date(data.admissionDate).toLocaleDateString() : undefined} />
            <KV label="Discharge Date" value={data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString() : undefined} />
            <KV label="NICU Days" value={data.nicuDays != null ? String(data.nicuDays) : undefined} />
            <KV label="Current Status" value={data.currentStatus} />
            <KV label="Attending Doctor" value={data.doctorName} />
            <KV label="Complications" value={data.complications} />
          </div>
          {data.summary && (
            <div>
              <p className="text-xs font-medium text-[var(--nfi-text-secondary)] mb-1 uppercase tracking-wide">Doctor Notes / Summary</p>
              <p className="text-sm text-[var(--nfi-text)] bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{data.summary}</p>
            </div>
          )}
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
