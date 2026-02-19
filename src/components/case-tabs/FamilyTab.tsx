import { useState, useEffect } from 'react';
import { Edit2, Save, X, Users } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiField } from '../design-system/NfiField';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import type { FamilyProfile } from '../../types';

interface Props {
  caseId: string;
}

const EMPTY: FamilyProfile = { caseId: '', motherName: '', phone: '', address: '' };

export function FamilyTab({ caseId }: Props) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [data, setData] = useState<FamilyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FamilyProfile>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await provider.getFamily(caseId); setData(r); if (r) setForm(r); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const startEdit = () => { setForm(data || { ...EMPTY, caseId }); setEditing(true); };

  const handleSave = async () => {
    if (!form.motherName.trim()) { showToast('Mother name is required', 'error'); return; }
    if (!form.phone.trim()) { showToast('Phone is required', 'error'); return; }
    setSaving(true);
    try {
      const { caseId: _, ...rest } = form;
      await provider.upsertFamily(caseId, rest);
      showToast('Family details saved', 'success');
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
            <Users size={20} className="text-teal-600" />
            Edit Family Details
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
          <NfiField label="Mother Name" required>
            <input type="text" className="nfi-input" value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} />
          </NfiField>
          <NfiField label="Father Name">
            <input type="text" className="nfi-input" value={form.fatherName ?? ''} onChange={e => setForm({ ...form, fatherName: e.target.value })} />
          </NfiField>
          <NfiField label="Phone" required>
            <input type="tel" className="nfi-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </NfiField>
          <NfiField label="WhatsApp">
            <input type="tel" className="nfi-input" value={form.whatsapp ?? ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
          </NfiField>
          <NfiField label="Email">
            <input type="email" className="nfi-input" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          </NfiField>
          <NfiField label="Aadhaar (last 4 digits)">
            <input type="text" maxLength={4} className="nfi-input" value={form.aadhaarLast4 ?? ''} onChange={e => setForm({ ...form, aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
          </NfiField>
          <div className="md:col-span-2">
            <NfiField label="Address">
              <input type="text" className="nfi-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </NfiField>
          </div>
          <NfiField label="City">
            <input type="text" className="nfi-input" value={form.city ?? ''} onChange={e => setForm({ ...form, city: e.target.value })} />
          </NfiField>
          <NfiField label="State">
            <input type="text" className="nfi-input" value={form.state ?? ''} onChange={e => setForm({ ...form, state: e.target.value })} />
          </NfiField>
          <NfiField label="PIN Code">
            <input type="text" maxLength={6} className="nfi-input" value={form.pincode ?? ''} onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
          </NfiField>
          <NfiField label="Income Band">
            <select className="nfi-input" value={form.incomeBand ?? ''} onChange={e => setForm({ ...form, incomeBand: e.target.value })}>
              <option value="">Select...</option>
              <option value="Below 1 Lakh">Below 1 Lakh</option>
              <option value="1-3 Lakhs">1-3 Lakhs</option>
              <option value="3-5 Lakhs">3-5 Lakhs</option>
              <option value="5-10 Lakhs">5-10 Lakhs</option>
              <option value="Above 10 Lakhs">Above 10 Lakhs</option>
            </select>
          </NfiField>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] flex items-center gap-2">
          <Users size={20} className="text-teal-600" />
          Family Details
        </h3>
        <NfiButton size="sm" variant="secondary" onClick={startEdit}>
          <Edit2 size={16} className="mr-1" /> {data ? 'Edit' : 'Add'}
        </NfiButton>
      </div>
      {!data ? (
        <div className="py-8 text-center text-[var(--nfi-text-secondary)] bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No family data recorded yet. Click "Add" to enter details.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
          <KV label="Mother Name" value={data.motherName} />
          <KV label="Father Name" value={data.fatherName} />
          <KV label="Phone" value={data.phone} />
          <KV label="WhatsApp" value={data.whatsapp} />
          <KV label="Email" value={data.email} />
          <KV label="Aadhaar" value={data.aadhaarLast4 ? `XXXX-XXXX-${data.aadhaarLast4}` : undefined} />
          <div className="md:col-span-2 lg:col-span-3">
            <KV label="Address" value={[data.address, data.city, data.state, data.pincode].filter(Boolean).join(', ')} />
          </div>
          <KV label="Income Band" value={data.incomeBand} />
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
