import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, Edit2, FileText, Play, UserRound } from 'lucide-react';
import { NfiBadge } from './design-system/NfiBadge';
import { NfiButton } from './design-system/NfiButton';
import { NfiField } from './design-system/NfiField';
import { useToast } from './design-system/Toast';
import { CompactMilestoneModal } from './CompactMilestoneModal';
import { getAuthState } from '../utils/auth';
import { useAppContext } from '../App';
import { formatDateDMY } from '../utils/dateFormat';
import { logAuditEvent } from '../utils/auditTrail';
import type { Case, FamilyProfile, Hospital, User, ClinicalCaseDetails, FollowupMilestone } from '../types';
import type { BeniProgramOpsData } from '../data/providers/DataProvider';
import { getFollowupQuestionnaire, sortMilestonesBySourceOrder } from '../utils/followupQuestionnaires';

interface MonitoringTabProps {
  caseId: string;
}

export function MonitoringTab({ caseId }: MonitoringTabProps) {
  const authState = getAuthState();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [beniOps, setBeniOps] = useState<BeniProgramOpsData | null>(null);
  const [milestones, setMilestones] = useState<FollowupMilestone[]>([]);
  const [volunteers, setVolunteers] = useState<User[]>([]);
  const [clinicalDetails, setClinicalDetails] = useState<ClinicalCaseDetails | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [family, setFamily] = useState<FamilyProfile | null>(null);
  const [isEditingBeni, setIsEditingBeni] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<FollowupMilestone | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [beniForm, setBeniForm] = useState({
    beniTeamMember: '',
    hamperSentDate: '',
    voiceNoteReceivedAt: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [caseId, provider]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const caseInfo = await provider.getCaseById(caseId);
      setCaseData(caseInfo);

      if (!caseInfo) {
        setError('Case not found');
        return;
      }

      const [beniOpsData, milestonesData, volunteersData, clinicalData, hospitals, familyData] = await Promise.all([
        provider.getBeniProgramOps(caseId),
        provider.listFollowupMilestones(caseId),
        provider.listVolunteers(),
        provider.getClinicalDetails(caseId),
        provider.getHospitals(),
        provider.getFamily(caseId),
      ]);

      setBeniOps(beniOpsData);
      setMilestones(sortMilestonesBySourceOrder(milestonesData));
      setVolunteers(volunteersData);
      setClinicalDetails(clinicalData);
      setHospital(hospitals.find((item) => item.hospitalId === caseInfo.hospitalId) || null);
      setFamily(familyData);

      if (beniOpsData) {
        setBeniForm({
          beniTeamMember: beniOpsData.beniTeamMember || '',
          hamperSentDate: beniOpsData.hamperSentDate || '',
          voiceNoteReceivedAt: beniOpsData.voiceNoteReceivedAt ? beniOpsData.voiceNoteReceivedAt.split('T')[0] : '',
          notes: beniOpsData.notes || '',
        });
      }

      if (milestonesData.length === 0 && clinicalData) {
        const anchorDate = clinicalData.dischargeDate || clinicalData.admissionDate;
        if (anchorDate) {
          const newMilestones = await provider.ensureFollowupMilestones(caseId, anchorDate);
          setMilestones(sortMilestonesBySourceOrder(newMilestones));
        }
      }
    } catch (err) {
      console.error('Error loading monitoring data:', err);
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = authState.activeRole === 'beni_volunteer' || authState.activeRole === 'admin';

  if (loading) {
    return <div className="text-center py-8">Loading monitoring data...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!caseData) {
    return <div className="text-center py-8">Case not found</div>;
  }

  if (!canEdit) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--nfi-text-secondary)]">
          Monitoring is only available to BENI volunteers and administrators
        </p>
      </div>
    );
  }

  if (caseData.caseStatus !== 'Approved' && caseData.caseStatus !== 'Closed') {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--nfi-text-secondary)]">
          Monitoring is only available for approved cases
        </p>
      </div>
    );
  }

  const handleSaveBeniOps = async () => {
    setSubmitting(true);
    try {
      await provider.saveBeniProgramOps(caseId, {
        beniTeamMember: beniForm.beniTeamMember || undefined,
        hamperSentDate: beniForm.hamperSentDate || undefined,
        voiceNoteReceivedAt: beniForm.voiceNoteReceivedAt ? new Date(beniForm.voiceNoteReceivedAt).toISOString() : undefined,
        notes: beniForm.notes || undefined,
      });

      const volunteerName = volunteers.find((v) => v.userId === beniForm.beniTeamMember)?.fullName;
      const beniNotes = [
        volunteerName ? `Volunteer: ${volunteerName}` : null,
        beniForm.hamperSentDate ? `Hamper sent: ${formatDateDMY(beniForm.hamperSentDate)}` : null,
        beniForm.voiceNoteReceivedAt ? `Voice note received: ${formatDateDMY(beniForm.voiceNoteReceivedAt)}` : null,
      ].filter(Boolean).join(' | ');

      await logAuditEvent({
        caseId,
        action: 'Updated volunteer follow-up',
        notes: beniNotes || 'BENI operations details saved.',
      });

      await loadData();
      setIsEditingBeni(false);
      showToast('BENI program operations saved successfully', 'success');
    } catch (err) {
      console.error('Error saving BENI ops:', err);
      showToast('Failed to save BENI operations', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitializeMilestones = async () => {
    const anchorDate = clinicalDetails?.dischargeDate || clinicalDetails?.admissionDate;
    if (!anchorDate) {
      showToast('Please set admission or discharge date first (in Overview tab)', 'error');
      return;
    }
    try {
      const newMilestones = await provider.ensureFollowupMilestones(caseId, anchorDate);
      setMilestones(sortMilestonesBySourceOrder(newMilestones));
      await logAuditEvent({
        caseId,
        action: 'Initialized follow-up milestones',
        notes: `Anchor date set from ${clinicalDetails?.dischargeDate ? 'discharge' : 'admission'} details.`,
      });
      showToast('Milestones initialized successfully', 'success');
    } catch (err) {
      console.error('Error initializing milestones:', err);
      showToast('Failed to initialize milestones', 'error');
    }
  };

  const handleOpenQuestionnaire = (milestone: FollowupMilestone) => {
    setSelectedMilestone(milestone);
    setShowQuestionnaire(true);
  };

  const completedMilestones = milestones.filter((m) => m.status === 'Completed' || m.followupDate).length;
  const nextDueMilestone = milestones.find((m) => m.status !== 'Completed' && !m.followupDate && m.dueDate);
  const anchorDate = clinicalDetails?.dischargeDate || clinicalDetails?.admissionDate;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3 flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          Volunteer Follow-up Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Completed Milestones</p>
            <p className="text-2xl font-bold text-[var(--nfi-text)]">
              {completedMilestones} / {milestones.length}
            </p>
          </div>
          {nextDueMilestone && (
            <div>
              <p className="text-sm text-[var(--nfi-text-secondary)]">Next Due Milestone</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)]">
                {getFollowupQuestionnaire(nextDueMilestone.milestoneMonths).shortLabel}
              </p>
              <p className="text-sm text-blue-600">
                Due: {formatDateDMY(nextDueMilestone.dueDate)}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Anchor Date</p>
            <p className="text-base font-medium text-[var(--nfi-text)]">
              {anchorDate ? formatDateDMY(anchorDate) : 'Not set'}
            </p>
            <p className="text-xs text-[var(--nfi-text-secondary)]">
              {clinicalDetails?.dischargeDate ? '(Discharge)' : clinicalDetails?.admissionDate ? '(Admission)' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nfi-text)]">BENI / Program Ops</h3>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
              Case-level operational contacts are kept separate from milestone questionnaires.
            </p>
          </div>
          {beniOps && !isEditingBeni && (
            <NfiButton size="sm" onClick={() => setIsEditingBeni(true)}>
              <Edit2 size={16} className="mr-1" />
              Edit
            </NfiButton>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-lg border border-[var(--nfi-border)] bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-[var(--nfi-text)] mb-3">
              <UserRound size={18} className="text-blue-600" />
              <h4 className="font-semibold">Case-level Contacts</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoItem label="SPOC name" value={hospital?.spocName || 'Not available'} />
              <InfoItem label="SPOC number" value={hospital?.spocPhone || 'Not available'} />
              <InfoItem label="Contact 1 (NICU)" value={hospital?.spocPhone || 'Not available'} />
              <InfoItem label="Contact 2 (Home)" value={family?.phone || family?.whatsapp || 'Not available'} />
            </div>
          </div>

          {!beniOps || isEditingBeni ? (
            <div className="space-y-4 rounded-lg border border-[var(--nfi-border)] p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="BENI team member allotted">
                  <select
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={beniForm.beniTeamMember}
                    onChange={(e) => setBeniForm({ ...beniForm, beniTeamMember: e.target.value })}
                  >
                    <option value="">Select volunteer...</option>
                    {volunteers.map((v) => (
                      <option key={v.userId} value={v.userId}>
                        {v.fullName} (BENI Volunteer)
                      </option>
                    ))}
                  </select>
                </NfiField>

                <NfiField label="Hamper sent date">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={beniForm.hamperSentDate}
                    onChange={(e) => setBeniForm({ ...beniForm, hamperSentDate: e.target.value })}
                  />
                </NfiField>

                <NfiField label="Voice note / WhatsApp certificate received at discharge date">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={beniForm.voiceNoteReceivedAt}
                    onChange={(e) => setBeniForm({ ...beniForm, voiceNoteReceivedAt: e.target.value })}
                  />
                </NfiField>
              </div>

              <NfiField label="Program ops notes">
                <textarea
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  rows={3}
                  value={beniForm.notes}
                  onChange={(e) => setBeniForm({ ...beniForm, notes: e.target.value })}
                  placeholder="Add case-level BENI coordination notes"
                />
              </NfiField>

              <div className="flex gap-3">
                <NfiButton onClick={handleSaveBeniOps} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </NfiButton>
                {isEditingBeni && (
                  <NfiButton
                    variant="secondary"
                    onClick={() => {
                      setIsEditingBeni(false);
                      loadData();
                    }}
                  >
                    Cancel
                  </NfiButton>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--nfi-border)] p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoItem label="BENI team member allotted" value={beniOps.beniTeamMemberName || 'Not assigned'} />
                <InfoItem label="Hamper sent date" value={beniOps.hamperSentDate ? formatDateDMY(beniOps.hamperSentDate) : 'Not recorded'} />
                <InfoItem
                  label="Voice note / WhatsApp certificate received at discharge date"
                  value={beniOps.voiceNoteReceivedAt ? formatDateDMY(beniOps.voiceNoteReceivedAt) : 'Not recorded'}
                />
              </div>
              {beniOps.notes && (
                <div className="mt-4">
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Program ops notes</p>
                  <p className="text-[var(--nfi-text)] mt-1">{beniOps.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Milestone Follow-up</h3>
          <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
            Milestones are shown in the agreed order and each card opens its own questionnaire.
          </p>
        </div>
        {milestones.length === 0 ? (
          <div className="text-center py-8 border border-[var(--nfi-border)] rounded-lg">
            {anchorDate ? (
              <div>
                <p className="text-[var(--nfi-text-secondary)] mb-4">
                  Milestones have not been initialized yet.
                </p>
                <NfiButton onClick={handleInitializeMilestones}>
                  <Play size={16} className="mr-2" />
                  Initialize Milestones
                </NfiButton>
              </div>
            ) : (
              <p className="text-[var(--nfi-text-secondary)]">
                No milestones initialized. Please set admission or discharge date in the Overview tab first.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {milestones.map((milestone) => {
              const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
              const isCompleted = milestone.status === 'Completed' || !!milestone.followupDate;
              const tone = isCompleted ? 'success' : milestone.status === 'Due' ? 'warning' : 'neutral';
              return (
                <div key={milestone.milestoneId} className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-[var(--nfi-text)]">{questionnaire.milestoneLabel}</h4>
                      <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">{questionnaire.sectionTitle}</p>
                    </div>
                    <NfiBadge tone={tone}>
                      {isCompleted ? 'Completed' : milestone.status === 'Due' ? 'Due' : 'Upcoming'}
                    </NfiBadge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[var(--nfi-text-secondary)]">
                      <Calendar size={14} />
                      Due: {milestone.dueDate ? formatDateDMY(milestone.dueDate) : 'Not set'}
                    </div>
                    <div className="text-[var(--nfi-text-secondary)]">
                      Follow-up date: {milestone.followupDate ? formatDateDMY(milestone.followupDate) : 'Not recorded'}
                    </div>
                    <div className="text-[var(--nfi-text-secondary)]">
                      Questions: {questionnaire.questions.length}
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-[var(--nfi-text-secondary)]">
                    {questionnaire.questions[0]?.label}
                  </div>
                  <div className="mt-4">
                    <NfiButton size="sm" variant="secondary" onClick={() => handleOpenQuestionnaire(milestone)}>
                      <FileText size={14} className="mr-1" />
                      Open Questionnaire
                    </NfiButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showQuestionnaire && selectedMilestone && (
        <CompactMilestoneModal
          caseId={caseId}
          milestone={selectedMilestone}
          title={getFollowupQuestionnaire(selectedMilestone.milestoneMonths).milestoneLabel}
          mode="monitoring"
          onSaved={loadData}
          onClose={() => {
            setShowQuestionnaire(false);
            setSelectedMilestone(null);
          }}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--nfi-text-secondary)]">{label}</p>
      <p className="font-medium text-[var(--nfi-text)] mt-1">{value}</p>
    </div>
  );
}
