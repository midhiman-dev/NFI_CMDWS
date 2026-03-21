import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, CheckCircle, Edit2, FileText, Home, Package, PhoneCall, Play, UserRound } from 'lucide-react';
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

const HAMPER_STATUS_OPTIONS: Array<NonNullable<BeniProgramOpsData['hamperStatus']>> = ['Not Started', 'Sent', 'Delivered'];

type BeniFormState = {
  beniTeamMember: string;
  volunteerLead: string;
  assignedVolunteer: string;
  caseAllottedTo: string;
  spocContacted: boolean;
  preDischargeCallCompleted: boolean;
  parentContactedBeforeDischarge: boolean;
  spocContactedBeforeDischarge: boolean;
  plannedDischargeDateDiscussed: boolean;
  preDischargeContactDate: string;
  homeReachedConfirmed: boolean;
  postDischargeContactDone: boolean;
  familyReachedAtHome: boolean;
  postDischargeContactDate: string;
  hamperSentDate: string;
  hamperStatus: NonNullable<BeniProgramOpsData['hamperStatus']>;
  hamperDeliveryDate: string;
  hamperDispatchNotes: string;
  voiceNoteReceivedAt: string;
  notes: string;
};

const EMPTY_BENI_FORM: BeniFormState = {
  beniTeamMember: '',
  volunteerLead: '',
  assignedVolunteer: '',
  caseAllottedTo: '',
  spocContacted: false,
  preDischargeCallCompleted: false,
  parentContactedBeforeDischarge: false,
  spocContactedBeforeDischarge: false,
  plannedDischargeDateDiscussed: false,
  preDischargeContactDate: '',
  homeReachedConfirmed: false,
  postDischargeContactDone: false,
  familyReachedAtHome: false,
  postDischargeContactDate: '',
  hamperSentDate: '',
  hamperStatus: 'Not Started',
  hamperDeliveryDate: '',
  hamperDispatchNotes: '',
  voiceNoteReceivedAt: '',
  notes: '',
};

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
  const [beniForm, setBeniForm] = useState<BeniFormState>(EMPTY_BENI_FORM);

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
      setBeniForm(buildBeniFormState(beniOpsData));
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

  if (loading) return <div className="text-center py-8">Loading monitoring data...</div>;
  if (error) return <div className="text-center py-8"><p className="text-red-600">{error}</p></div>;
  if (!caseData) return <div className="text-center py-8">Case not found</div>;
  if (!canEdit) return <div className="text-center py-12"><p className="text-[var(--nfi-text-secondary)]">Monitoring is only available to BENI volunteers and administrators</p></div>;
  if (caseData.caseStatus !== 'Approved' && caseData.caseStatus !== 'Closed') {
    return <div className="text-center py-12"><p className="text-[var(--nfi-text-secondary)]">Monitoring is only available for approved cases</p></div>;
  }

  const handleSaveBeniOps = async () => {
    setSubmitting(true);
    try {
      await provider.saveBeniProgramOps(caseId, {
        beniTeamMember: beniForm.beniTeamMember || undefined,
        volunteerLead: beniForm.volunteerLead || undefined,
        assignedVolunteer: beniForm.assignedVolunteer || undefined,
        caseAllottedTo: beniForm.caseAllottedTo || undefined,
        spocContacted: beniForm.spocContacted,
        preDischargeCallCompleted: beniForm.preDischargeCallCompleted,
        parentContactedBeforeDischarge: beniForm.parentContactedBeforeDischarge,
        spocContactedBeforeDischarge: beniForm.spocContactedBeforeDischarge,
        plannedDischargeDateDiscussed: beniForm.plannedDischargeDateDiscussed,
        preDischargeContactDate: beniForm.preDischargeContactDate || undefined,
        homeReachedConfirmed: beniForm.homeReachedConfirmed,
        postDischargeContactDone: beniForm.postDischargeContactDone,
        familyReachedAtHome: beniForm.familyReachedAtHome,
        postDischargeContactDate: beniForm.postDischargeContactDate || undefined,
        hamperSentDate: beniForm.hamperSentDate || undefined,
        hamperStatus: beniForm.hamperStatus,
        hamperDeliveryDate: beniForm.hamperDeliveryDate || undefined,
        hamperDispatchNotes: beniForm.hamperDispatchNotes || undefined,
        voiceNoteReceivedAt: beniForm.voiceNoteReceivedAt ? new Date(beniForm.voiceNoteReceivedAt).toISOString() : undefined,
        notes: beniForm.notes || undefined,
      });
      await logAuditEvent({
        caseId,
        action: 'Updated volunteer follow-up',
        notes: buildVolunteerOpsSummary(beniForm, volunteers) || 'BENI operations details saved.',
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
      await logAuditEvent({ caseId, action: 'Initialized follow-up milestones', notes: `Anchor date set from ${clinicalDetails?.dischargeDate ? 'discharge' : 'admission'} details.` });
      showToast('Milestones initialized successfully', 'success');
    } catch (err) {
      console.error('Error initializing milestones:', err);
      showToast('Failed to initialize milestones', 'error');
    }
  };

  const completedMilestones = milestones.filter((m) => m.status === 'Completed' || m.followupDate).length;
  const nextDueMilestone = milestones.find((m) => m.status !== 'Completed' && !m.followupDate && m.dueDate);
  const anchorDate = clinicalDetails?.dischargeDate || clinicalDetails?.admissionDate;
  const currentOwner = getVolunteerDisplayName(volunteers, beniOps?.caseAllottedTo, beniOps?.caseAllottedToName);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3 flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          Volunteer Follow-up Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Completed Milestones</p>
            <p className="text-2xl font-bold text-[var(--nfi-text)]">{completedMilestones} / {milestones.length}</p>
          </div>
          {nextDueMilestone && (
            <div>
              <p className="text-sm text-[var(--nfi-text-secondary)]">Next Due Milestone</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)]">{getFollowupQuestionnaire(nextDueMilestone.milestoneMonths).shortLabel}</p>
              <p className="text-sm text-blue-600">Due: {formatDateDMY(nextDueMilestone.dueDate)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Anchor Date</p>
            <p className="text-base font-medium text-[var(--nfi-text)]">{anchorDate ? formatDateDMY(anchorDate) : 'Not set'}</p>
            <p className="text-xs text-[var(--nfi-text-secondary)]">{clinicalDetails?.dischargeDate ? '(Discharge)' : clinicalDetails?.admissionDate ? '(Admission)' : ''}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Case Allotted To</p>
            <p className="text-base font-medium text-[var(--nfi-text)]">{currentOwner || 'Not assigned'}</p>
            <p className="text-xs text-[var(--nfi-text-secondary)]">{getDischargeContactStatus(beniOps)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--nfi-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nfi-text)]">BENI / Program Ops</h3>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">Case-level operational contacts stay separate from milestone questionnaires.</p>
          </div>
          {beniOps && !isEditingBeni && (
            <NfiButton size="sm" onClick={() => setIsEditingBeni(true)}>
              <Edit2 size={16} className="mr-1" />
              Edit
            </NfiButton>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)] gap-5">
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
              <InfoItem label="SPOC contacted" value={formatBooleanStatus(beniOps?.spocContacted)} />
              <InfoItem label="Planned discharge date" value={clinicalDetails?.dischargeDate ? formatDateDMY(clinicalDetails.dischargeDate) : 'Not set'} />
            </div>
          </div>

          {!beniOps || isEditingBeni ? (
            <div className="space-y-4 rounded-lg border border-[var(--nfi-border)] p-4">
              <OpsSection title="Volunteer Lead / Assignment" icon={<UserRound size={16} className="text-blue-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <VolunteerSelect label="Volunteer Lead" value={beniForm.volunteerLead} volunteers={volunteers} placeholder="Select volunteer lead..." onChange={(value) => setBeniForm({ ...beniForm, volunteerLead: value })} />
                  <VolunteerSelect label="Assigned Volunteer" value={beniForm.assignedVolunteer} volunteers={volunteers} placeholder="Select assigned volunteer..." onChange={(value) => setBeniForm({ ...beniForm, assignedVolunteer: value })} />
                  <VolunteerSelect label="Case Allotted To" value={beniForm.caseAllottedTo} volunteers={volunteers} placeholder="Select case owner..." onChange={(value) => setBeniForm({ ...beniForm, caseAllottedTo: value })} />
                  <VolunteerSelect label="BENI team member allotted" value={beniForm.beniTeamMember} volunteers={volunteers} placeholder="Select volunteer..." onChange={(value) => setBeniForm({ ...beniForm, beniTeamMember: value })} includeRoleSuffix />
                </div>
              </OpsSection>

              <OpsSection title="Pre-discharge Coordination" icon={<PhoneCall size={16} className="text-amber-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NfiField label="Pre-discharge contact date"><DateInput value={beniForm.preDischargeContactDate} onChange={(value) => setBeniForm({ ...beniForm, preDischargeContactDate: value })} /></NfiField>
                  <NfiField label="Voice note / WhatsApp certificate received at discharge date"><DateInput value={beniForm.voiceNoteReceivedAt} onChange={(value) => setBeniForm({ ...beniForm, voiceNoteReceivedAt: value })} /></NfiField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <CheckboxField label="SPOC contacted" checked={beniForm.spocContacted} onChange={(checked) => setBeniForm({ ...beniForm, spocContacted: checked })} />
                  <CheckboxField label="Pre-discharge call completed" checked={beniForm.preDischargeCallCompleted} onChange={(checked) => setBeniForm({ ...beniForm, preDischargeCallCompleted: checked })} />
                  <CheckboxField label="Parent contacted before discharge" checked={beniForm.parentContactedBeforeDischarge} onChange={(checked) => setBeniForm({ ...beniForm, parentContactedBeforeDischarge: checked })} />
                  <CheckboxField label="SPOC contacted before discharge" checked={beniForm.spocContactedBeforeDischarge} onChange={(checked) => setBeniForm({ ...beniForm, spocContactedBeforeDischarge: checked })} />
                  <CheckboxField label="Planned discharge date discussed" checked={beniForm.plannedDischargeDateDiscussed} onChange={(checked) => setBeniForm({ ...beniForm, plannedDischargeDateDiscussed: checked })} />
                </div>
              </OpsSection>

              <OpsSection title="Post-discharge Confirmation" icon={<Home size={16} className="text-green-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NfiField label="Contact date"><DateInput value={beniForm.postDischargeContactDate} onChange={(value) => setBeniForm({ ...beniForm, postDischargeContactDate: value })} /></NfiField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <CheckboxField label="Home reached confirmed" checked={beniForm.homeReachedConfirmed} onChange={(checked) => setBeniForm({ ...beniForm, homeReachedConfirmed: checked })} />
                  <CheckboxField label="Post-discharge contact done" checked={beniForm.postDischargeContactDone} onChange={(checked) => setBeniForm({ ...beniForm, postDischargeContactDone: checked })} />
                  <CheckboxField label="Family reached at home" checked={beniForm.familyReachedAtHome} onChange={(checked) => setBeniForm({ ...beniForm, familyReachedAtHome: checked })} />
                </div>
              </OpsSection>

              <OpsSection title="Hamper Tracking" icon={<Package size={16} className="text-purple-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NfiField label="Hamper dispatch status">
                    <select className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" value={beniForm.hamperStatus} onChange={(e) => setBeniForm({ ...beniForm, hamperStatus: e.target.value as NonNullable<BeniProgramOpsData['hamperStatus']> })}>
                      {HAMPER_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </NfiField>
                  <NfiField label="Hamper sent date"><DateInput value={beniForm.hamperSentDate} onChange={(value) => setBeniForm({ ...beniForm, hamperSentDate: value })} /></NfiField>
                  <NfiField label="Hamper delivered date"><DateInput value={beniForm.hamperDeliveryDate} onChange={(value) => setBeniForm({ ...beniForm, hamperDeliveryDate: value })} /></NfiField>
                </div>
                <NfiField label="Dispatch notes">
                  <textarea className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" rows={2} value={beniForm.hamperDispatchNotes} onChange={(e) => setBeniForm({ ...beniForm, hamperDispatchNotes: e.target.value })} placeholder="Courier / delivery / handover notes" />
                </NfiField>
              </OpsSection>

              <NfiField label="Program ops notes">
                <textarea className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" rows={3} value={beniForm.notes} onChange={(e) => setBeniForm({ ...beniForm, notes: e.target.value })} placeholder="Add case-level BENI coordination notes" />
              </NfiField>

              <div className="flex gap-3">
                <NfiButton onClick={handleSaveBeniOps} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</NfiButton>
                {isEditingBeni && <NfiButton variant="secondary" onClick={() => { setIsEditingBeni(false); setBeniForm(buildBeniFormState(beniOps)); }}>Cancel</NfiButton>}
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-[var(--nfi-border)] p-4">
              <OpsSection title="Volunteer Lead / Assignment" icon={<UserRound size={16} className="text-blue-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="Volunteer Lead" value={getVolunteerDisplayName(volunteers, beniOps.volunteerLead, beniOps.volunteerLeadName) || 'Not assigned'} />
                  <InfoItem label="Assigned Volunteer" value={getVolunteerDisplayName(volunteers, beniOps.assignedVolunteer, beniOps.assignedVolunteerName) || 'Not assigned'} />
                  <InfoItem label="Case Allotted To" value={getVolunteerDisplayName(volunteers, beniOps.caseAllottedTo, beniOps.caseAllottedToName) || 'Not assigned'} />
                  <InfoItem label="BENI team member allotted" value={getVolunteerDisplayName(volunteers, beniOps.beniTeamMember, beniOps.beniTeamMemberName) || 'Not assigned'} />
                </div>
              </OpsSection>

              <OpsSection title="Pre-discharge Coordination" icon={<PhoneCall size={16} className="text-amber-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="SPOC contacted" value={formatBooleanStatus(beniOps.spocContacted)} />
                  <InfoItem label="Pre-discharge call completed" value={formatBooleanStatus(beniOps.preDischargeCallCompleted)} />
                  <InfoItem label="Parent contacted before discharge" value={formatBooleanStatus(beniOps.parentContactedBeforeDischarge)} />
                  <InfoItem label="SPOC contacted before discharge" value={formatBooleanStatus(beniOps.spocContactedBeforeDischarge)} />
                  <InfoItem label="Planned discharge date discussed" value={formatBooleanStatus(beniOps.plannedDischargeDateDiscussed)} />
                  <InfoItem label="Pre-discharge contact date" value={formatOptionalDate(beniOps.preDischargeContactDate)} />
                  <InfoItem label="Voice note / WhatsApp certificate received at discharge date" value={formatOptionalDate(beniOps.voiceNoteReceivedAt)} />
                </div>
              </OpsSection>

              <OpsSection title="Post-discharge Confirmation" icon={<Home size={16} className="text-green-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="Home reached confirmed" value={formatBooleanStatus(beniOps.homeReachedConfirmed)} />
                  <InfoItem label="Post-discharge contact done" value={formatBooleanStatus(beniOps.postDischargeContactDone)} />
                  <InfoItem label="Family reached at home" value={formatBooleanStatus(beniOps.familyReachedAtHome)} />
                  <InfoItem label="Contact date" value={formatOptionalDate(beniOps.postDischargeContactDate)} />
                </div>
              </OpsSection>

              <OpsSection title="Hamper Tracking" icon={<Package size={16} className="text-purple-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="Hamper dispatch status" value={getHamperStatusLabel(beniOps)} />
                  <InfoItem label="Hamper sent date" value={formatOptionalDate(beniOps.hamperSentDate)} />
                  <InfoItem label="Hamper delivered date" value={formatOptionalDate(beniOps.hamperDeliveryDate)} />
                  <InfoItem label="Dispatch notes" value={beniOps.hamperDispatchNotes || 'No notes'} />
                </div>
              </OpsSection>

              {beniOps.notes && <div><p className="text-sm text-[var(--nfi-text-secondary)]">Program ops notes</p><p className="text-[var(--nfi-text)] mt-1">{beniOps.notes}</p></div>}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Milestone Follow-up</h3>
          <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">Milestones remain separate from case-level operations and each card opens its own questionnaire.</p>
        </div>
        {milestones.length === 0 ? (
          <div className="text-center py-8 border border-[var(--nfi-border)] rounded-lg">
            {anchorDate ? (
              <div>
                <p className="text-[var(--nfi-text-secondary)] mb-4">Milestones have not been initialized yet.</p>
                <NfiButton onClick={handleInitializeMilestones}>
                  <Play size={16} className="mr-2" />
                  Initialize Milestones
                </NfiButton>
              </div>
            ) : (
              <p className="text-[var(--nfi-text-secondary)]">No milestones initialized. Please set admission or discharge date in the Overview tab first.</p>
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
                    <NfiBadge tone={tone}>{isCompleted ? 'Completed' : milestone.status === 'Due' ? 'Due' : 'Upcoming'}</NfiBadge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[var(--nfi-text-secondary)]">
                      <Calendar size={14} />
                      Due: {milestone.dueDate ? formatDateDMY(milestone.dueDate) : 'Not set'}
                    </div>
                    <div className="text-[var(--nfi-text-secondary)]">Follow-up date: {milestone.followupDate ? formatDateDMY(milestone.followupDate) : 'Not recorded'}</div>
                    <div className="text-[var(--nfi-text-secondary)]">Questions: {questionnaire.questions.length}</div>
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-[var(--nfi-text-secondary)]">{questionnaire.questions[0]?.label}</div>
                  <div className="mt-4">
                    <NfiButton size="sm" variant="secondary" onClick={() => { setSelectedMilestone(milestone); setShowQuestionnaire(true); }}>
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

function VolunteerSelect({ label, value, volunteers, placeholder, onChange, includeRoleSuffix = false }: { label: string; value: string; volunteers: User[]; placeholder: string; onChange: (value: string) => void; includeRoleSuffix?: boolean; }) {
  return (
    <NfiField label={label}>
      <select className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {volunteers.map((volunteer) => <option key={volunteer.userId} value={volunteer.userId}>{includeRoleSuffix ? `${volunteer.fullName} (BENI Volunteer)` : volunteer.fullName}</option>)}
      </select>
    </NfiField>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="date" className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function OpsSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <div className="rounded-lg border border-[var(--nfi-border)] bg-slate-50/70 p-4"><div className="flex items-center gap-2 mb-3 text-[var(--nfi-text)]">{icon}<h4 className="font-semibold">{title}</h4></div><div className="space-y-3">{children}</div></div>;
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void; }) {
  return <label className="flex items-center gap-3 rounded-lg border border-[var(--nfi-border)] bg-white px-3 py-2 text-sm text-[var(--nfi-text)]"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-[var(--nfi-text-secondary)]">{label}</p><p className="font-medium text-[var(--nfi-text)] mt-1">{value}</p></div>;
}

function buildBeniFormState(ops: BeniProgramOpsData | null): BeniFormState {
  if (!ops) return { ...EMPTY_BENI_FORM };
  return {
    beniTeamMember: ops.beniTeamMember || '',
    volunteerLead: ops.volunteerLead || '',
    assignedVolunteer: ops.assignedVolunteer || '',
    caseAllottedTo: ops.caseAllottedTo || '',
    spocContacted: !!ops.spocContacted,
    preDischargeCallCompleted: !!ops.preDischargeCallCompleted,
    parentContactedBeforeDischarge: !!ops.parentContactedBeforeDischarge,
    spocContactedBeforeDischarge: !!ops.spocContactedBeforeDischarge,
    plannedDischargeDateDiscussed: !!ops.plannedDischargeDateDiscussed,
    preDischargeContactDate: ops.preDischargeContactDate || '',
    homeReachedConfirmed: !!ops.homeReachedConfirmed,
    postDischargeContactDone: !!ops.postDischargeContactDone,
    familyReachedAtHome: !!ops.familyReachedAtHome,
    postDischargeContactDate: ops.postDischargeContactDate || '',
    hamperSentDate: ops.hamperSentDate || '',
    hamperStatus: ops.hamperStatus || 'Not Started',
    hamperDeliveryDate: ops.hamperDeliveryDate || '',
    hamperDispatchNotes: ops.hamperDispatchNotes || '',
    voiceNoteReceivedAt: ops.voiceNoteReceivedAt ? ops.voiceNoteReceivedAt.split('T')[0] : '',
    notes: ops.notes || '',
  };
}

function formatBooleanStatus(value?: boolean): string {
  if (value === true) return 'Completed';
  if (value === false) return 'Pending';
  return 'Not recorded';
}

function formatOptionalDate(value?: string): string {
  return value ? formatDateDMY(value) : 'Not recorded';
}

function getVolunteerDisplayName(volunteers: User[], userId?: string, fallback?: string): string | undefined {
  return volunteers.find((volunteer) => volunteer.userId === userId)?.fullName || fallback;
}

function getHamperStatusLabel(ops?: BeniProgramOpsData | null): string {
  if (!ops) return 'Not started';
  return ops.hamperStatus || (ops.hamperSentDate ? 'Sent' : 'Not started');
}

function getDischargeContactStatus(ops?: BeniProgramOpsData | null): string {
  if (!ops) return 'Operational follow-up markers pending';
  if (ops.homeReachedConfirmed && ops.postDischargeContactDone) return 'Home reached and post-discharge contact confirmed';
  if (ops.preDischargeCallCompleted || ops.parentContactedBeforeDischarge || ops.spocContactedBeforeDischarge) return 'Pre-discharge coordination recorded';
  return 'Operational follow-up markers pending';
}

function buildVolunteerOpsSummary(form: BeniFormState, volunteers: User[]): string {
  return [
    form.volunteerLead ? `Lead: ${getVolunteerDisplayName(volunteers, form.volunteerLead) || form.volunteerLead}` : null,
    form.caseAllottedTo ? `Owner: ${getVolunteerDisplayName(volunteers, form.caseAllottedTo) || form.caseAllottedTo}` : null,
    form.assignedVolunteer ? `Assigned: ${getVolunteerDisplayName(volunteers, form.assignedVolunteer) || form.assignedVolunteer}` : null,
    `Hamper: ${form.hamperStatus}${form.hamperSentDate ? ` on ${formatDateDMY(form.hamperSentDate)}` : ''}`,
    form.homeReachedConfirmed ? 'Home reached confirmed' : null,
    form.postDischargeContactDone ? 'Post-discharge contact done' : null,
  ].filter(Boolean).join(' | ');
}
