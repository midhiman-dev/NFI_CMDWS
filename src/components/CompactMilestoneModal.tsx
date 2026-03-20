import { useEffect, useState } from 'react';
import { CalendarDays, FileText, MessageSquare } from 'lucide-react';
import { NfiButton } from './design-system/NfiButton';
import { NfiField } from './design-system/NfiField';
import { NfiModal } from './design-system/NfiModal';
import { useToast } from './design-system/Toast';
import { useAppContext } from '../App';
import type { FollowupMetricValue, FollowupMilestone } from '../types';
import {
  FOLLOWUP_REMARK_FIELDS,
  FOLLOWUP_RESPONSE_OPTIONS,
  getFollowupQuestionnaire,
  type FollowupResponseValue,
} from '../utils/followupQuestionnaires';

interface CompactMilestoneModalProps {
  caseId: string;
  milestone: FollowupMilestone;
  title: string;
  mode: 'monitoring' | 'followup';
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface CompactMilestoneFormState {
  followupDate: string;
  answers: Record<string, FollowupResponseValue | ''>;
  remarks: Record<string, string>;
}

const EMPTY_FORM: CompactMilestoneFormState = {
  followupDate: '',
  answers: {},
  remarks: {},
};

function findMetric(values: FollowupMetricValue[], metricKey: string) {
  return values.find((value) => value.metricKey === metricKey);
}

function getStoredResponse(values: FollowupMetricValue[], metricKey: string): FollowupResponseValue | '' {
  const metric = findMetric(values, metricKey);
  const normalized = metric?.valueText?.trim();
  if (normalized === 'Yes' || normalized === 'No' || normalized === 'Not Checked / Not Known') {
    return normalized;
  }
  return '';
}

function getStoredText(values: FollowupMetricValue[], metricKey: string) {
  return findMetric(values, metricKey)?.valueText || '';
}

function buildInitialState(milestone: FollowupMilestone, values: FollowupMetricValue[]): CompactMilestoneFormState {
  const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
  const answers = questionnaire.questions.reduce<Record<string, FollowupResponseValue | ''>>((acc, question) => {
    acc[question.metricKey] = getStoredResponse(values, question.metricKey);
    return acc;
  }, {});

  const remarks = FOLLOWUP_REMARK_FIELDS.reduce<Record<string, string>>((acc, field) => {
    acc[field.metricKey] = getStoredText(values, field.metricKey);
    return acc;
  }, {});

  if (!remarks.doctorRemarks && milestone.notes) {
    remarks.doctorRemarks = milestone.notes;
  }

  return {
    followupDate: milestone.followupDate ? milestone.followupDate.split('T')[0] : '',
    answers,
    remarks,
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

export function CompactMilestoneModal({
  caseId,
  milestone,
  title,
  onClose,
  onSaved,
}: CompactMilestoneModalProps) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompactMilestoneFormState>(EMPTY_FORM);

  const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const values = await provider.getFollowupMetricValues(caseId, milestone.milestoneMonths);
        if (!mounted) return;
        setForm(buildInitialState(milestone, values));
      } catch (error) {
        console.error('Error loading milestone questionnaire:', error);
        if (mounted) {
          showToast('Failed to load milestone questionnaire', 'error');
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

  const updateAnswer = (metricKey: string, value: FollowupResponseValue) => {
    setForm((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [metricKey]: value,
      },
    }));
  };

  const updateRemark = (metricKey: string, value: string) => {
    setForm((current) => ({
      ...current,
      remarks: {
        ...current.remarks,
        [metricKey]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.followupDate) {
      showToast('Please set the follow-up date', 'error');
      return;
    }

    setSaving(true);
    try {
      const values = [
        ...questionnaire.questions.map((question) => ({
          caseId,
          milestoneMonths: milestone.milestoneMonths,
          metricKey: question.metricKey,
          valueText: form.answers[question.metricKey] || undefined,
        })),
        ...FOLLOWUP_REMARK_FIELDS.map((field) => ({
          caseId,
          milestoneMonths: milestone.milestoneMonths,
          metricKey: field.metricKey,
          valueText: form.remarks[field.metricKey]?.trim() || undefined,
        })),
      ];

      await provider.saveFollowupMetricValues(caseId, milestone.milestoneMonths, values);
      await provider.setFollowupDate(
        caseId,
        milestone.milestoneMonths,
        new Date(form.followupDate).toISOString(),
        form.remarks.doctorRemarks?.trim() || undefined,
      );

      showToast('Follow-up saved', 'success');
      await onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving milestone questionnaire:', error);
      showToast('Failed to save milestone questionnaire', 'error');
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
            {saving ? 'Saving...' : 'Save Follow-up'}
          </NfiButton>
        </>
      }
    >
      {loading ? (
        <div className="py-6 text-center text-[var(--nfi-text-secondary)]">Loading milestone questionnaire...</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <FileText size={18} className="mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium text-[var(--nfi-text)]">{questionnaire.milestoneLabel}</p>
                <p className="text-sm text-[var(--nfi-text-secondary)]">
                  Milestone-specific questionnaire aligned to the volunteer follow-up source file.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--nfi-text)]">
              <CalendarDays size={18} className="text-blue-600" />
              <h4 className="font-semibold">Follow-up Details</h4>
            </div>
            <NfiField label="Follow-up date" required>
              <input
                type="date"
                className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={form.followupDate}
                onChange={(event) => setForm((current) => ({ ...current, followupDate: event.target.value }))}
              />
            </NfiField>
          </div>

          <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
            <div className="mb-4">
              <h4 className="font-semibold text-[var(--nfi-text)]">{questionnaire.sectionTitle}</h4>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
                Record each item using the lightweight prototype response model.
              </p>
            </div>
            <div className="space-y-4">
              {questionnaire.questions.map((question, index) => (
                <div key={question.metricKey} className="rounded-lg border border-[var(--nfi-border)] bg-slate-50 p-4">
                  <p className="font-medium text-[var(--nfi-text)]">
                    {index + 1}. {question.label}
                  </p>
                  <div className="mt-3">
                    <ChoiceChips
                      name={question.metricKey}
                      value={form.answers[question.metricKey] || ''}
                      options={FOLLOWUP_RESPONSE_OPTIONS}
                      onChange={(value) => updateAnswer(question.metricKey, value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-[var(--nfi-text)]">
              <MessageSquare size={18} className="text-amber-600" />
              <h4 className="font-semibold">Remarks & Concerns</h4>
            </div>
            <div className="space-y-4">
              {FOLLOWUP_REMARK_FIELDS.map((field) => (
                <NfiField key={field.metricKey} label={field.label}>
                  <textarea
                    rows={3}
                    maxLength={240}
                    className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={form.remarks[field.metricKey] || ''}
                    onChange={(event) => updateRemark(field.metricKey, event.target.value)}
                    placeholder={field.label}
                  />
                </NfiField>
              ))}
            </div>
          </div>
        </div>
      )}
    </NfiModal>
  );
}
