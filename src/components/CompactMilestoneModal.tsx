import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, FileText, MessageSquare } from 'lucide-react';
import { NfiButton } from './design-system/NfiButton';
import { NfiField } from './design-system/NfiField';
import { NfiModal } from './design-system/NfiModal';
import { NfiBadge } from './design-system/NfiBadge';
import { useToast } from './design-system/Toast';
import { useAppContext } from '../App';
import { getAuthState } from '../utils/auth';
import { formatDateDMY } from '../utils/dateFormat';
import type { FollowupMetricValue, FollowupMilestone } from '../types';
import {
  FOLLOWUP_META_KEYS,
  FOLLOWUP_REMARK_FIELDS,
  FOLLOWUP_RESPONSE_OPTIONS,
  deriveFollowupMilestoneSnapshot,
  getFollowupQuestionnaire,
  getFollowupQuestionResponse,
  getMetricValueText,
  getSectionProgress,
  type FollowupDraftState,
  type FollowupResponseValue,
} from '../utils/followupQuestionnaires';
import { getFollowupAuditLabel, logAuditEvent } from '../utils/auditTrail';

interface CompactMilestoneModalProps {
  caseId: string;
  milestone: FollowupMilestone;
  title: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface CompactMilestoneFormState {
  followupDate: string;
  answers: Record<string, FollowupResponseValue | ''>;
  questionNotes: Record<string, string>;
  remarks: Record<string, string>;
  summary: string;
  keyObservations: string;
  redFlags: string;
  escalationNote: string;
}

const EMPTY_FORM: CompactMilestoneFormState = {
  followupDate: '',
  answers: {},
  questionNotes: {},
  remarks: {},
  summary: '',
  keyObservations: '',
  redFlags: '',
  escalationNote: '',
};

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

function buildInitialState(milestone: FollowupMilestone, values: FollowupMetricValue[]): CompactMilestoneFormState {
  const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
  const answers = questionnaire.questions.reduce<Record<string, FollowupResponseValue | ''>>((acc, questionItem) => {
    acc[questionItem.metricKey] = getFollowupQuestionResponse(values, questionItem.metricKey);
    return acc;
  }, {});

  const questionNotes = questionnaire.questions.reduce<Record<string, string>>((acc, questionItem) => {
    if (questionItem.noteMetricKey) {
      acc[questionItem.metricKey] = getMetricValueText(values, questionItem.noteMetricKey);
    }
    return acc;
  }, {});

  const remarks = FOLLOWUP_REMARK_FIELDS.reduce<Record<string, string>>((acc, field) => {
    acc[field.metricKey] = getMetricValueText(values, field.metricKey);
    return acc;
  }, {});

  return {
    followupDate:
      getMetricValueText(values, FOLLOWUP_META_KEYS.followupDate) ||
      (milestone.followupDate ? milestone.followupDate.split('T')[0] : ''),
    answers,
    questionNotes,
    remarks,
    summary: getMetricValueText(values, FOLLOWUP_META_KEYS.summary),
    keyObservations: getMetricValueText(values, FOLLOWUP_META_KEYS.keyObservations),
    redFlags: getMetricValueText(values, FOLLOWUP_META_KEYS.redFlags),
    escalationNote: getMetricValueText(values, FOLLOWUP_META_KEYS.escalationNote),
  };
}

function buildPayload(
  caseId: string,
  milestone: FollowupMilestone,
  form: CompactMilestoneFormState,
  targetStatus: FollowupDraftState,
  completedAt: string | undefined,
  completedBy: string | undefined,
  actorName: string,
): Omit<FollowupMetricValue, 'valueId'>[] {
  const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
  const questionValues = questionnaire.questions.flatMap((questionItem) => ([
    {
      caseId,
      milestoneMonths: milestone.milestoneMonths,
      metricKey: questionItem.metricKey,
      valueText: form.answers[questionItem.metricKey] || undefined,
    },
    {
      caseId,
      milestoneMonths: milestone.milestoneMonths,
      metricKey: questionItem.noteMetricKey || `${questionItem.metricKey}Note`,
      valueText: form.questionNotes[questionItem.metricKey]?.trim() || undefined,
    },
  ]));

  const remarkValues = FOLLOWUP_REMARK_FIELDS.map((field) => ({
    caseId,
    milestoneMonths: milestone.milestoneMonths,
    metricKey: field.metricKey,
    valueText: form.remarks[field.metricKey]?.trim() || undefined,
  }));

  const metaValues = [
    { metricKey: FOLLOWUP_META_KEYS.questionnaireStatus, valueText: targetStatus },
    { metricKey: FOLLOWUP_META_KEYS.followupDate, valueText: form.followupDate || undefined },
    { metricKey: FOLLOWUP_META_KEYS.summary, valueText: form.summary.trim() || undefined },
    { metricKey: FOLLOWUP_META_KEYS.keyObservations, valueText: form.keyObservations.trim() || undefined },
    { metricKey: FOLLOWUP_META_KEYS.redFlags, valueText: form.redFlags.trim() || undefined },
    { metricKey: FOLLOWUP_META_KEYS.escalationNote, valueText: form.escalationNote.trim() || undefined },
    { metricKey: FOLLOWUP_META_KEYS.completedAt, valueText: completedAt },
    { metricKey: FOLLOWUP_META_KEYS.completedBy, valueText: completedBy },
    { metricKey: FOLLOWUP_META_KEYS.updatedAt, valueText: new Date().toISOString() },
    { metricKey: FOLLOWUP_META_KEYS.updatedBy, valueText: actorName },
  ].map((item) => ({
    caseId,
    milestoneMonths: milestone.milestoneMonths,
    metricKey: item.metricKey,
    valueText: item.valueText,
  }));

  return [...questionValues, ...remarkValues, ...metaValues];
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
  const authState = getAuthState();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<FollowupMetricValue[]>([]);
  const [form, setForm] = useState<CompactMilestoneFormState>(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
  const snapshot = useMemo(() => deriveFollowupMilestoneSnapshot(milestone, values), [milestone, values]);
  const sectionProgress = useMemo(() => {
    const workingValues = buildPayload(
      caseId,
      milestone,
      form,
      snapshot.status === 'Completed' ? 'Completed' : 'In Progress',
      snapshot.completedAt,
      snapshot.completedBy,
      authState.activeUser?.fullName || authState.activeUser?.userId || 'System',
    );
    return getSectionProgress(milestone.milestoneMonths, workingValues as FollowupMetricValue[]);
  }, [authState.activeUser?.fullName, authState.activeUser?.userId, caseId, form, milestone, snapshot.completedAt, snapshot.completedBy, snapshot.status]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const storedValues = await provider.getFollowupMetricValues(caseId, milestone.milestoneMonths);
        if (!mounted) return;
        setValues(storedValues);
        setForm(buildInitialState(milestone, storedValues));
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

    void load();
    return () => {
      mounted = false;
    };
  }, [caseId, milestone, provider, showToast]);

  function updateAnswer(metricKey: string, value: FollowupResponseValue) {
    setValidationError(null);
    setForm((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [metricKey]: value,
      },
    }));
  }

  function updateQuestionNote(metricKey: string, value: string) {
    setForm((current) => ({
      ...current,
      questionNotes: {
        ...current.questionNotes,
        [metricKey]: value,
      },
    }));
  }

  function updateRemark(metricKey: string, value: string) {
    setForm((current) => ({
      ...current,
      remarks: {
        ...current.remarks,
        [metricKey]: value,
      },
    }));
  }

  async function persist(target: 'draft' | 'complete') {
    const actorName = authState.activeUser?.fullName || authState.activeUser?.userId || 'System';
    const wasCompleted = snapshot.status === 'Completed';
    const targetStatus: FollowupDraftState = target === 'complete' || wasCompleted ? 'Completed' : 'In Progress';

    if (target === 'complete') {
      if (!form.followupDate) {
        setValidationError('Follow-up date is required before completing the questionnaire.');
        return;
      }

      const unanswered = questionnaire.questions.filter((questionItem) => !form.answers[questionItem.metricKey]);
      if (unanswered.length > 0) {
        setValidationError(`Complete all required milestone questions before marking this questionnaire complete. ${unanswered.length} answer(s) are still missing.`);
        return;
      }
    }

    setSaving(true);
    setValidationError(null);
    try {
      const completedAt = targetStatus === 'Completed' ? snapshot.completedAt || new Date().toISOString() : undefined;
      const completedBy = targetStatus === 'Completed' ? snapshot.completedBy || actorName : undefined;
      const payload = buildPayload(caseId, milestone, form, targetStatus, completedAt, completedBy, actorName);

      await provider.saveFollowupMetricValues(caseId, milestone.milestoneMonths, payload);
      if (targetStatus === 'Completed' && form.followupDate) {
        await provider.setFollowupDate(
          caseId,
          milestone.milestoneMonths,
          new Date(form.followupDate).toISOString(),
          form.summary.trim() || form.remarks.doctorRemarks?.trim() || undefined,
        );
      }

      const label = getFollowupAuditLabel(milestone.milestoneMonths);
      if (wasCompleted) {
        await logAuditEvent({
          caseId,
          action: `Updated ${label} questionnaire after completion`,
          notes: `${label} reopened for edits. Follow-up date: ${form.followupDate || 'Not recorded'}.`,
        });
      } else if (target === 'complete') {
        await logAuditEvent({
          caseId,
          action: `Completed ${label} questionnaire`,
          notes: `Follow-up recorded on ${form.followupDate}.`,
        });
      } else {
        await logAuditEvent({
          caseId,
          action: `Saved ${label} draft`,
          notes: `${Object.values(form.answers).filter(Boolean).length} of ${questionnaire.questions.length} milestone questions answered.`,
        });
      }

      await logAuditEvent({
        caseId,
        action: 'Milestone follow-up summary updated',
        notes: `${label}: ${form.summary.trim() || form.redFlags.trim() || form.keyObservations.trim() || 'Summary refreshed.'}`,
      });

      showToast(
        wasCompleted ? 'Questionnaire updated' : target === 'complete' ? 'Questionnaire completed' : 'Draft saved',
        'success',
      );
      await onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving milestone questionnaire:', error);
      showToast('Failed to save milestone questionnaire', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <NfiModal
      isOpen={true}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          <NfiButton variant="secondary" onClick={onClose}>
            Cancel
          </NfiButton>
          <NfiButton variant="secondary" onClick={() => void persist('draft')} disabled={saving || loading}>
            {snapshot.status === 'Completed' ? 'Save Changes' : saving ? 'Saving...' : 'Save Draft'}
          </NfiButton>
          <NfiButton onClick={() => void persist('complete')} disabled={saving || loading}>
            {saving ? 'Saving...' : snapshot.status === 'Completed' ? 'Update Complete Questionnaire' : 'Mark Complete'}
          </NfiButton>
        </>
      }
    >
      {loading ? (
        <div className="py-6 text-center text-[var(--nfi-text-secondary)]">Loading milestone questionnaire...</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <FileText size={18} className="mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-[var(--nfi-text)]">{questionnaire.milestoneLabel}</p>
                  <p className="mt-1 text-sm text-[var(--nfi-text-secondary)]">
                    Question content is mapped from the volunteer follow-up source file and organized into readable sections.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NfiBadge tone={snapshot.status === 'Completed' ? 'success' : snapshot.status === 'Upcoming' ? 'neutral' : 'warning'}>
                  {snapshot.status}
                </NfiBadge>
                <div className="text-right text-sm text-[var(--nfi-text-secondary)]">
                  <div>Due {formatDateDMY(snapshot.dueDate)}</div>
                  <div>{snapshot.answeredCount} / {snapshot.questionCount} answered</div>
                </div>
              </div>
            </div>
          </div>

          {validationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <span>{validationError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
                <div className="mb-4 flex items-center gap-2 text-[var(--nfi-text)]">
                  <CalendarDays size={18} className="text-blue-600" />
                  <h4 className="font-semibold">Follow-up Details</h4>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <NfiField label="Follow-up date" required>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={form.followupDate}
                      onChange={(event) => setForm((current) => ({ ...current, followupDate: event.target.value }))}
                    />
                  </NfiField>
                  <NfiField label="Milestone due date">
                    <input
                      type="text"
                      value={formatDateDMY(snapshot.dueDate)}
                      readOnly
                      className="w-full rounded-lg border border-[var(--nfi-border)] bg-slate-50 px-3 py-2 text-[var(--nfi-text-secondary)]"
                    />
                  </NfiField>
                </div>
              </div>

              {questionnaire.sections.map((section) => {
                const progress = sectionProgress.find((item) => item.sectionKey === section.sectionKey);
                const sectionQuestions = questionnaire.questions.filter((questionItem) => section.questionMetricKeys.includes(questionItem.metricKey));
                return (
                  <div key={section.sectionKey} className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="font-semibold text-[var(--nfi-text)]">{section.title}</h4>
                        {section.description && <p className="mt-1 text-sm text-[var(--nfi-text-secondary)]">{section.description}</p>}
                      </div>
                      <span className="text-xs font-medium text-[var(--nfi-text-secondary)]">
                        {progress?.answeredCount || 0} / {progress?.totalQuestions || sectionQuestions.length} answered
                      </span>
                    </div>

                    <div className="space-y-4">
                      {sectionQuestions.map((questionItem, index) => (
                        <div key={questionItem.metricKey} className="rounded-lg border border-[var(--nfi-border)] bg-slate-50 p-4">
                          <p className="font-medium text-[var(--nfi-text)]">
                            {index + 1}. {questionItem.label}
                          </p>
                          <div className="mt-3">
                            <ChoiceChips
                              name={questionItem.metricKey}
                              value={form.answers[questionItem.metricKey] || ''}
                              options={FOLLOWUP_RESPONSE_OPTIONS}
                              onChange={(value) => updateAnswer(questionItem.metricKey, value)}
                            />
                          </div>
                          <div className="mt-3">
                            <textarea
                              rows={2}
                              className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                              value={form.questionNotes[questionItem.metricKey] || ''}
                              onChange={(event) => updateQuestionNote(questionItem.metricKey, event.target.value)}
                              placeholder="Optional note"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

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

            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-[var(--nfi-text)]">
                  <ClipboardList size={18} className="text-blue-600" />
                  <h4 className="font-semibold">Section Completion</h4>
                </div>
                <div className="space-y-3">
                  {sectionProgress.map((item) => (
                    <div key={item.sectionKey}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-[var(--nfi-text)]">{item.title}</span>
                        <span className="text-[var(--nfi-text-secondary)]">{item.answeredCount} / {item.totalQuestions}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-[var(--nfi-primary)]" style={{ width: `${item.completionPercent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
                <div className="mb-4 flex items-center gap-2 text-[var(--nfi-text)]">
                  <FileText size={18} className="text-green-600" />
                  <h4 className="font-semibold">Summary & Escalation</h4>
                </div>
                <div className="space-y-4">
                  <NfiField label="Short summary / preview">
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={form.summary}
                      onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                      placeholder="Short summary shown on the milestone card"
                    />
                  </NfiField>
                  <NfiField label="Key observations">
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={form.keyObservations}
                      onChange={(event) => setForm((current) => ({ ...current, keyObservations: event.target.value }))}
                      placeholder="Important observations from the call / visit"
                    />
                  </NfiField>
                  <NfiField label="Red flags / concerns">
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={form.redFlags}
                      onChange={(event) => setForm((current) => ({ ...current, redFlags: event.target.value }))}
                      placeholder="Any concern that should stand out on review"
                    />
                  </NfiField>
                  <NfiField label="Escalation note">
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-[var(--nfi-border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={form.escalationNote}
                      onChange={(event) => setForm((current) => ({ ...current, escalationNote: event.target.value }))}
                      placeholder="Optional prototype note for follow-up escalation"
                    />
                  </NfiField>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </NfiModal>
  );
}
