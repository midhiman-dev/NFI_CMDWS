import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, Edit2, FileText, Play } from 'lucide-react';
import { NfiBadge } from './design-system/NfiBadge';
import { NfiButton } from './design-system/NfiButton';
import { NfiField } from './design-system/NfiField';
import { useToast } from './design-system/Toast';
import { CompactMilestoneModal } from './CompactMilestoneModal';
import { getAuthState } from '../utils/auth';
import { useAppContext } from '../App';
import { formatDateDMY } from '../utils/dateFormat';
import type { Case, User, ClinicalCaseDetails, FollowupMilestone } from '../types';
import type { BeniProgramOpsData } from '../data/providers/DataProvider';

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

      const [beniOpsData, milestonesData, volunteersData, clinicalData] = await Promise.all([
        provider.getBeniProgramOps(caseId),
        provider.listFollowupMilestones(caseId),
        provider.listVolunteers(),
        provider.getClinicalDetails(caseId),
      ]);

      setBeniOps(beniOpsData);
      setMilestones(milestonesData);
      setVolunteers(volunteersData);
      setClinicalDetails(clinicalData);

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
          setMilestones(newMilestones);
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
      setMilestones(newMilestones);
      showToast('Milestones initialized successfully', 'success');
    } catch (err) {
      console.error('Error initializing milestones:', err);
      showToast('Failed to initialize milestones', 'error');
    }
  };

  const handleOpenQuestionnaire = (milestone: any) => {
    setSelectedMilestone(milestone);
    setShowQuestionnaire(true);
  };

  const completedMilestones = milestones.filter(m => m.status === 'Completed' || m.followupDate).length;
  const nextDueMilestone = milestones.find(m => m.status !== 'Completed' && !m.followupDate && m.dueDate);
  const anchorDate = clinicalDetails?.dischargeDate || clinicalDetails?.admissionDate;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3 flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          Follow-up Progress
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
                {nextDueMilestone.milestoneMonths} Months
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">BENI Program Operations</h3>
          {beniOps && !isEditingBeni && (
            <NfiButton size="sm" onClick={() => setIsEditingBeni(true)}>
              <Edit2 size={16} className="mr-1" />
              Edit
            </NfiButton>
          )}
        </div>

        {!beniOps || isEditingBeni ? (
          <div className="space-y-4 p-4 border border-[var(--nfi-border)] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NfiField label="BENI Team Member">
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

              <NfiField label="Hamper Sent Date">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={beniForm.hamperSentDate}
                  onChange={(e) => setBeniForm({ ...beniForm, hamperSentDate: e.target.value })}
                />
              </NfiField>

              <NfiField label="Voice Note Received">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={beniForm.voiceNoteReceivedAt}
                  onChange={(e) => setBeniForm({ ...beniForm, voiceNoteReceivedAt: e.target.value })}
                />
              </NfiField>
            </div>

            <NfiField label="Notes">
              <textarea
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                rows={3}
                value={beniForm.notes}
                onChange={(e) => setBeniForm({ ...beniForm, notes: e.target.value })}
                placeholder="Add notes about BENI program activities..."
              />
            </NfiField>

            <div className="flex gap-3">
              <NfiButton onClick={handleSaveBeniOps} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </NfiButton>
              {isEditingBeni && (
                <NfiButton variant="secondary" onClick={() => {
                  setIsEditingBeni(false);
                  loadData();
                }}>
                  Cancel
                </NfiButton>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 border border-[var(--nfi-border)] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--nfi-text-secondary)]">Team Member</p>
                <p className="font-medium text-[var(--nfi-text)]">{beniOps.beniTeamMemberName || 'Not assigned'}</p>
              </div>
              {beniOps.hamperSentDate && (
                <div>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Hamper Sent</p>
                  <p className="font-medium text-[var(--nfi-text)]">
                    {formatDateDMY(beniOps.hamperSentDate)}
                  </p>
                </div>
              )}
              {beniOps.voiceNoteReceivedAt && (
                <div>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Voice Note Received</p>
                  <p className="font-medium text-[var(--nfi-text)]">
                    {formatDateDMY(beniOps.voiceNoteReceivedAt)}
                  </p>
                </div>
              )}
              {beniOps.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Notes</p>
                  <p className="text-[var(--nfi-text)]">{beniOps.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-4">Follow-up Milestones</h3>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Milestone</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Due Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Follow-up Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Action</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone) => {
                  const isCompleted = milestone.status === 'Completed' || !!milestone.followupDate;
                  return (
                    <tr key={milestone.milestoneId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-[var(--nfi-text)]">{milestone.milestoneMonths} Months</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)]">
                          <Calendar size={14} />
                          {milestone.dueDate ? formatDateDMY(milestone.dueDate) : 'Not set'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {milestone.followupDate ? (
                          <span className="text-sm text-[var(--nfi-text)]">
                            {formatDateDMY(milestone.followupDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--nfi-text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isCompleted ? (
                          <NfiBadge tone="success">
                            <CheckCircle size={14} className="mr-1" />
                            Completed
                          </NfiBadge>
                        ) : milestone.status === 'Due' ? (
                          <NfiBadge tone="warning">
                            <Clock size={14} className="mr-1" />
                            Due
                          </NfiBadge>
                        ) : (
                          <NfiBadge tone="neutral">
                            <Clock size={14} className="mr-1" />
                            Upcoming
                          </NfiBadge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <NfiButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenQuestionnaire(milestone)}
                        >
                          <FileText size={14} className="mr-1" />
                          Update
                        </NfiButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showQuestionnaire && selectedMilestone && (
        <CompactMilestoneModal
          caseId={caseId}
          milestone={selectedMilestone}
          title={`${selectedMilestone.milestoneMonths} Month Monitoring`}
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
