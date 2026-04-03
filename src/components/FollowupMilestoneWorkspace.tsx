import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, CheckCircle2, Clock3, FileText } from 'lucide-react';
import { NfiBadge } from './design-system/NfiBadge';
import { NfiButton } from './design-system/NfiButton';
import { useToast } from './design-system/Toast';
import { CompactMilestoneModal } from './CompactMilestoneModal';
import { useAppContext } from '../App';
import { formatDateDMY } from '../utils/dateFormat';
import { getFollowupAuditLabel, logAuditEvent } from '../utils/auditTrail';
import type { FollowupMilestone } from '../types';
import {
  deriveFollowupMilestoneSnapshot,
  getFollowupQuestionnaire,
  sortMilestonesBySourceOrder,
  type FollowupMilestoneSnapshot,
} from '../utils/followupQuestionnaires';

interface FollowupMilestoneWorkspaceProps {
  caseId: string;
  anchorDate?: string;
  anchorLabel?: string;
  caseAllottedToLabel?: string;
  title?: string;
  description?: string;
}

type LoadedMilestone = {
  raw: FollowupMilestone;
  snapshot: FollowupMilestoneSnapshot;
};

export function FollowupMilestoneWorkspace({
  caseId,
  anchorDate,
  anchorLabel,
  caseAllottedToLabel,
  title = 'Milestone Follow-up',
  description = 'Milestones remain separate from case-level operations and each card opens its own structured questionnaire.',
}: FollowupMilestoneWorkspaceProps) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<LoadedMilestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<FollowupMilestone | null>(null);

  useEffect(() => {
    void loadMilestones();
  }, [caseId, anchorDate, provider]);

  async function loadMilestones() {
    try {
      setLoading(true);
      const rawMilestones = anchorDate
        ? await provider.ensureFollowupMilestones(caseId, anchorDate)
        : await provider.listFollowupMilestones(caseId);
      const ordered = sortMilestonesBySourceOrder(rawMilestones);
      const valueGroups = await Promise.all(
        ordered.map((milestone) => provider.getFollowupMetricValues(caseId, milestone.milestoneMonths)),
      );
      setMilestones(
        ordered.map((raw, index) => ({
          raw,
          snapshot: deriveFollowupMilestoneSnapshot(raw, valueGroups[index]),
        })),
      );
    } catch (error) {
      console.error('Error loading follow-up milestones:', error);
      showToast('Failed to load milestone follow-up data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenMilestone(milestone: FollowupMilestone, snapshot: FollowupMilestoneSnapshot) {
    setSelectedMilestone(milestone);
    try {
      await logAuditEvent({
        caseId,
        action: `Opened ${getFollowupAuditLabel(milestone.milestoneMonths)} questionnaire`,
        notes: `${snapshot.status} milestone. Due on ${snapshot.dueDate}.`,
      });
    } catch {
      // Prototype audit should not block form access.
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-[var(--nfi-text-secondary)]">Loading milestone follow-up...</div>;
  }

  if (!milestones.length) {
    return (
      <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-6 text-center">
        <p className="text-[var(--nfi-text-secondary)]">
          {anchorDate
            ? 'Milestone follow-up has not been initialized yet.'
            : 'No milestone follow-up is available until the admission or discharge anchor date is set.'}
        </p>
      </div>
    );
  }

  const completedCount = milestones.filter((item) => item.snapshot.status === 'Completed').length;
  const inProgressCount = milestones.filter((item) => item.snapshot.status === 'In Progress').length;
  const nextDue = milestones.find((item) => item.snapshot.status !== 'Completed')?.snapshot;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--nfi-text-secondary)]">{description}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric
            label="Completed Milestones"
            value={`${completedCount} / ${milestones.length}`}
            note={inProgressCount ? `${inProgressCount} questionnaire${inProgressCount > 1 ? 's' : ''} in progress` : 'No active drafts'}
            icon={<CheckCircle2 size={18} className="text-green-600" />}
          />
          <SummaryMetric
            label="Next Due Milestone"
            value={nextDue ? getFollowupQuestionnaire(nextDue.milestoneMonths).shortLabel : 'All complete'}
            note={nextDue ? `Due ${formatDateDMY(nextDue.dueDate)}` : 'No pending milestone'}
            icon={<Clock3 size={18} className="text-amber-600" />}
          />
          <SummaryMetric
            label="Anchor Date"
            value={anchorDate ? formatDateDMY(anchorDate) : 'Not set'}
            note={anchorLabel || 'Milestone schedule anchor'}
            icon={<Calendar size={18} className="text-blue-600" />}
          />
          <SummaryMetric
            label="Case Allotted To"
            value={caseAllottedToLabel || 'Not assigned'}
            note="BENI / Program Ops owner"
            icon={<FileText size={18} className="text-slate-600" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {milestones.map(({ raw, snapshot }) => {
          const questionnaire = getFollowupQuestionnaire(snapshot.milestoneMonths);
          const tone =
            snapshot.status === 'Completed'
              ? 'success'
              : snapshot.status === 'Due'
                ? 'warning'
                : snapshot.status === 'In Progress'
                  ? 'accent'
                  : 'neutral';

          return (
            <div key={raw.milestoneId} className="rounded-xl border border-[var(--nfi-border)] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-[var(--nfi-text)]">{questionnaire.milestoneLabel}</h4>
                  <p className="mt-1 text-sm text-[var(--nfi-text-secondary)]">{questionnaire.sectionTitle}</p>
                </div>
                <NfiBadge tone={tone}>{snapshot.status}</NfiBadge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[var(--nfi-text-secondary)]">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  Due: {formatDateDMY(snapshot.dueDate)}
                </div>
                <div>Follow-up date: {snapshot.followupDate ? formatDateDMY(snapshot.followupDate) : 'Not recorded'}</div>
                <div>
                  Answered: {snapshot.answeredCount} / {snapshot.questionCount} questions
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[var(--nfi-text-secondary)]">
                {snapshot.summary || questionnaire.questions[0]?.label}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--nfi-text-secondary)]">{snapshot.completionPercent}% complete</span>
                <NfiButton size="sm" variant={snapshot.status === 'Completed' ? 'secondary' : 'primary'} onClick={() => void handleOpenMilestone(raw, snapshot)}>
                  {snapshot.buttonLabel}
                </NfiButton>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMilestone && (
        <CompactMilestoneModal
          caseId={caseId}
          milestone={selectedMilestone}
          title={getFollowupQuestionnaire(selectedMilestone.milestoneMonths).milestoneLabel}
          onSaved={loadMilestones}
          onClose={() => setSelectedMilestone(null)}
        />
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/80 p-4">
      <div className="mb-2 flex items-center gap-2 text-[var(--nfi-text)]">
        {icon}
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="text-lg font-semibold text-[var(--nfi-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--nfi-text-secondary)]">{note}</p>
    </div>
  );
}
