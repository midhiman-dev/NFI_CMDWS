import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MessageSquare, Phone, Scale, Stethoscope } from 'lucide-react';
import { NfiButton } from './design-system/NfiButton';
import { NfiField } from './design-system/NfiField';
import { NfiModal } from './design-system/NfiModal';
import { useToast } from './design-system/Toast';
import { useAppContext } from '../App';
import type { FollowupMetricValue, FollowupMilestone } from '../types';

interface CompactMilestoneModalProps {
  caseId: string;
  milestone: FollowupMilestone;
  title: string;
  mode: 'monitoring' | 'followup';
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

type ContactStatus = 'yes' | 'no' | '';
type ContactReason = 'Unable to reach' | 'Wrong number' | 'Call back later' | 'Other' | '';
type HealthStatus = 'Stable' | 'Improving' | 'Concern' | 'Re-admitted' | '';
type FeedingStatus = 'Yes' | 'No' | 'Needs attention' | '';
type FamilyContinuity = 'Yes' | 'No' | 'Unsure' | '';
type YesNo = 'yes' | 'no' | '';

interface CompactMilestoneFormState {
  followupDate: string;
  contactStatus: ContactStatus;
  contactReason: ContactReason;
  healthStatus: HealthStatus;
  readmissionNote: string;
  feedingStatus: FeedingStatus;
  developmentConcern: YesNo;
  familyContinuity: FamilyContinuity;
  currentWeight: string;
  hospitalRevisit: YesNo;
  nextFollowupDue: string;
  shortRemarks: string;
}

const EMPTY_FORM: CompactMilestoneFormState = {
  followupDate: '',
  contactStatus: '',
  contactReason: '',
  healthStatus: '',
  readmissionNote: '',
  feedingStatus: '',
  developmentConcern: '',
  familyContinuity: '',
  currentWeight: '',
  hospitalRevisit: '',
  nextFollowupDue: '',
  shortRemarks: '',
};

function boolToYesNo(value?: boolean) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
}

function findMetric(values: FollowupMetricValue[], metricKey: string) {
  return values.find((value) => value.metricKey === metricKey);
}

function getTextValue(values: FollowupMetricValue[], ...metricKeys: string[]) {
  for (const metricKey of metricKeys) {
    const match = findMetric(values, metricKey);
    if (match?.valueText) {
      return match.valueText;
    }
  }
  return '';
}

function getBooleanValue(values: FollowupMetricValue[], ...metricKeys: string[]) {
  for (const metricKey of metricKeys) {
    const match = findMetric(values, metricKey);
    if (typeof match?.valueBoolean === 'boolean') {
      return match.valueBoolean;
    }
  }
  return undefined;
}

function inferHealthStatus(values: FollowupMetricValue[]) {
  const saved = getTextValue(values, 'overallHealthStatus');
  if (saved) {
    return saved as HealthStatus;
  }

  const noMajorIllness = getBooleanValue(values, 'noMajorIllness');
  if (noMajorIllness === true) return 'Stable';
  if (noMajorIllness === false) return 'Concern';
  return '';
}

function inferFeedingStatus(values: FollowupMetricValue[]) {
  const saved = getTextValue(values, 'feedingStatusQuick');
  if (saved) {
    return saved as FeedingStatus;
  }

  const legacyText = getTextValue(values, 'feeding_pattern');
  if (legacyText) {
    return legacyText as FeedingStatus;
  }

  const feedingOkay = getBooleanValue(values, 'feedingStatus');
  if (feedingOkay === true) return 'Yes';
  if (feedingOkay === false) return 'Needs attention';
  return '';
}

function inferDevelopmentConcern(values: FollowupMetricValue[]) {
  const saved = getBooleanValue(values, 'developmentConcern');
  if (typeof saved === 'boolean') {
    return boolToYesNo(saved) as YesNo;
  }

  const legacySignals = [
    getBooleanValue(values, 'developmentNormal'),
    getBooleanValue(values, 'languageMilestone'),
    getBooleanValue(values, 'motor_development'),
    getBooleanValue(values, 'speech_development'),
    getBooleanValue(values, 'cognitive_skills'),
    getBooleanValue(values, 'social_interaction'),
  ].filter((value): value is boolean => typeof value === 'boolean');

  if (legacySignals.includes(false)) return 'yes';
  if (legacySignals.length > 0 && legacySignals.every(Boolean)) return 'no';
  return '';
}

function toMetricValue(caseId: string, milestoneMonths: FollowupMilestone['milestoneMonths'], metricKey: string, value: string | boolean | undefined) {
  return typeof value === 'boolean'
    ? { caseId, milestoneMonths, metricKey, valueBoolean: value }
    : { caseId, milestoneMonths, metricKey, valueText: value || undefined };
}

function buildInitialState(milestone: FollowupMilestone, values: FollowupMetricValue[]): CompactMilestoneFormState {
  return {
    followupDate: milestone.followupDate ? milestone.followupDate.split('T')[0] : '',
    contactStatus: boolToYesNo(getBooleanValue(values, 'contactSuccessful')) as ContactStatus,
    contactReason: getTextValue(values, 'contactReason') as ContactReason,
    healthStatus: inferHealthStatus(values),
    readmissionNote: getTextValue(values, 'readmissionNote'),
    feedingStatus: inferFeedingStatus(values),
    developmentConcern: inferDevelopmentConcern(values),
    familyContinuity: getTextValue(values, 'familyContinuity') as FamilyContinuity,
    currentWeight: getTextValue(values, 'currentWeight'),
    hospitalRevisit: boolToYesNo(getBooleanValue(values, 'hospitalRevisit')) as YesNo,
    nextFollowupDue: getTextValue(values, 'nextFollowupDue'),
    shortRemarks: getTextValue(values, 'shortRemarks') || milestone.notes || '',
  };
}

function ChoiceChips<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | '';
  options: readonly T[];
  onChange: (nextValue: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <label
            key={option}
            className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selected
                ? 'border-[var(--nfi-primary)] bg-blue-50 text-blue-700'
                : 'border-[var(--nfi-border)] bg-white text-[var(--nfi-text)]'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={selected}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-[var(--nfi-text)]">
        {icon}
        <h4 className="font-semibold">{title}</h4>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function CompactMilestoneModal({
  caseId,
  milestone,
  title,
  mode,
  onClose,
  onSaved,
}: CompactMilestoneModalProps) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompactMilestoneFormState>(EMPTY_FORM);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const values = await provider.getFollowupMetricValues(caseId, milestone.milestoneMonths);
        if (!mounted) return;
        setForm(buildInitialState(milestone, values));
      } catch (error) {
        console.error('Error loading compact milestone form:', error);
        if (mounted) {
          showToast('Failed to load milestone details', 'error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [caseId, milestone, provider, showToast]);

  const helperText = useMemo(
    () =>
      mode === 'monitoring'
        ? 'Capture the current milestone status with only the operational details needed for BENI monitoring.'
        : 'Record the outreach completion and any short follow-up remarks for this milestone.',
    [mode]
  );

  const updateForm = <K extends keyof CompactMilestoneFormState>(key: K, value: CompactMilestoneFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.followupDate) {
      showToast('Please set the follow-up date', 'error');
      return;
    }

    if (form.contactStatus === 'no' && !form.contactReason) {
      showToast('Please select why contact was not completed', 'error');
      return;
    }

    if (form.healthStatus === 'Re-admitted' && !form.readmissionNote.trim()) {
      showToast('Please add a short re-admission note', 'error');
      return;
    }

    setSaving(true);
    try {
      const values = [
        toMetricValue(caseId, milestone.milestoneMonths, 'contactSuccessful', form.contactStatus === 'yes' ? true : form.contactStatus === 'no' ? false : undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'contactReason', form.contactStatus === 'no' ? form.contactReason : undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'overallHealthStatus', form.healthStatus || undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'readmissionNote', form.healthStatus === 'Re-admitted' ? form.readmissionNote.trim() : undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'feedingStatusQuick', form.feedingStatus || undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'developmentConcern', form.developmentConcern === 'yes' ? true : form.developmentConcern === 'no' ? false : undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'familyContinuity', form.familyContinuity || undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'currentWeight', form.currentWeight.trim()),
        toMetricValue(caseId, milestone.milestoneMonths, 'hospitalRevisit', form.hospitalRevisit === 'yes' ? true : form.hospitalRevisit === 'no' ? false : undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'nextFollowupDue', form.nextFollowupDue || undefined),
        toMetricValue(caseId, milestone.milestoneMonths, 'shortRemarks', form.shortRemarks.trim()),
      ];

      await provider.saveFollowupMetricValues(caseId, milestone.milestoneMonths, values);
      await provider.setFollowupDate(
        caseId,
        milestone.milestoneMonths,
        new Date(form.followupDate).toISOString(),
        form.shortRemarks.trim() || undefined
      );

      showToast(mode === 'monitoring' ? 'Monitoring milestone saved' : 'Follow-up saved', 'success');
      await onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving compact milestone form:', error);
      showToast('Failed to save milestone details', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <NfiModal
      isOpen={true}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <NfiButton variant="secondary" onClick={onClose}>
            Cancel
          </NfiButton>
          <NfiButton onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Milestone'}
          </NfiButton>
        </>
      }
    >
      {loading ? (
        <div className="py-6 text-center text-[var(--nfi-text-secondary)]">Loading milestone details...</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium text-[var(--nfi-text)]">{milestone.milestoneMonths}-month milestone</p>
                <p className="text-sm text-[var(--nfi-text-secondary)]">{helperText}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard icon={<Phone size={18} className="text-blue-600" />} title="Contact and Follow-up">
              <NfiField label="Follow-up date" required>
                <input
                  type="date"
                  className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={form.followupDate}
                  onChange={(event) => updateForm('followupDate', event.target.value)}
                />
              </NfiField>
              <NfiField label="Contacted successfully?">
                <ChoiceChips
                  name="contactStatus"
                  value={form.contactStatus}
                  options={['yes', 'no'] as const}
                  onChange={(value) => {
                    updateForm('contactStatus', value);
                    if (value !== 'no') {
                      updateForm('contactReason', '');
                    }
                  }}
                />
              </NfiField>
              {form.contactStatus === 'no' && (
                <NfiField label="If no, reason">
                  <ChoiceChips
                    name="contactReason"
                    value={form.contactReason}
                    options={['Unable to reach', 'Wrong number', 'Call back later', 'Other'] as const}
                    onChange={(value) => updateForm('contactReason', value)}
                  />
                </NfiField>
              )}
              <NfiField label="Next follow-up due">
                <input
                  type="date"
                  className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={form.nextFollowupDue}
                  onChange={(event) => updateForm('nextFollowupDue', event.target.value)}
                />
              </NfiField>
            </SectionCard>

            <SectionCard icon={<Stethoscope size={18} className="text-emerald-600" />} title="Baby Health">
              <NfiField label="Overall health status">
                <ChoiceChips
                  name="healthStatus"
                  value={form.healthStatus}
                  options={['Stable', 'Improving', 'Concern', 'Re-admitted'] as const}
                  onChange={(value) => {
                    updateForm('healthStatus', value);
                    if (value !== 'Re-admitted') {
                      updateForm('readmissionNote', '');
                    }
                  }}
                />
              </NfiField>
              {form.healthStatus === 'Re-admitted' && (
                <NfiField label="Re-admission note">
                  <textarea
                    rows={2}
                    maxLength={140}
                    className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={form.readmissionNote}
                    onChange={(event) => updateForm('readmissionNote', event.target.value)}
                    placeholder="Short note about the re-admission"
                  />
                </NfiField>
              )}
              <NfiField label="Hospital revisit needed or done?">
                <ChoiceChips
                  name="hospitalRevisit"
                  value={form.hospitalRevisit}
                  options={['yes', 'no'] as const}
                  onChange={(value) => updateForm('hospitalRevisit', value)}
                />
              </NfiField>
              <NfiField label="Current weight (optional)">
                <div className="relative">
                  <Scale size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-[var(--nfi-border)] py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={form.currentWeight}
                    onChange={(event) => updateForm('currentWeight', event.target.value)}
                    placeholder="e.g. 3.4 kg"
                  />
                </div>
              </NfiField>
            </SectionCard>

            <SectionCard icon={<CheckCircle2 size={18} className="text-violet-600" />} title="Feeding and Development">
              <NfiField label="Feeding going well?">
                <ChoiceChips
                  name="feedingStatus"
                  value={form.feedingStatus}
                  options={['Yes', 'No', 'Needs attention'] as const}
                  onChange={(value) => updateForm('feedingStatus', value)}
                />
              </NfiField>
              <NfiField label="Any developmental concern observed?">
                <ChoiceChips
                  name="developmentConcern"
                  value={form.developmentConcern}
                  options={['yes', 'no'] as const}
                  onChange={(value) => updateForm('developmentConcern', value)}
                />
              </NfiField>
              <NfiField label="Family continuing follow-up as advised?">
                <ChoiceChips
                  name="familyContinuity"
                  value={form.familyContinuity}
                  options={['Yes', 'No', 'Unsure'] as const}
                  onChange={(value) => updateForm('familyContinuity', value)}
                />
              </NfiField>
            </SectionCard>

            <SectionCard icon={<MessageSquare size={18} className="text-amber-600" />} title="Short Remarks">
              <NfiField
                label="Remarks"
                hint="Keep this short and operational. Long narrative notes are intentionally de-emphasized."
              >
                <textarea
                  rows={4}
                  maxLength={240}
                  className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={form.shortRemarks}
                  onChange={(event) => updateForm('shortRemarks', event.target.value)}
                  placeholder="Add only the brief details needed for follow-up"
                />
              </NfiField>
            </SectionCard>
          </div>
        </div>
      )}
    </NfiModal>
  );
}
