import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { CaseDetailNav } from '../components/case-tabs/CaseDetailNav';
import type { NavGroup } from '../components/case-tabs/CaseDetailNav';
import { NfiButton } from '../components/design-system/NfiButton';
import { NfiField } from '../components/design-system/NfiField';
import { CompactMilestoneModal } from '../components/CompactMilestoneModal';
import { MonitoringTab } from '../components/MonitoringTab';
import { BeneficiaryTab } from '../components/case-tabs/BeneficiaryTab';
import { FamilyTab } from '../components/case-tabs/FamilyTab';
import { ClinicalTab } from '../components/case-tabs/ClinicalTab';
import { FinancialTab } from '../components/case-tabs/FinancialTab';
import { IntakeFormsTab } from '../components/case-tabs/IntakeFormsTab';
import { DoctorReviewTab } from '../components/case-tabs/DoctorReviewTab';
import { SettlementTab } from '../components/case-tabs/SettlementTab';
import { WorkflowExtensionsTab } from '../components/case-tabs/WorkflowExtensionsTab';
import { caseService } from '../services/caseService';
import { Case, ChildProfile, FamilyProfile, ClinicalCaseDetails, FinancialCaseDetails, DocumentMetadata, AuditEvent, FundingInstallment, InstallmentStatus, FollowupMilestone, DocVersion, UserRole, IntakeFundApplication, PanelAssignmentType, PanelReviewDecision, WorkflowExtensions, WorkflowPanelReview } from '../types';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, Upload, Edit2, Save, X, AlertCircle, Eye, Zap, Baby, Users, Stethoscope, IndianRupee, ChevronDown, Paperclip } from 'lucide-react';
import { getAuthState } from '../utils/auth';
import { getDefaultRouteForAuth } from '../utils/roleAccess';
import { getLatestVersion, getVisibleCategories } from '../utils/docVersioning';
import { getDoctorReviewGatingInfo } from '../utils/submitGating';
import { PRIMARY_FINANCE_PROOF_DOC_TYPES, getChecklistReadinessFromDocuments, getHospitalFacingFolderLabel } from '../utils/documentChecklistRules';
import { useToast } from '../components/design-system/Toast';
import { useAppContext } from '../App';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { CASE_SUBTITLE_SEPARATOR } from '../constants/ui';
import { normalizeSeparator } from '../utils/textNormalize';
import { type CaseWorkflowEvent, getHospitalDisplayStatus, getLatestRejectedEvent, getLatestReturnedEvent, listCaseWorkflowEvents } from '../utils/caseWorkflow';
import { formatDateDMY, formatDateTimeFriendly } from '../utils/dateFormat';
import { FUNDING_CAMPAIGN_OPTIONS, FUNDING_PROGRAM_OPTIONS, toCurrency } from '../utils/fundingConfig';
import type { CaseWithDetails, DocumentWithTemplate } from '../data/providers/DataProvider';
import { translateCaseStatus, translateLiteral } from '../i18n/helpers';
import { formatBabyDisplayName } from '../utils/casePresentation';
import { shouldShowBeneficiaryNo } from '../utils/caseIdentifiers';
import { getFollowupQuestionnaire, sortMilestonesBySourceOrder } from '../utils/followupQuestionnaires';
import { getAuditActorDisplayName, getAuditEvents, getFollowupAuditLabel, getRoleLabel, logAuditEvent } from '../utils/auditTrail';
import { buildPanelAssignmentsPayload, buildPanelAssignmentState, getReviewerAssignmentSummary, PANEL_ASSIGNMENT_META, PANEL_ASSIGNMENT_ORDER, remapCommitteeLabel } from '../utils/panelAssignments';
import { IncomeEligibilityPanel } from '../components/case-tabs/IncomeEligibilityPanel';
import { FinancialArtifactReadinessCard, FinancialReviewArtifactCard, SponsorIntelligenceCard, VarianceGovernanceCard } from '../components/case-tabs/FinancialReviewArtifact';
import { evaluateIncomeThreshold } from '../utils/incomeEligibility';
import { getFinancialReviewContext } from '../utils/financialReview';
import { buildPanelSummary, getOverallDecisionTone, getOverallPanelDecision, getPanelDecisionOptions, getPanelStatus, isPanelComplete } from '../utils/panelReview';
import { buildVarianceGovernanceSnapshot } from '../utils/varianceGovernance';

const HIDE_LEGACY_CASE_DATA_TABS = true;
const HIDDEN_TABS = ['beneficiary', 'family', 'clinical', 'financial'];
const SHOW_DEMO_SIM_BUTTONS = false;

type CaseTabId =
  | 'overview'
  | 'intake'
  | 'documents'
  | 'doctor-review'
  | 'verification'
  | 'approval'
  | 'workflow-extensions'
  | 'settlement'
  | 'installments'
  | 'monitoring'
  | 'followups'
  | 'audit';

function getVisibleCaseTabIds(role: UserRole | null, showPostApproval: boolean): CaseTabId[] {
  const roleMap: Record<UserRole, CaseTabId[]> = {
    hospital_spoc: ['overview', 'intake', 'documents', 'audit'],
    clinical: ['overview', 'documents', 'doctor-review', 'audit'],
    clinical_reviewer: ['overview', 'documents', 'doctor-review', 'audit'],
    hospital_doctor: ['overview', 'documents', 'doctor-review', 'audit'],
    verifier: ['overview', 'intake', 'documents', 'doctor-review', 'verification', 'approval', 'workflow-extensions', 'audit'],
    committee_member: ['overview', 'documents', 'approval', 'audit'],
    accounts: ['overview', 'approval', 'audit'],
    beni_volunteer: ['overview', 'monitoring', 'followups', 'audit'],
    leadership: ['overview', 'audit'],
    admin: ['overview', 'intake', 'documents', 'doctor-review', 'verification', 'approval', 'workflow-extensions', 'settlement', 'monitoring', 'followups', 'audit'],
  };

  const base = role ? roleMap[role] || roleMap.admin : roleMap.admin;
  if (showPostApproval) {
    return base;
  }
  return base.filter((tabId) => !['settlement', 'installments', 'monitoring', 'followups'].includes(tabId));
}

export function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider } = useAppContext();
  const authState = getAuthState();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [caseData, setCaseData] = useState<CaseWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [clinicalDetails, setClinicalDetails] = useState<ClinicalCaseDetails | null>(null);
  const [financialDetails, setFinancialDetails] = useState<FinancialCaseDetails | null>(null);
  const [documents, setDocuments] = useState<DocumentWithTemplate[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<CaseWorkflowEvent[]>([]);
  const [displayStatus, setDisplayStatus] = useState<Case['caseStatus']>('Draft');
  const [latestReturnEvent, setLatestReturnEvent] = useState<CaseWorkflowEvent | null>(null);
  const [latestRejectedEvent, setLatestRejectedEvent] = useState<CaseWorkflowEvent | null>(null);
  const [docsVersion, setDocsVersion] = useState(0);
  const showPostApproval = caseData?.caseStatus === 'Approved' || caseData?.caseStatus === 'Closed';
  const visibleTabIds = useMemo(
    () => getVisibleCaseTabIds(authState.activeRole, showPostApproval),
    [authState.activeRole, showPostApproval]
  );

  const bumpDocs = () => setDocsVersion(v => v + 1);

  useEffect(() => {
    const loadCaseData = async () => {
      if (caseId) {
        try {
          setIsLoading(true);
          setAccessDenied(false);
          const caseInfo = await provider.getCaseById(caseId);
          if (!caseInfo) {
            setCaseData(null);
            return;
          }
          setCaseData(caseInfo);

          const wfEvents = listCaseWorkflowEvents(caseId);
          const resolvedStatus = authState.activeRole === 'hospital_spoc'
            ? getHospitalDisplayStatus(caseInfo.caseStatus, wfEvents)
            : caseInfo.caseStatus;
          setDisplayStatus(resolvedStatus);
          setWorkflowEvents(wfEvents);
          setLatestReturnEvent(getLatestReturnedEvent(wfEvents));
          setLatestRejectedEvent(getLatestRejectedEvent(wfEvents));

          const [docs, events, clinical] = await Promise.all([
            provider.listCaseDocuments(caseId).catch(() => [] as DocumentWithTemplate[]),
            getAuditEvents(caseId).catch(() => [] as AuditEvent[]),
            provider.getClinicalDetails(caseId).catch(() => null),
          ]);

          setDocuments(docs);
          setAuditEvents(events);
          setClinicalDetails(clinical);
        } catch (error) {
          if (error instanceof Error && error.message === 'ACCESS_DENIED_CASE_SCOPE') {
            setAccessDenied(true);
          }
          setCaseData(null);
          console.error('Error loading case data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadCaseData();
  }, [caseId, provider, docsVersion]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (HIDE_LEGACY_CASE_DATA_TABS && HIDDEN_TABS.includes(tabParam)) {
        setActiveTab('intake');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (visibleTabIds.length === 0) return;
    if (!visibleTabIds.includes(activeTab as CaseTabId)) {
      setActiveTab(visibleTabIds[0]);
    }
  }, [activeTab, visibleTabIds]);

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-[var(--nfi-text-secondary)]">{t('case.loading', { defaultValue: 'Loading case...' })}</p>
        </div>
      </Layout>
    );
  }

  if (accessDenied) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <NfiCard>
            <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-2">{t('common.accessDenied')}</h2>
            <p className="text-[var(--nfi-text-secondary)] mb-4">{t('case.noAccess', { defaultValue: 'You do not have access to this case.' })}</p>
            <NfiButton onClick={() => navigate(getDefaultRouteForAuth(authState))}>{t('common.goHome')}</NfiButton>
          </NfiCard>
        </div>
      </Layout>
    );
  }

  if (!caseData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-[var(--nfi-text-secondary)]">{t('case.notFound', { defaultValue: 'Case not found' })}</p>
        </div>
      </Layout>
    );
  }

  const hospitalName = caseData.hospitalName || 'Unknown Hospital';
  const isHospitalRejectedView = authState.activeRole === 'hospital_spoc' && displayStatus === 'Rejected';
  const isHospitalReturnedView = authState.activeRole === 'hospital_spoc' && displayStatus === 'Returned';
  const caseDisplayName = formatBabyDisplayName(familyProfile?.motherName, childProfile?.beneficiaryName || caseData.childName);
  const showBeneficiaryNo = shouldShowBeneficiaryNo(authState.activeRole, caseData.caseStatus);

  const caseDataTabs = [
    { id: 'overview', label: translateLiteral('Overview'), icon: <FileText size={16} /> },
    { id: 'intake', label: t('case.intakeForms', { defaultValue: 'Intake Forms' }), icon: <FileText size={16} /> },
    ...(HIDE_LEGACY_CASE_DATA_TABS ? [] : [
      { id: 'beneficiary', label: 'Beneficiary', icon: <Baby size={16} /> },
      { id: 'family', label: 'Family', icon: <Users size={16} /> },
      { id: 'clinical', label: 'Clinical', icon: <Stethoscope size={16} /> },
      { id: 'financial', label: 'Financial', icon: <IndianRupee size={16} /> },
    ]),
  ];

  const navGroups: NavGroup[] = [
    {
      heading: t('case.dataHeading', { defaultValue: 'Case Data' }),
      tabs: caseDataTabs,
    },
    {
      heading: t('case.workflowHeading', { defaultValue: 'Workflow' }),
      tabs: [
        { id: 'documents', label: translateLiteral('Documents'), icon: <Upload size={16} />, count: documents.length },
        { id: 'doctor-review', label: t('case.clinicalReview', { defaultValue: 'Clinical Review' }), icon: <Stethoscope size={16} /> },
        { id: 'verification', label: translateLiteral('Verification'), icon: <CheckCircle size={16} /> },
        { id: 'approval', label: 'Panel Decision', icon: <CheckCircle size={16} /> },
        { id: 'workflow-extensions', label: t('case.workflowExtensions', { defaultValue: 'Workflow Extensions' }), icon: <CheckCircle size={16} /> },
        ...(showPostApproval ? [
          { id: 'settlement', label: t('case.settlementClosure', { defaultValue: 'Settlement & Closure' }), icon: <CheckCircle size={16} /> },
          { id: 'installments', label: translateLiteral('Installments'), icon: <Clock size={16} /> },
          { id: 'monitoring', label: translateLiteral('Monitoring'), icon: <Clock size={16} /> },
          { id: 'followups', label: translateLiteral('Follow-ups'), icon: <Clock size={16} /> },
        ] : []),
        { id: 'audit', label: translateLiteral('Audit'), icon: <FileText size={16} />, count: auditEvents.length },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => visibleTabIds.includes(tab.id as CaseTabId)),
    }))
    .filter((group) => group.tabs.length > 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/cases')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{caseData.caseRef}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              {normalizeSeparator(`${caseDisplayName}${CASE_SUBTITLE_SEPARATOR}${hospitalName}`)}
            </p>
            {showBeneficiaryNo && caseData.beneficiaryNo && (
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
                Beneficiary No: {caseData.beneficiaryNo}
              </p>
            )}
          </div>
          <NfiBadge
            tone={
              displayStatus === 'Approved' || displayStatus === 'Closed'
                ? 'success'
                : displayStatus === 'Rejected'
                ? 'error'
                : displayStatus === 'Draft'
                ? 'neutral'
                : 'warning'
            }
          >
            {t(`case.status.${displayStatus}`)}
          </NfiBadge>
        </div>

        {isHospitalReturnedView && (
          <NfiCard className="bg-amber-50 border border-amber-200">
            <h2 className="text-base font-semibold text-amber-900 mb-1">{t('case.returnedBanner', { defaultValue: 'This case was returned for updates' })}</h2>
            {latestReturnEvent?.reason && (
              <p className="text-sm text-amber-900 mb-2"><span className="font-medium">{t('common.reason')}:</span> {latestReturnEvent.reason}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-amber-800">
              <p><span className="font-medium">{t('common.returnedBy')}:</span> {latestReturnEvent?.changedBy || 'N/A'}</p>
              <p><span className="font-medium">{t('common.when')}:</span> {formatDateTimeFriendly(latestReturnEvent?.changedAt)}</p>
              <p><span className="font-medium">{t('common.stage')}:</span> {latestReturnEvent?.source || 'Verification'}</p>
            </div>
          </NfiCard>
        )}

        {isHospitalRejectedView && (
          <NfiCard className="bg-red-50 border border-red-200">
            <h2 className="text-base font-semibold text-red-900 mb-1">{t('case.rejectedBanner', { defaultValue: 'This case was rejected' })}</h2>
            {latestRejectedEvent?.reason && (
              <p className="text-sm text-red-900 mb-2"><span className="font-medium">{t('common.reason')}:</span> {latestRejectedEvent.reason}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-red-800">
              <p><span className="font-medium">{t('common.rejectedBy')}:</span> {latestRejectedEvent?.changedBy || 'N/A'}</p>
              <p><span className="font-medium">{t('common.when')}:</span> {formatDateTimeFriendly(latestRejectedEvent?.changedAt)}</p>
              <p><span className="font-medium">{t('common.stage')}:</span> {remapCommitteeLabel(latestRejectedEvent?.source, 'Panel')}</p>
            </div>
            <p className="text-xs text-red-700 mt-2">{t('case.rejectedReadonly', { defaultValue: 'Rejected cases are read-only for hospital users in the current workflow.' })}</p>
          </NfiCard>
        )}

        <div className="lg:hidden mb-2">
          <CaseDetailNav groups={navGroups} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="flex" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
            <CaseDetailNav groups={navGroups} activeTab={activeTab} onChange={setActiveTab} />

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <OverviewTab
                  caseData={caseData}
                  childProfile={childProfile}
                  familyProfile={familyProfile}
                  clinicalDetails={clinicalDetails}
                  financialDetails={financialDetails}
                  onUpdate={bumpDocs}
                />
              )}
              {activeTab === 'intake' && <IntakeFormsTab caseId={caseId!} />}
              {activeTab === 'beneficiary' && <BeneficiaryTab caseId={caseId!} />}
              {activeTab === 'family' && <FamilyTab caseId={caseId!} />}
              {activeTab === 'clinical' && <ClinicalTab caseId={caseId!} onDatesChanged={bumpDocs} />}
              {activeTab === 'financial' && <FinancialTab caseId={caseId!} />}
              {activeTab === 'documents' && (
                <DocumentsTab
                  documents={documents}
                  caseId={caseId!}
                  onDocumentsChanged={bumpDocs}
                  caseStatus={displayStatus}
                />
              )}
              {activeTab === 'doctor-review' && (
                <DoctorReviewTab
                  caseId={caseId!}
                  currentUser={authState.activeUser}
                />
              )}
              {activeTab === 'verification' && (
                <VerificationTab
                  caseId={caseId!}
                  caseData={caseData}
                  documents={documents}
                  onUpdate={bumpDocs}
                />
              )}
              {activeTab === 'approval' && <ApprovalTab caseId={caseId!} />}
              {activeTab === 'workflow-extensions' && (
                <WorkflowExtensionsTab
                  caseId={caseId!}
                  caseData={caseData}
                  currentUser={authState.activeUser}
                  onUpdate={bumpDocs}
                />
              )}
              {activeTab === 'settlement' && <SettlementTab caseId={caseId!} caseData={caseData} onStatusChange={() => {}} />}
              {activeTab === 'installments' && <InstallmentsTab caseId={caseId!} caseData={caseData} onUpdate={() => {}} />}
              {activeTab === 'monitoring' && <MonitoringTab caseId={caseId!} />}
              {activeTab === 'followups' && <FollowupsTab caseId={caseId!} />}
              {activeTab === 'audit' && <AuditTab events={auditEvents} workflowEvents={workflowEvents} />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function OverviewTab({
  caseData,
  childProfile,
  familyProfile,
  clinicalDetails,
  financialDetails,
  onUpdate,
}: {
  caseData: CaseWithDetails;
  childProfile: ChildProfile | null;
  familyProfile: FamilyProfile | null;
  clinicalDetails: ClinicalCaseDetails | null;
  financialDetails: FinancialCaseDetails | null;
  onUpdate: () => void;
}) {
  const authState = getAuthState();
  const showBeneficiaryNo = shouldShowBeneficiaryNo(authState.activeRole, caseData.caseStatus);
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [fundApplication, setFundApplication] = useState<IntakeFundApplication | undefined>();
  const [approvalContext, setApprovalContext] = useState<{
    spocName?: string;
    spocPhone?: string;
    proposedSponsorAmount?: number;
    program?: string;
    campaignName?: string;
    isTopUp?: boolean;
    previousApprovedAmount?: number;
    topUpAmount?: number;
    totalApprovedAmount?: number;
  } | null>(null);
  const [editData, setEditData] = useState({
    beneficiaryName: caseData.childName || '',
    beneficiaryNo: caseData.beneficiaryNo || '',
    gender: 'Male',
    dob: '',
    motherName: '',
    fatherName: '',
    phone: '',
    address: '',
    city: '',
    diagnosis: '',
    summary: '',
    estimateAmount: '',
  });

  const canEdit = false;

  useEffect(() => {
    let cancelled = false;

    const loadIntake = async () => {
      try {
        const intake = await provider.getIntakeData(caseData.caseId);
        if (!cancelled) {
          setFundApplication(intake.fundApplication);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load income summary:', error);
        }
      }
    };

    loadIntake();
    return () => { cancelled = true; };
  }, [caseData.caseId, provider]);

  useEffect(() => {
    if (authState.activeRole !== 'beni_volunteer') return;
    let cancelled = false;

    const loadApprovalContext = async () => {
      try {
        const [workflowExt, hospitals] = await Promise.all([
          provider.getWorkflowExt(caseData.caseId).catch(() => null),
          provider.getHospitals().catch(() => []),
        ]);
        if (cancelled) return;
        const hospital = hospitals.find((h) => h.hospitalId === caseData.hospitalId);
        setApprovalContext({
          spocName: hospital?.spocName,
          spocPhone: hospital?.spocPhone,
          proposedSponsorAmount: workflowExt?.funding?.sponsorQuantification?.proposedAmount,
          program: workflowExt?.funding?.program,
          campaignName: workflowExt?.funding?.campaign?.campaignName,
          isTopUp: workflowExt?.funding?.isTopUp,
          previousApprovedAmount: workflowExt?.funding?.previousApprovedAmount,
          topUpAmount: workflowExt?.funding?.topUpAmount,
          totalApprovedAmount: workflowExt?.funding?.totalApprovedAmount,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load approval context:', error);
        }
      }
    };

    loadApprovalContext();
    return () => { cancelled = true; };
  }, [authState.activeRole, caseData.caseId, caseData.hospitalId, provider]);

  const incomeEvaluation = useMemo(
    () => evaluateIncomeThreshold(fundApplication?.occupationIncomeSection),
    [fundApplication]
  );

  const handleSave = () => {

    showToast('Case updated successfully', 'success');
    setIsEditing(false);
    onUpdate();
  };

  const handleCancel = () => {
    setEditData({
      beneficiaryName: childProfile?.beneficiaryName || '',
      beneficiaryNo: childProfile?.beneficiaryNo || '',
      gender: childProfile?.gender || 'Male',
      dob: childProfile?.dob || '',
      motherName: familyProfile?.motherName || '',
      fatherName: familyProfile?.fatherName || '',
      phone: familyProfile?.phone || '',
      address: familyProfile?.address || '',
      city: familyProfile?.city || '',
      diagnosis: clinicalDetails?.diagnosis || '',
      summary: clinicalDetails?.summary || '',
      estimateAmount: financialDetails?.estimateAmount?.toString() || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Editing Case Details</h3>
          <div className="flex gap-2">
            <NfiButton variant="secondary" size="sm" onClick={handleCancel}>
              <X size={16} className="mr-2" />
              Cancel
            </NfiButton>
            <NfiButton size="sm" onClick={handleSave}>
              <Save size={16} className="mr-2" />
              Save Changes
            </NfiButton>
          </div>
        </div>

        <div>
          <h4 className="text-base font-semibold text-[var(--nfi-text)] mb-3">Child Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Baby Name" required>
              <input
                type="text"
                value={editData.beneficiaryName}
                onChange={(e) => setEditData({ ...editData, beneficiaryName: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>

            {showBeneficiaryNo && (
              <NfiField label="Beneficiary No">
                <input
                  type="text"
                  value={editData.beneficiaryNo}
                  readOnly
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)] text-[var(--nfi-text-secondary)] outline-none"
                />
              </NfiField>
            )}

            <NfiField label="Gender" required>
              <select
                value={editData.gender}
                onChange={(e) => setEditData({ ...editData, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </NfiField>

            <NfiField label="Date of Birth" required>
              <input
                type="date"
                value={editData.dob}
                onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>
          </div>
        </div>

        <div>
          <h4 className="text-base font-semibold text-[var(--nfi-text)] mb-3">Family Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Mother Name" required>
              <input
                type="text"
                value={editData.motherName}
                onChange={(e) => setEditData({ ...editData, motherName: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>

            <NfiField label="Father Name">
              <input
                type="text"
                value={editData.fatherName}
                onChange={(e) => setEditData({ ...editData, fatherName: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>

            <NfiField label="Phone" required>
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>

            <NfiField label="City">
              <input
                type="text"
                value={editData.city}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>

            <div className="md:col-span-2">
              <NfiField label="Address">
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-base font-semibold text-[var(--nfi-text)] mb-3">Clinical & Financial</h4>
          <div className="space-y-4">
            <NfiField label="Diagnosis" required>
              <input
                type="text"
                value={editData.diagnosis}
                onChange={(e) => setEditData({ ...editData, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>

            <NfiField label="Case Summary" required>
              <textarea
                value={editData.summary}
                onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none resize-none"
              />
            </NfiField>

            <NfiField label="Estimated Amount (₹)" required>
              <input
                type="number"
                value={editData.estimateAmount}
                onChange={(e) => setEditData({ ...editData, estimateAmount: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </NfiField>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Case Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem label="Case Reference" value={caseData.caseRef} />
          {showBeneficiaryNo && <InfoItem label="Beneficiary No" value={caseData.beneficiaryNo || 'Not assigned'} />}
          <InfoItem label="Baby Name" value={formatBabyDisplayName(familyProfile?.motherName, caseData.childName)} />
          <InfoItem label="Hospital" value={caseData.hospitalName} />
          {authState.activeRole !== 'hospital_spoc' && <InfoItem label="Process Type" value={caseData.processType} />}
          <InfoItem label="Status" value={caseData.caseStatus.replace('_', ' ')} />
          <InfoItem label="Intake Date" value={caseData.intakeDate ? new Date(caseData.intakeDate).toLocaleDateString() : undefined} />
          <InfoItem label="Last Updated" value={new Date(caseData.updatedAt).toLocaleDateString()} />
        </div>
      </div>

      <IncomeEligibilityPanel
        evaluation={incomeEvaluation}
        audience={getIncomeAudience(authState.activeRole)}
        title="Income eligibility outcome"
      />

      {authState.activeRole === 'beni_volunteer' && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Approval Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)]">
            <InfoItem label="Approval Status" value={caseData.caseStatus.replace('_', ' ')} />
            <InfoItem label="Approved Amount" value={toCurrency(caseData.approvedAmount)} />
            <InfoItem label="Approval Date" value={(caseData as any).decisionAt ? new Date((caseData as any).decisionAt).toLocaleDateString() : 'N/A'} />
            <InfoItem label="Proposed Sponsor Amount" value={toCurrency(approvalContext?.proposedSponsorAmount)} />
            <InfoItem label="Program" value={approvalContext?.program || 'N/A'} />
            <InfoItem label="Campaign" value={approvalContext?.campaignName || 'N/A'} />
            <InfoItem label="Top-up" value={approvalContext?.isTopUp ? 'Yes' : 'No'} />
            {approvalContext?.isTopUp && (
              <InfoItem label="Previous Approved Amount" value={toCurrency(approvalContext?.previousApprovedAmount)} />
            )}
            {approvalContext?.isTopUp && (
              <InfoItem label="Top-up Amount" value={toCurrency(approvalContext?.topUpAmount)} />
            )}
            {approvalContext?.isTopUp && (
              <InfoItem label="Total Approved Amount" value={toCurrency(approvalContext?.totalApprovedAmount)} />
            )}
            <InfoItem label="Hospital SPOC" value={approvalContext?.spocName || 'N/A'} />
            <InfoItem label="SPOC Contact" value={approvalContext?.spocPhone || 'N/A'} />
          </div>
        </div>
      )}

      <KeyDatesCard caseId={caseData.caseId} clinicalDetails={clinicalDetails} onUpdate={onUpdate} />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--nfi-text-secondary)] mb-1">{label}</p>
      <p className="text-base font-medium text-[var(--nfi-text)]">{value || 'N/A'}</p>
    </div>
  );
}

function KeyDatesCard({ caseId, clinicalDetails, onUpdate }: {
  caseId: string;
  clinicalDetails: ClinicalCaseDetails | null;
  onUpdate: () => void;
}) {
  const authState = getAuthState();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [admissionDate, setAdmissionDate] = useState(clinicalDetails?.admissionDate || '');
  const [dischargeDate, setDischargeDate] = useState(clinicalDetails?.dischargeDate || '');

  useEffect(() => {
    setAdmissionDate(clinicalDetails?.admissionDate || '');
    setDischargeDate(clinicalDetails?.dischargeDate || '');
  }, [clinicalDetails]);
  const canEditDates = authState.activeRole === 'hospital_spoc' || authState.activeRole === 'verifier' || authState.activeRole === 'admin';

  const handleSave = async () => {
    setSaving(true);
    try {
      await provider.updateClinicalDates(caseId, {
        admissionDate: admissionDate || undefined,
        dischargeDate: dischargeDate || undefined,
      });
      showToast('Key dates updated', 'success');
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error saving dates:', err);
      showToast('Failed to update dates', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Key Dates</h3>
        {!isEditing && canEditDates && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-sm text-[var(--nfi-primary)] hover:underline"
          >
            <Edit2 size={14} />
            Edit
          </button>
        )}
      </div>

      {isEditing && canEditDates ? (
        <div className="p-4 border border-[var(--nfi-border)] rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Admission Date">
              <input
                type="date"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
              />
            </NfiField>
            <NfiField label="Discharge Date">
              <input
                type="date"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
              />
            </NfiField>
          </div>
          <div className="flex gap-2">
            <NfiButton size="sm" onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </NfiButton>
            <NfiButton size="sm" variant="secondary" onClick={() => {
              setAdmissionDate(clinicalDetails?.admissionDate || '');
              setDischargeDate(clinicalDetails?.dischargeDate || '');
              setIsEditing(false);
            }}>
              <X size={16} className="mr-1" />
              Cancel
            </NfiButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem
            label="Admission Date"
            value={clinicalDetails?.admissionDate ? new Date(clinicalDetails.admissionDate).toLocaleDateString() : undefined}
          />
          <InfoItem
            label="Discharge Date"
            value={clinicalDetails?.dischargeDate ? new Date(clinicalDetails.dischargeDate).toLocaleDateString() : undefined}
          />
        </div>
      )}
    </div>
  );
}

export function DocumentsTab({
  documents,
  caseId,
  onDocumentsChanged,
  caseStatus,
}: {
  documents: DocumentWithTemplate[];
  caseId: string;
  onDocumentsChanged: () => void;
  caseStatus?: Case['caseStatus'];
}) {
  const authState = getAuthState();
  const { showToast } = useToast();
  const { provider, mode } = useAppContext();
  const { t } = useTranslation();
  const [allDocs, setAllDocs] = useState<DocumentWithTemplate[]>(documents);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const categories = getVisibleCategories(authState.activeRole);

  useEffect(() => {
    setAllDocs(documents);
  }, [documents]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || Number.isNaN(bytes)) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleFileUpload = async (docId: string, file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';

    if (!allowedTypes.includes(file.type) && (!extension || !allowedExtensions.includes(extension))) {
      showToast('Only document files are allowed: PDF, JPG, PNG, DOC, DOCX', 'error');
      return;
    }

    setUploadingDoc(docId);

    try {
      const currentDoc = allDocs.find((doc) => doc.docId === docId);
      const uploadedAt = new Date().toISOString();
      const uploadedBy = authState.activeUser?.fullName || 'Current User';
      await provider.uploadDocument(caseId, docId, {
        fileName: file.name,
        mimeType: file.type || undefined,
        fileSize: file.size,
        lastModified: file.lastModified,
      });
      await logAuditEvent({
        caseId,
        action: currentDoc?.fileName ? `${currentDoc.docType} uploaded as a new version` : `${currentDoc?.docType || 'Document'} uploaded`,
        notes: file.name,
      });

      setAllDocs(prev =>
        prev.map(doc => {
          if (doc.docId !== docId) return doc;

          const versions: DocVersion[] = doc.versions ? [...doc.versions] : [];
          if (versions.length === 0 && doc.fileName && doc.uploadedAt && doc.uploadedBy) {
            versions.push({
              versionNo: 1,
              fileName: doc.fileName,
              fileType: doc.fileType,
              mimeType: doc.mimeType || doc.fileType,
              size: doc.size,
              fileSize: doc.fileSize ?? doc.size,
              lastModified: doc.lastModified,
              uploadedAt: doc.uploadedAt,
              uploadedBy: doc.uploadedBy,
              status: doc.status,
            });
          }

          versions.push({
            versionNo: versions.length + 1,
            fileName: file.name,
            fileType: file.type || undefined,
            mimeType: file.type || undefined,
            size: file.size,
            fileSize: file.size,
            lastModified: file.lastModified,
            uploadedAt,
            uploadedBy,
            status: 'Uploaded',
          });

          return {
            ...doc,
            fileName: file.name,
            fileType: file.type || undefined,
            mimeType: file.type || undefined,
            size: file.size,
            fileSize: file.size,
            lastModified: file.lastModified,
            uploadedAt,
            uploadedBy,
            status: 'Uploaded',
            versions,
          };
        })
      );

      setUploadingDoc(null);
      onDocumentsChanged();
      showToast(`Selected: ${file.name}`, 'success');
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadingDoc(null);
      showToast('Failed to upload document', 'error');
    }
  };

  const handleMarkNotApplicable = async (docId: string, isNA: boolean) => {
    const doc = allDocs.find(d => d.docId === docId);

    if (doc?.mandatoryFlag && authState.activeRole !== 'admin') {
      showToast('Cannot mark mandatory document as Not Applicable', 'error');
      return;
    }

    try {
      await provider.updateDocumentStatus(docId, isNA ? 'Not_Applicable' : 'Missing');
      if (doc) {
        await logAuditEvent({
          caseId,
          action: isNA ? `${doc.docType} marked optional supporting document` : `${doc.docType} marked pending document`,
          notes: isNA ? 'This document will not block the current checklist.' : 'Document reverted to pending status.',
        });
      }
      setAllDocs(prev =>
        prev.map(doc => {
          if (doc.docId !== docId) return doc;
          const versions = doc.versions ? [...doc.versions] : undefined;
          if (versions && versions.length > 0) {
            versions[versions.length - 1] = {
              ...versions[versions.length - 1],
              status: isNA ? 'Not_Applicable' : 'Missing',
            };
          }
          return {
            ...doc,
            status: isNA ? 'Not_Applicable' : 'Missing',
            versions,
          };
        })
      );
      onDocumentsChanged();
      showToast(isNA ? 'Document marked as not applicable' : 'Document unmarked', 'success');
    } catch (error) {
      console.error('Error updating document:', error);
      showToast('Failed to update document', 'error');
    }
  };

  const handleNotesUpdate = async (docId: string, notes: string) => {
    try {
      await provider.updateDocumentNotes(docId, notes);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleSimulate = async (autoVerify: boolean) => {
    setSimulating(true);
    try {
      const count = await provider.simulateMandatoryDocs(caseId, { autoVerify });
      onDocumentsChanged();
      showToast(
        count > 0
          ? `${count} mandatory document${count > 1 ? 's' : ''} ${autoVerify ? 'verified' : 'uploaded'} (simulated)`
          : 'All mandatory documents already processed.',
        count > 0 ? 'success' : 'info'
      );
    } catch (error) {
      console.error('Error simulating docs:', error);
      showToast('Failed to simulate documents', 'error');
    } finally {
      setSimulating(false);
    }
  };

  const verifiedCount = allDocs.filter(d => d.status === 'Verified').length;
  const checklistReadiness = getChecklistReadinessFromDocuments(allDocs);
  const mandatoryCount = checklistReadiness.mandatoryTotal;
  const mandatoryCompleteCount = checklistReadiness.mandatoryComplete;
  const totalCount = allDocs.length;

  const isDemoMode = mode === 'DEMO';
  const isCommittee = authState.activeRole === 'committee_member';
  const isRejectedCaseForHospital = authState.activeRole === 'hospital_spoc' && caseStatus === 'Rejected';
  const canEditDocuments =
    authState.activeRole === 'hospital_spoc' ||
    authState.activeRole === 'verifier' ||
    authState.activeRole === 'admin';
  const canSimulate = isDemoMode && (authState.activeRole === 'admin' || authState.activeRole === 'verifier' || authState.activeRole === 'hospital_spoc');
  const hasMissingMandatory = checklistReadiness.blockingDocs.length > 0;
  const hasUnverifiedMandatory = hasMissingMandatory;

  const committeeMessage = isCommittee && isDemoMode ? (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-900">
        In production, this case would be assigned to specific panel members. Demo mode shows all documents to all users.
      </p>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {committeeMessage}
      {isRejectedCaseForHospital && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">Rejected cases are read-only for hospital users. Documents can no longer be edited in this flow.</p>
        </div>
      )}
      {!canEditDocuments && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">Documents are visible in read-only mode for your role.</p>
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Checklist Readiness</h3>
          {canSimulate && hasUnverifiedMandatory && (
            <div className={SHOW_DEMO_SIM_BUTTONS ? 'flex gap-2' : 'hidden'}>
              {hasMissingMandatory && (
                <NfiButton size="sm" variant="secondary" onClick={() => handleSimulate(false)} disabled={simulating}>
                  <Upload size={14} className="mr-1" />
                  {simulating ? 'Simulating...' : 'Simulate Upload Mandatory Docs'}
                </NfiButton>
              )}
              <NfiButton size="sm" onClick={() => handleSimulate(true)} disabled={simulating}>
                <Zap size={14} className="mr-1" />
                {simulating ? 'Simulating...' : 'Simulate & Auto-Verify (Demo)'}
              </NfiButton>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Total Documents</p>
            <p className="text-2xl font-bold text-[var(--nfi-text)]">{totalCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Verified</p>
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Mandatory</p>
            <p className="text-2xl font-bold text-[var(--nfi-primary)]">{mandatoryCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Mandatory Complete</p>
            <p className="text-2xl font-bold text-orange-600">{mandatoryCompleteCount}/{mandatoryCount}</p>
          </div>
        </div>
        {mandatoryCompleteCount === mandatoryCount && mandatoryCount > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm text-green-800">All mandatory documents complete. Ready to proceed.</p>
          </div>
        )}
      </div>

      {mandatoryCompleteCount === mandatoryCount && mandatoryCount > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Readiness check: All mandatory documents complete and ready for panel review.
          </p>
        </div>
      )}

      {authState.activeRole === 'clinical' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-700">You have access to Medical documents only.</p>
          </div>
        </div>
      )}

      {categories.map((category) => {
        const categoryDocs = allDocs.filter((d) => d.category === category);
        if (categoryDocs.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3 flex items-center gap-2">
              <FileText size={20} className="text-[var(--nfi-primary)]" />
              {getHospitalFacingFolderLabel(category)}
            </h3>
            {category === 'FINANCE' && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                At least one primary financial proof is required: Father Bank Statement OR Income Certificate OR Talati/Govt Economic Card.
              </div>
            )}
            {category === 'FINAL' && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                These documents are uploaded after discharge and do not affect initial case submission. If consent or testimonial support is needed, upload a signed/scanned document or PDF transcript only.
              </div>
            )}
            <div className="space-y-3">
              {categoryDocs.map((doc) => {
                const isVerified = doc.status === 'Verified';
                const isNA = doc.status === 'Not_Applicable';
                const isRejected = doc.status === 'Rejected';
                const isOptionalSupporting = !doc.mandatoryFlag;
                const isPrimaryFinanceProof =
                  doc.category === 'FINANCE' &&
                  PRIMARY_FINANCE_PROOF_DOC_TYPES.some((docType) => docType === doc.docType);
                const canMarkNA = canEditDocuments && !isRejectedCaseForHospital && (authState.activeRole === 'admin' || !doc.mandatoryFlag);
                const latestVersion = getLatestVersion(doc);
                const hasVersions = doc.versions && doc.versions.length > 1;
                const isExpanded = expandedVersions.has(doc.docId);
                const uploadButtonLabel = doc.status === 'Uploaded' ? 'Re-upload' : isRejected || isVerified ? 'Upload New Version' : 'Upload';
                const hideBadge = isPrimaryFinanceProof && doc.status === 'Missing';
                const badgeTone =
                  doc.status === 'Verified'
                    ? 'success'
                    : doc.status === 'Uploaded'
                    ? 'warning'
                    : doc.status === 'Not_Applicable'
                    ? 'neutral'
                    : isOptionalSupporting
                    ? 'neutral'
                    : 'error';
                const badgeLabel =
                  doc.status === 'Missing' && isOptionalSupporting
                    ? 'Optional'
                    : t(`doc.status.${doc.status}`);

                return (
                  <div key={doc.docId} className="border border-[var(--nfi-border)] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--nfi-text)]">{doc.docType}</p>
                          {doc.mandatoryFlag && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                          )}
                          {hasVersions && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">v{latestVersion?.versionNo || 1}</span>
                          )}
                          {doc.conditionNotes && (
                            <span className="text-xs text-[var(--nfi-text-secondary)] italic" title={doc.conditionNotes}>
                              i {doc.conditionNotes}
                            </span>
                          )}
                        </div>
                        {latestVersion && (
                          <p className="text-xs text-[var(--nfi-text-secondary)] mt-1 flex items-center gap-1.5 flex-wrap">
                            <Paperclip size={12} />
                            <span>{latestVersion.fileName || 'Uploaded file'}</span>
                            {latestVersion.uploadedAt && <span>{CASE_SUBTITLE_SEPARATOR}{new Date(latestVersion.uploadedAt).toLocaleString()}</span>}
                            {(latestVersion.fileSize ?? latestVersion.size) && (
                              <span>{CASE_SUBTITLE_SEPARATOR}{formatFileSize(latestVersion.fileSize ?? latestVersion.size)}</span>
                            )}
                          </p>
                        )}
                      </div>
                      {!hideBadge && (
                        <NfiBadge tone={badgeTone}>
                          {badgeLabel}
                        </NfiBadge>
                      )}
                    </div>

                    {isRejected && latestVersion?.rejectionReason && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Rejection reason:</strong> {latestVersion.rejectionReason}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isNA && canEditDocuments && !isRejectedCaseForHospital && (
                          <>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[doc.docId] = el;
                              }}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                void handleFileUpload(doc.docId, file);
                                e.currentTarget.value = '';
                              }}
                              className="hidden"
                              disabled={uploadingDoc === doc.docId}
                            />
                            <NfiButton
                              size="sm"
                              variant="secondary"
                              disabled={uploadingDoc === doc.docId}
                              onClick={() => fileInputRefs.current[doc.docId]?.click()}
                            >
                              <Upload size={16} className="mr-2" />
                              {uploadingDoc === doc.docId ? 'Uploading...' : uploadButtonLabel}
                            </NfiButton>
                          </>
                        )}

                        {canMarkNA && !isVerified && !isRejected && (
                          <NfiButton
                            size="sm"
                            variant={isNA ? 'secondary' : 'ghost'}
                            onClick={() => handleMarkNotApplicable(doc.docId, !isNA)}
                          >
                            <XCircle size={16} className="mr-2" />
                            {isNA ? 'Unmark N/A' : 'Mark N/A'}
                          </NfiButton>
                        )}

                        {isVerified && (
                          <span className="text-sm text-green-700 flex items-center gap-1">
                            <CheckCircle size={16} />
                            Locked (verified)
                          </span>
                        )}

                        {hasVersions && (
                          <button
                            onClick={() => setExpandedVersions(prev => {
                              const next = new Set(prev);
                              if (next.has(doc.docId)) next.delete(doc.docId);
                              else next.add(doc.docId);
                              return next;
                            })}
                            className="text-sm text-[var(--nfi-primary)] flex items-center gap-1 hover:underline"
                          >
                            <ChevronDown size={14} className={isExpanded ? 'rotate-180' : ''} />
                            History ({doc.versions!.length} versions)
                          </button>
                        )}
                      </div>

                      {hasVersions && isExpanded && doc.versions && (
                        <div className="mt-3 bg-gray-50 rounded p-3 space-y-2">
                          <p className="text-xs font-semibold text-[var(--nfi-text)]">Version History</p>
                          {[...doc.versions].reverse().map((version, idx) => (
                            <div key={idx} className="text-xs p-2 bg-white border border-gray-200 rounded">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-[var(--nfi-text)]">v{version.versionNo}</p>
                                  <p className="text-[var(--nfi-text-secondary)]">{version.fileName}</p>
                                  <p className="text-[var(--nfi-text-secondary)]">
                                    Uploaded by {version.uploadedBy} on {new Date(version.uploadedAt).toLocaleDateString()}
                                  </p>
                                  {version.reviewedAt && (
                                    <p className="text-[var(--nfi-text-secondary)]">
                                      Reviewed by {version.reviewedBy} on {new Date(version.reviewedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <NfiBadge tone={version.status === 'Verified' ? 'success' : version.status === 'Rejected' ? 'error' : 'warning'}>
                                  {version.status}
                                </NfiBadge>
                              </div>
                              {version.rejectionReason && (
                                <p className="mt-2 text-red-700">Rejection: {version.rejectionReason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <NfiField label="Notes" hint="Internal notes about this document">
                        <textarea
                          value={doc.notes || ''}
                          onChange={(e) => handleNotesUpdate(doc.docId, e.target.value)}
                          rows={2}
                          disabled={isVerified || isRejectedCaseForHospital || !canEditDocuments}
                          className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none resize-none disabled:bg-gray-50"
                          placeholder="Add notes about this document..."
                        />
                      </NfiField>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerificationTab({
  caseId,
  caseData,
  documents,
  onUpdate,
}: {
  caseId: string;
  caseData: Case;
  documents: DocumentWithTemplate[];
  onUpdate: () => void;
}) {
  const authState = getAuthState();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [readiness, setReadiness] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null);
  const [doctorReview, setDoctorReview] = useState<any>(null);
  const [fundApplication, setFundApplication] = useState<IntakeFundApplication | undefined>();

  useEffect(() => {
    const loadReadiness = async () => {
      const [data, review, intake] = await Promise.all([
        provider.getCaseSubmitReadiness(caseId),
        caseService.getDoctorReview(caseId),
        provider.getIntakeData(caseId).catch(() => ({})),
      ]);
      setReadiness(data);
      setDoctorReview(review);
      setFundApplication(intake.fundApplication);
    };
    loadReadiness();
  }, [caseId, provider, documents]);

  const canVerify = authState.activeRole === 'verifier' || authState.activeRole === 'admin';

  if (!canVerify) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--nfi-text-secondary)]">You do not have permission to verify documents</p>
      </div>
    );
  }

  const hasDocWithMetadata = (doc: DocumentMetadata) =>
    doc.fileName && (doc.status === 'Uploaded' || doc.status === 'Verified' || doc.status === 'Rejected');

  const handleVerify = async (docId: string) => {
    const doc = documents.find(d => d.docId === docId);

    try {
      await provider.updateDocumentStatus(docId, 'Verified');
      if (doc) {
        await logAuditEvent({
          caseId,
          action: `${doc.docType} verified`,
          notes: 'Document accepted during verification review.',
        });
      }
      onUpdate();
      showToast('Document verified', 'success');
    } catch (error) {
      console.error('Error verifying document:', error);
      showToast('Failed to verify document', 'error');
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectReason.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }

    try {
      await provider.updateDocumentStatus(docId, 'Rejected', rejectReason);
      const doc = documents.find(d => d.docId === docId);
      if (doc) {
        await logAuditEvent({
          caseId,
          action: `${doc.docType} rejected`,
          notes: rejectReason,
        });
      }
      onUpdate();
      setShowRejectModal(null);
      setRejectReason('');
      showToast('Document rejected', 'success');
    } catch (error) {
      console.error('Error rejecting document:', error);
      showToast('Failed to reject document', 'error');
    }
  };

  const handleUnverify = async (docId: string) => {
    if (authState.activeRole !== 'admin') {
      showToast('Only admins can unverify documents', 'error');
      return;
    }

    const doc = documents.find(d => d.docId === docId);

    try {
      await provider.updateDocumentStatus(docId, 'Uploaded');
      if (doc) {
        await logAuditEvent({
          caseId,
          action: `${doc.docType} reset for re-review`,
          notes: 'Document moved back to uploaded status.',
        });
      }
      onUpdate();
      showToast('Document unverified', 'success');
    } catch (error) {
      console.error('Error unverifying document:', error);
      showToast('Failed to unverify document', 'error');
    }
  };

  const handleReturnToHospital = async () => {
    if (!returnComment.trim()) {
      showToast('Please provide a comment for returning the case', 'error');
      return;
    }

    try {
      await provider.returnToHospital(caseId, {
        reason: 'Verification Issues',
        comment: returnComment,
      });
      onUpdate();
      setShowReturnModal(false);
      setReturnComment('');
      showToast('Case returned to hospital', 'success');
    } catch (error) {
      console.error('Error returning case:', error);
      showToast('Failed to return case', 'error');
    }
  };

  const handleSendToCommittee = async () => {
    const doctorGating = getDoctorReviewGatingInfo(doctorReview);
    if (!doctorGating.canSendToCommittee) {
      showToast(`Cannot send to panel: ${doctorGating.reason}`, 'error');
      return;
    }

    if (!readiness?.canSubmit) {
      const issues: string[] = [];
      if (!readiness?.fundAppComplete) issues.push('Fund Application incomplete');
      if (!readiness?.interimSummaryComplete) issues.push('Interim Summary incomplete');
      if (!readiness?.documentsReady) issues.push(`${readiness?.missingDocuments?.length || 0} mandatory documents need attention`);

      showToast(`Cannot send to panel: ${issues.join(', ')}`, 'error');
      return;
    }

    try {
      await provider.sendToCommittee(caseId, {
        comment: 'All intake forms and mandatory documents completed',
      });
      onUpdate();
      showToast('Case sent to panel for review', 'success');
    } catch (error) {
      console.error('Error sending to committee:', error);
      showToast('Failed to send to panel', 'error');
    }
  };

  const totalDocs = documents.length;
  const verifiedDocs = documents.filter(d => d.status === 'Verified').length;
  const rejectedDocs = documents.filter(d => d.status === 'Rejected').length;
  const naDocs = documents.filter(d => d.status === 'Not_Applicable').length;
  const doctorGating = getDoctorReviewGatingInfo(doctorReview);
  const canSendToCommittee = (readiness?.canSubmit ?? false) && doctorGating.canSendToCommittee;
  const incomeEvaluation = evaluateIncomeThreshold(fundApplication?.occupationIncomeSection);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Verification Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Total Documents</p>
            <p className="text-2xl font-bold text-[var(--nfi-text)]">{totalDocs}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Verified</p>
            <p className="text-2xl font-bold text-green-600">{verifiedDocs}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{rejectedDocs}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Not Applicable</p>
            <p className="text-2xl font-bold text-gray-600">{naDocs}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Mandatory Ready</p>
            <p className="text-2xl font-bold text-[var(--nfi-primary)]">
              {readiness?.mandatoryComplete || 0}/{readiness?.mandatoryTotal || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Clinical Review</p>
            <p className="text-2xl font-bold" style={{ color: doctorReview?.outcome === 'Approved' || doctorReview?.outcome === 'Approved_With_Comments' ? '#10b981' : '#f59e0b' }}>
              {doctorReview?.outcome ? '✓' : '◯'}
            </p>
          </div>
        </div>
        {canSendToCommittee && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm text-green-800">Ready to send to panel. All intake forms, documents, and requirements complete.</p>
          </div>
        )}
        {!canSendToCommittee && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Cannot Submit - Incomplete</p>
              <div className="text-xs text-red-700 mt-2 space-y-1">
                {!doctorGating.canSendToCommittee && (
                  <p>- Clinical Review: {doctorGating.reason}</p>
                )}
                {!readiness?.fundAppComplete && (
                  <p>- Fund Application: {readiness?.fundAppTotalPercent || 0}% complete</p>
                )}
                {!readiness?.interimSummaryComplete && (
                  <p>- Interim Summary: {readiness?.interimSummaryTotalPercent || 0}% complete</p>
                )}
                {readiness?.missingDocuments && readiness.missingDocuments.length > 0 && (
                  <p>- Missing documents: {readiness.missingDocuments.join(', ')}</p>
                )}
              </div>
              {!doctorGating.canSendToCommittee && (
                <p className="text-xs text-red-600 mt-2">
                  Complete the clinical review in the <strong>Clinical Review</strong> tab to proceed.
                </p>
              )}
              {!readiness?.fundAppComplete || !readiness?.interimSummaryComplete ? (
                <p className="text-xs text-red-600 mt-2">
                  Complete the intake forms in the <strong>Intake Forms</strong> tab to proceed.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <IncomeEligibilityPanel
        evaluation={incomeEvaluation}
        audience="internal"
        title="Income review status"
      />

      <div>
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Document Verification</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--nfi-border)]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Document Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Required</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc: any) => {
                const isVerified = doc.status === 'Verified';
                const isRejected = doc.status === 'Rejected';
                const canVerifyDoc = doc.status === 'Uploaded';

                return (
                  <tr key={doc.docId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-[var(--nfi-text)]">{doc.docType}</p>
                      {doc.fileName && (
                        <p className="text-xs text-[var(--nfi-text-secondary)]">{doc.fileName}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">{doc.category}</td>
                    <td className="py-3 px-4">
                      {doc.mandatoryFlag ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Yes</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <NfiBadge
                          tone={
                            doc.status === 'Verified'
                              ? 'success'
                              : doc.status === 'Rejected'
                              ? 'error'
                              : doc.status === 'Uploaded'
                              ? 'warning'
                              : doc.status === 'Not_Applicable'
                              ? 'neutral'
                              : 'error'
                          }
                        >
                          {doc.status.replace('_', ' ')}
                        </NfiBadge>
                        {isRejected && doc.notes && (
                          <p className="text-xs text-red-700 mt-1">Reason: {doc.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasDocWithMetadata(doc) && (
                          <NfiButton size="sm" variant="ghost" onClick={() => setPreviewDoc(doc)}>
                            <Eye size={16} className="mr-1" />
                            Preview
                          </NfiButton>
                        )}
                        {canVerifyDoc && (
                          <>
                            <NfiButton size="sm" onClick={() => handleVerify(doc.docId)}>
                              <CheckCircle size={16} className="mr-1" />
                              Verify
                            </NfiButton>
                            <NfiButton size="sm" variant="secondary" onClick={() => setShowRejectModal(doc.docId)}>
                              <XCircle size={16} className="mr-1" />
                              Reject
                            </NfiButton>
                          </>
                        )}
                        {isVerified && authState.activeRole === 'admin' && (
                          <NfiButton size="sm" variant="secondary" onClick={() => handleUnverify(doc.docId)}>
                            <ArrowLeft size={16} className="mr-1" />
                            Unverify
                          </NfiButton>
                        )}
                        {isRejected && (
                          <NfiButton size="sm" variant="secondary" onClick={() => handleUnverify(doc.docId)}>
                            <ArrowLeft size={16} className="mr-1" />
                            Reset
                          </NfiButton>
                        )}
                        {!canVerifyDoc && !isVerified && !isRejected && !hasDocWithMetadata(doc) && (
                          <span className="text-xs text-[var(--nfi-text-secondary)]">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--nfi-border)]">
        <NfiButton variant="secondary" onClick={() => setShowReturnModal(true)}>
          <ArrowLeft size={16} className="mr-2" />
          Return to Hospital
        </NfiButton>
        <NfiButton onClick={handleSendToCommittee} disabled={!canSendToCommittee}>
          <CheckCircle size={16} className="mr-2" />
          Send to Panel
        </NfiButton>
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-4">Return Case to Hospital</h3>
            <NfiField label="Reason for Return" required>
              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none resize-none"
                placeholder="Explain why the case is being returned..."
              />
            </NfiField>
            <div className="flex gap-3 mt-4">
              <NfiButton variant="secondary" onClick={() => {
                setShowReturnModal(false);
                setReturnComment('');
              }}>
                Cancel
              </NfiButton>
              <NfiButton variant="danger" onClick={handleReturnToHospital}>
                Return Case
              </NfiButton>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-4">Reject Document</h3>
            <NfiField label="Reason for Rejection" required>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none resize-none"
                placeholder="Explain why the document is being rejected..."
              />
            </NfiField>
            <div className="flex gap-3 mt-4">
              <NfiButton variant="secondary" onClick={() => {
                setShowRejectModal(null);
                setRejectReason('');
              }}>
                Cancel
              </NfiButton>
              <NfiButton variant="danger" onClick={() => handleReject(showRejectModal)}>
                Reject Document
              </NfiButton>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        caseRef={(caseData as any)?.caseRef}
      />
    </div>
  );
}

type PanelReviewFormState = Record<
  PanelAssignmentType,
  {
    decision: PanelReviewDecision;
    remarks: string;
    markComplete: boolean;
  }
>;

function buildPanelReviewFormState(
  panelReviews?: WorkflowExtensions['panelReviews']
): PanelReviewFormState {
  return PANEL_ASSIGNMENT_ORDER.reduce((acc, panelType) => {
    const review = panelReviews?.[panelType];
    acc[panelType] = {
      decision: review?.decision || 'Pending',
      remarks: review?.remarks || '',
      markComplete: !!review?.completedAt,
    };
    return acc;
  }, {} as PanelReviewFormState);
}

function getPanelStatusTone(status: string): 'neutral' | 'warning' | 'success' | 'error' {
  if (status === 'Approved recommendation' || status === 'Reviewed') return 'success';
  if (status === 'Rejected') return 'error';
  if (status === 'Returned' || status === 'In progress') return 'warning';
  return 'neutral';
}

function getPanelDecisionTone(decision: PanelReviewDecision): 'neutral' | 'warning' | 'success' | 'error' {
  if (decision === 'Approve') return 'success';
  if (decision === 'Reject') return 'error';
  if (decision === 'Return') return 'warning';
  return 'neutral';
}

function ApprovalTab({ caseId }: { caseId: string }) {
  const authState = getAuthState();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [familyData, setFamilyData] = useState<FamilyProfile | null>(null);
  const [clinicalData, setClinicalData] = useState<ClinicalCaseDetails | null>(null);
  const [financialData, setFinancialData] = useState<FinancialCaseDetails | null>(null);
  const [documents, setDocuments] = useState<DocumentWithTemplate[]>([]);
  const [decision, setDecision] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [rejectionDetails, setRejectionDetails] = useState<any>(null);
  const [workflowExt, setWorkflowExt] = useState<WorkflowExtensions | null>(null);
  const [fundApplication, setFundApplication] = useState<IntakeFundApplication | undefined>();
  const [settlement, setSettlement] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLegacyInstallments, setShowLegacyInstallments] = useState(false);
  const [panelAssignments, setPanelAssignments] = useState(buildPanelAssignmentState());
  const [panelReviewForms, setPanelReviewForms] = useState<PanelReviewFormState>(buildPanelReviewFormState());
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [savingPanelType, setSavingPanelType] = useState<PanelAssignmentType | null>(null);
  const [consolidatedRemarks, setConsolidatedRemarks] = useState('');
  const [savingConsolidation, setSavingConsolidation] = useState(false);

  const [formData, setFormData] = useState({
    outcome: 'Pending',
    approvedAmount: '',
    comments: '',
  });

  const [fundingData, setFundingData] = useState({
    proposedSponsorAmount: '',
    program: '',
    campaign: '',
    isTopUp: false,
    previousApprovedAmount: '',
    topUpAmount: '',
    recommendationNote: '',
    missingArtifactNote: '',
    manualReviewNote: '',
  });

  const [rejectionForm, setRejectionForm] = useState({
    reasonCategory: 'Medical',
    rejectionLevel: 'NFI',
    communicationStatus: '',
    referringHospital: '',
    caseSummary: '',
  });

  useEffect(() => {
    loadData();
  }, [caseId]);

  const parseAmount = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const previousApprovedAmount = parseAmount(fundingData.previousApprovedAmount);
  const topUpAmount = parseAmount(fundingData.topUpAmount);
  const totalAfterTopUp =
    fundingData.isTopUp && previousApprovedAmount !== undefined && topUpAmount !== undefined
      ? previousApprovedAmount + topUpAmount
      : undefined;
  const topUpPreviousBase =
    fundingData.previousApprovedAmount ||
    workflowExt?.funding?.totalApprovedAmount?.toString() ||
    workflowExt?.funding?.previousApprovedAmount?.toString() ||
    decision?.approvedAmount?.toString() ||
    (caseData as any)?.approvedAmount?.toString() ||
    '';

  const canEdit = authState.activeRole === 'committee_member' || authState.activeRole === 'admin';
  const canEditPanelReviews = authState.activeRole === 'committee_member' || authState.activeRole === 'admin' || authState.activeRole === 'verifier';
  const showEditor = canEdit && (!decision || isEditing);

  const programOptions = useMemo(() => {
    const options = [...FUNDING_PROGRAM_OPTIONS] as string[];
    if (fundingData.program && !options.includes(fundingData.program)) {
      options.push(fundingData.program);
    }
    return options;
  }, [fundingData.program]);

  const campaignOptions = useMemo(() => {
    const options = [...FUNDING_CAMPAIGN_OPTIONS] as string[];
    if (fundingData.campaign && !options.includes(fundingData.campaign)) {
      options.push(fundingData.campaign);
    }
    return options;
  }, [fundingData.campaign]);

  const loadData = async () => {
    try {
      const [
        caseInfo,
        decisionData,
        installmentsData,
        rejectionData,
        workflowExtData,
        intakeData,
        familyRecord,
        clinicalRecord,
        financialRecord,
        caseDocuments,
        settlementRecord,
      ] = await Promise.all([
        caseService.getCaseById(caseId),
        provider.getCommitteeReview(caseId).catch(() => null),
        caseService.getInstallments(caseId).catch(() => []),
        caseService.getRejectionDetails(caseId).catch(() => null),
        provider.getWorkflowExt(caseId).catch(() => null),
        provider.getIntakeData(caseId).catch(() => ({})),
        provider.getFamily(caseId).catch(() => null),
        provider.getClinicalDetails(caseId).catch(() => null),
        provider.getFinancial(caseId).catch(() => null),
        provider.listCaseDocuments(caseId).catch(() => [] as DocumentWithTemplate[]),
        provider.getSettlement(caseId).catch(() => null),
      ]);

      setCaseData(caseInfo);
      setFamilyData(familyRecord);
      setClinicalData(clinicalRecord);
      setFinancialData(financialRecord);
      setDocuments(caseDocuments || []);
      setDecision(decisionData);
      setInstallments(installmentsData || []);
      setRejectionDetails(rejectionData);
      setWorkflowExt(workflowExtData);
      setPanelAssignments(buildPanelAssignmentState(workflowExtData?.panelAssignments));
      setPanelReviewForms(buildPanelReviewFormState(workflowExtData?.panelReviews));
      setConsolidatedRemarks(workflowExtData?.panelDecision?.consolidatedRemarks || '');
      setFundApplication(intakeData.fundApplication);
      setSettlement(settlementRecord);

      setFormData({
        outcome: decisionData?.outcome || 'Pending',
        approvedAmount: decisionData?.approvedAmount?.toString() || '',
        comments: decisionData?.comments || '',
      });

      const workflowFunding = workflowExtData?.funding;
      const isTopUp = !!workflowFunding?.isTopUp;
      const fallbackPreviousAmount =
        workflowFunding?.previousApprovedAmount ??
        (decisionData?.approvedAmount || (caseInfo as any)?.approvedAmount || 0);

      setFundingData({
        proposedSponsorAmount: workflowFunding?.sponsorQuantification?.proposedAmount?.toString() || '',
        program: workflowFunding?.program || '',
        campaign: workflowFunding?.campaign?.campaignName || '',
        isTopUp,
        previousApprovedAmount: isTopUp ? String(fallbackPreviousAmount || '') : '',
        topUpAmount: workflowFunding?.topUpAmount?.toString() || '',
        recommendationNote: workflowFunding?.recommendationNote || workflowFunding?.sponsorQuantification?.notes || '',
        missingArtifactNote: workflowFunding?.blockerNote || '',
        manualReviewNote: workflowFunding?.manualReviewNote || '',
      });

      if (rejectionData) {
        setRejectionForm({
          reasonCategory: rejectionData.reasonCategory || 'Medical',
          rejectionLevel: rejectionData.rejectionLevel || 'NFI',
          communicationStatus: rejectionData.communicationStatus || '',
          referringHospital: rejectionData.referringHospital || '',
          caseSummary: rejectionData.caseSummary || '',
        });
      }
    } catch (error) {
      console.error('Error loading approval data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    if (panelFinalizationBlocked) {
      await logAuditEvent({
        caseId,
        action: 'Final action blocked due to pending director variance review',
        notes: varianceGovernance.gatingReason,
      }).catch(() => {});
      showToast(varianceGovernance.gatingReason || 'Director variance review is required before final approval', 'error');
      return;
    }

    if (formData.outcome !== 'Pending' && computedPanelDecision.completedPanels < computedPanelDecision.totalPanels) {
      showToast('All three panel reviews must be completed before recording the final internal decision', 'error');
      return;
    }

    if (formData.outcome === 'Approved' && computedPanelDecision.overallDecision !== 'Ready for Final Approval') {
      showToast('Final approval is only available when all three panels approve', 'error');
      return;
    }

    if (formData.outcome === 'Rejected' && computedPanelDecision.overallDecision !== 'Reject Recommended') {
      showToast('Final rejection requires a clear reject recommendation from the completed panel reviews', 'error');
      return;
    }

    if (formData.outcome === 'Need_More_Info' && !['Return Recommended', 'Needs Resolution'].includes(computedPanelDecision.overallDecision)) {
      showToast('Use Need More Info only when the completed panel reviews recommend return or need resolution', 'error');
      return;
    }

    const approvedAmountValue = parseAmount(formData.approvedAmount);
    const finalApprovedAmount = fundingData.isTopUp ? totalAfterTopUp : approvedAmountValue;

    if (formData.outcome === 'Approved' && finalApprovedAmount === undefined) {
      showToast('Approved amount is required for approved cases', 'error');
      return;
    }

    if (formData.outcome === 'Approved' && fundingData.isTopUp && totalAfterTopUp === undefined) {
      showToast('Previous approved amount and top-up amount are required for top-up cases', 'error');
      return;
    }

    if (formData.outcome === 'Rejected') {
      if (!rejectionForm.reasonCategory || !rejectionForm.rejectionLevel ||
          !rejectionForm.communicationStatus || !rejectionForm.caseSummary) {
        showToast('Please fill in all required rejection details', 'error');
        return;
      }
    }

    setSubmitting(true);

    try {
      await provider.submitCommitteeDecision(caseId, {
        outcome: formData.outcome as any,
        approvedAmount: formData.outcome === 'Approved' ? finalApprovedAmount : undefined,
        comments: formData.comments,
        decidedBy: authState.activeUser?.userId || 'unknown',
      });

      if (formData.outcome === 'Approved') {
        await caseService.updateFinancialDetails(caseId, {
          approvedAmount: finalApprovedAmount,
        }).catch(() => {});

        await provider.saveWorkflowExt(caseId, {
          varianceGovernance: varianceGovernanceSnapshot,
          funding: {
            ...workflowExt?.funding,
            program: fundingData.program || undefined,
            isTopUp: fundingData.isTopUp,
            previousApprovedAmount: fundingData.isTopUp ? previousApprovedAmount : undefined,
            topUpAmount: fundingData.isTopUp ? topUpAmount : undefined,
            totalApprovedAmount: finalApprovedAmount,
            campaign: {
              ...workflowExt?.funding?.campaign,
              campaignName: fundingData.campaign || undefined,
            },
            sponsorQuantification: {
              ...workflowExt?.funding?.sponsorQuantification,
              proposedAmount: parseAmount(fundingData.proposedSponsorAmount),
              notes: formData.comments || workflowExt?.funding?.sponsorQuantification?.notes,
            },
          },
        }).catch(() => {});
      }

      if (formData.outcome === 'Rejected') {
        await caseService.saveRejectionDetails(caseId, rejectionForm).catch(() => {});
      }

      await loadData();
      setIsEditing(false);
      showToast('Decision saved successfully', 'success');
    } catch (error) {
      console.error('Error saving decision:', error);
      showToast('Failed to save decision', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignmentChange = (
    panelType: keyof typeof panelAssignments,
    field: 'reviewerName' | 'panelName' | 'notes',
    value: string
  ) => {
    setPanelAssignments((current) => ({
      ...current,
      [panelType]: {
        ...current[panelType],
        [field]: value,
      },
    }));
  };

  const handleSaveAssignments = async () => {
    if (!canEdit) return;

    setSavingAssignments(true);
    try {
      const nextAssignments = buildPanelAssignmentsPayload(
        panelAssignments,
        workflowExt?.panelAssignments,
        authState.activeUser?.fullName || authState.activeUser?.userId
      );

      await provider.saveWorkflowExt(caseId, {
        panelAssignments: nextAssignments,
      });

      setWorkflowExt((current: any) => ({
        ...current,
        panelAssignments: nextAssignments,
      }));
      showToast('Reviewer assignments saved', 'success');
    } catch (error) {
      console.error('Error saving panel assignments:', error);
      showToast('Failed to save reviewer assignments', 'error');
    } finally {
      setSavingAssignments(false);
    }
  };

  const incomeEvaluation = evaluateIncomeThreshold(fundApplication?.occupationIncomeSection);
  const computedPanelDecision = useMemo(
    () => {
      const base = getOverallPanelDecision(workflowExt?.panelReviews);
      return {
        ...base,
        consolidatedRemarks: workflowExt?.panelDecision?.consolidatedRemarks || '',
        recordedAt: workflowExt?.panelDecision?.recordedAt,
        recordedBy: workflowExt?.panelDecision?.recordedBy,
        lastUpdatedAt: workflowExt?.panelDecision?.lastUpdatedAt,
        lastUpdatedBy: workflowExt?.panelDecision?.lastUpdatedBy,
      };
    },
    [workflowExt]
  );
  const panelSummary = useMemo(
    () => buildPanelSummary(workflowExt?.panelReviews, workflowExt?.panelAssignments),
    [workflowExt]
  );
  const financialReviewContext = useMemo(
    () =>
      getFinancialReviewContext({
        caseData,
        familyData,
        financialData,
        workflowExt,
        settlement,
        documents,
        fundApplication,
        evaluation: incomeEvaluation,
      }),
    [caseData, familyData, financialData, workflowExt, settlement, documents, fundApplication, incomeEvaluation]
  );
  const varianceGovernance = financialReviewContext.varianceGovernance;
  const varianceDirectorReview = workflowExt?.varianceGovernance;
  const panelFinalizationBlocked =
    formData.outcome === 'Approved' && varianceGovernance.status === 'director_review_required';
  const varianceGovernanceSnapshot = buildVarianceGovernanceSnapshot(
    varianceGovernance,
    varianceDirectorReview
  );

  const handlePanelReviewChange = (
    panelType: PanelAssignmentType,
    field: 'decision' | 'remarks' | 'markComplete',
    value: string | boolean
  ) => {
    setPanelReviewForms((current) => ({
      ...current,
      [panelType]: {
        ...current[panelType],
        [field]: value,
      },
    }));
  };

  const handleSavePanelReview = async (panelType: PanelAssignmentType) => {
    if (!canEditPanelReviews) return;

    const panelForm = panelReviewForms[panelType];
    const existingReview = workflowExt?.panelReviews?.[panelType];
    const actor = authState.activeUser?.fullName || authState.activeUser?.userId || getRoleLabel(authState.activeRole);
    const now = new Date().toISOString();
    const nextReview: WorkflowPanelReview = {
      panelType,
      decision: panelForm.decision,
      remarks: panelForm.remarks.trim() || undefined,
      reviewedBy: panelForm.markComplete ? actor : existingReview?.reviewedBy,
      reviewedAt: panelForm.markComplete ? (existingReview?.reviewedAt || now) : existingReview?.reviewedAt,
      completedAt: panelForm.markComplete ? (existingReview?.completedAt || now) : undefined,
      lastUpdatedAt: now,
      lastUpdatedBy: actor,
    };

    const nextPanelReviews: NonNullable<WorkflowExtensions['panelReviews']> = {
      ...(workflowExt?.panelReviews || {}),
      [panelType]: nextReview,
    };
    const nextPanelDecision = {
      ...getOverallPanelDecision(nextPanelReviews),
      consolidatedRemarks,
      lastUpdatedAt: now,
      lastUpdatedBy: actor,
      recordedAt: workflowExt?.panelDecision?.recordedAt,
      recordedBy: workflowExt?.panelDecision?.recordedBy,
    };
    const workflowPatch: Partial<WorkflowExtensions> = {
      panelReviews: nextPanelReviews,
      panelDecision: nextPanelDecision,
      varianceGovernance: varianceGovernanceSnapshot,
    };

    if (panelType === 'financial') {
      workflowPatch.funding = {
        ...workflowExt?.funding,
        program: fundingData.program.trim() || undefined,
        isTopUp: fundingData.isTopUp,
        previousApprovedAmount: fundingData.isTopUp ? previousApprovedAmount : undefined,
        topUpAmount: fundingData.isTopUp ? topUpAmount : undefined,
        recommendationNote: fundingData.recommendationNote.trim() || undefined,
        blockerNote: fundingData.missingArtifactNote.trim() || undefined,
        manualReviewNote: fundingData.manualReviewNote.trim() || undefined,
        campaign: {
          ...workflowExt?.funding?.campaign,
          campaignName: fundingData.campaign.trim() || undefined,
        },
        sponsorQuantification: {
          ...workflowExt?.funding?.sponsorQuantification,
          proposedAmount: parseAmount(fundingData.proposedSponsorAmount),
          notes: fundingData.recommendationNote.trim() || undefined,
          reviewerRationale: panelForm.remarks.trim() || undefined,
        },
      };
    }

    setSavingPanelType(panelType);
    try {
      await provider.saveWorkflowExt(caseId, workflowPatch);

      setWorkflowExt((current) => ({
        ...(current || {}),
        panelAssignments: current?.panelAssignments,
        panelReviews: nextPanelReviews,
        panelDecision: nextPanelDecision,
        funding: panelType === 'financial'
          ? {
              ...current?.funding,
              ...workflowPatch.funding,
              campaign: {
                ...current?.funding?.campaign,
                ...workflowPatch.funding?.campaign,
              },
              sponsorQuantification: {
                ...current?.funding?.sponsorQuantification,
                ...workflowPatch.funding?.sponsorQuantification,
              },
            }
          : current?.funding,
      }));

      const panelTitle = PANEL_ASSIGNMENT_META[panelType].title;
      const decisionLabel = panelForm.decision === 'Pending' ? 'Pending / Not Reviewed' : panelForm.decision;
      if (panelType === 'financial') {
        const previousFunding = workflowExt?.funding;
        const nextFunding = workflowPatch.funding;
        await logAuditEvent({
          caseId,
          action: 'Financial reviewer artifact updated',
          notes: `Threshold: ${incomeEvaluation.thresholdOutcomeLabel}. Manual review: ${incomeEvaluation.manualReviewRequired ? 'Yes' : 'No'}. Proof readiness: ${financialReviewContext.artifact.proofReadinessLabel}.`,
        }).catch(() => {});

        await logAuditEvent({
          caseId,
          action: 'Financial review recommendation saved',
          notes: `${decisionLabel}.${panelForm.remarks.trim() ? ` Rationale: ${panelForm.remarks.trim()}` : ''}`,
        }).catch(() => {});

        if (
          previousFunding?.sponsorQuantification?.proposedAmount !==
          nextFunding?.sponsorQuantification?.proposedAmount
        ) {
          await logAuditEvent({
            caseId,
            action: 'Proposed sponsor amount updated',
            notes: `Proposed sponsor amount set to ${toCurrency(nextFunding?.sponsorQuantification?.proposedAmount)}.`,
          }).catch(() => {});
        }

        if ((previousFunding?.program || '') !== (nextFunding?.program || '')) {
          await logAuditEvent({
            caseId,
            action: 'Program recommendation updated',
            notes: `Program: ${nextFunding?.program || 'Awaiting reviewer input'}.`,
          }).catch(() => {});
        }

        if ((previousFunding?.campaign?.campaignName || '') !== (nextFunding?.campaign?.campaignName || '')) {
          await logAuditEvent({
            caseId,
            action: 'Campaign recommendation updated',
            notes: `Campaign: ${nextFunding?.campaign?.campaignName || 'Awaiting reviewer input'}.`,
          }).catch(() => {});
        }

        if (
          (previousFunding?.recommendationNote || '') !== (nextFunding?.recommendationNote || '') ||
          (previousFunding?.blockerNote || '') !== (nextFunding?.blockerNote || '') ||
          (previousFunding?.manualReviewNote || '') !== (nextFunding?.manualReviewNote || '')
        ) {
          await logAuditEvent({
            caseId,
            action: 'Sponsor intelligence updated',
            notes: `${financialReviewContext.sponsorIntelligence.state.label}.${nextFunding?.recommendationNote ? ` Note: ${nextFunding.recommendationNote}` : ''}`,
          }).catch(() => {});
        }

        if (nextFunding?.recommendationNote) {
          await logAuditEvent({
            caseId,
            action: 'Funding recommendation saved',
            notes: nextFunding.recommendationNote,
          }).catch(() => {});
        }

        await logAuditEvent({
          caseId,
          action: 'Variance governance evaluated',
          notes: `${varianceGovernance.governanceBadge}. ${varianceGovernance.governanceMessage}`,
        }).catch(() => {});

        if (varianceGovernance.status === 'director_review_required') {
          await logAuditEvent({
            caseId,
            action: 'Variance exceeds tolerance',
            notes: `Variance ${varianceGovernance.variancePercent}% exceeds the ${varianceGovernance.tolerancePercent}% tolerance.`,
          }).catch(() => {});
          await logAuditEvent({
            caseId,
            action: 'Director review required',
            notes: varianceGovernance.gatingReason,
          }).catch(() => {});
        }

        if (varianceGovernance.status === 'director_review_completed') {
          await logAuditEvent({
            caseId,
            action: 'Variance cleared / governance satisfied',
            notes: varianceGovernance.governanceMessage,
          }).catch(() => {});
        }
      }

      await logAuditEvent({
        caseId,
        action: `${panelTitle} saved`,
        notes: `${decisionLabel} recommendation recorded.${panelForm.remarks.trim() ? ` Remarks: ${panelForm.remarks.trim()}` : ''}`,
      }).catch(() => {});

      if (panelForm.decision === 'Return') {
        await logAuditEvent({
          caseId,
          action: panelType === 'financial' ? 'Financial review returned case' : 'Panel returned case',
          notes: `${panelTitle} recorded a return recommendation.`,
        }).catch(() => {});
      }

      if (panelForm.decision === 'Reject') {
        await logAuditEvent({
          caseId,
          action: panelType === 'financial' ? 'Financial review rejected case' : 'Panel rejected case',
          notes: `${panelTitle} recorded a reject recommendation.`,
        }).catch(() => {});
      }

      if (panelForm.markComplete) {
        await logAuditEvent({
          caseId,
          action: 'Panel completed review',
          notes: `${panelTitle} marked review complete.`,
        }).catch(() => {});
      }

      await logAuditEvent({
        caseId,
        action: 'Panel decision updated',
        notes: `${panelTitle} updated. Consolidated state: ${nextPanelDecision.overallDecision}.`,
      }).catch(() => {});

      if (nextPanelDecision.completedPanels === nextPanelDecision.totalPanels) {
        await logAuditEvent({
          caseId,
          action: 'Consolidated panel decision recorded',
          notes: `${nextPanelDecision.overallDecision}.`,
        }).catch(() => {});
      }

      showToast(`${panelTitle} saved`, 'success');
    } catch (error) {
      console.error('Error saving panel review:', error);
      showToast('Failed to save panel review', 'error');
    } finally {
      setSavingPanelType(null);
    }
  };

  const handleSaveConsolidation = async () => {
    if (!canEditPanelReviews) return;

    const actor = authState.activeUser?.fullName || authState.activeUser?.userId || getRoleLabel(authState.activeRole);
    const now = new Date().toISOString();
    const nextPanelDecision = {
      ...getOverallPanelDecision(workflowExt?.panelReviews),
      consolidatedRemarks: consolidatedRemarks.trim() || undefined,
      recordedAt: now,
      recordedBy: actor,
      lastUpdatedAt: now,
      lastUpdatedBy: actor,
    };

    setSavingConsolidation(true);
    try {
      await provider.saveWorkflowExt(caseId, {
        panelDecision: nextPanelDecision,
      });
      setWorkflowExt((current) => ({
        ...(current || {}),
        panelAssignments: current?.panelAssignments,
        panelReviews: current?.panelReviews,
        panelDecision: nextPanelDecision,
      }));
      await logAuditEvent({
        caseId,
        action: 'Consolidated panel decision recorded',
        notes: `${nextPanelDecision.overallDecision}.${nextPanelDecision.consolidatedRemarks ? ` Notes: ${nextPanelDecision.consolidatedRemarks}` : ''}`,
      }).catch(() => {});
      showToast('Panel consolidation saved', 'success');
    } catch (error) {
      console.error('Error saving consolidated panel decision:', error);
      showToast('Failed to save panel consolidation', 'error');
    } finally {
      setSavingConsolidation(false);
    }
  };

  const clinicalSocialPanelTypes = PANEL_ASSIGNMENT_ORDER.filter((panelType) => panelType !== 'financial');
  const financialAssignment = workflowExt?.panelAssignments?.financial;
  const financialReview = workflowExt?.panelReviews?.financial;
  const financialForm = panelReviewForms.financial;
  const financialPanelTitle = PANEL_ASSIGNMENT_META.financial.title;
  const financialPanelStatus = getPanelStatus(financialReview);

  return (
    <div className="space-y-6">
      <div className="p-4 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Panel Summary / Consolidation</h3>
            <p className="text-sm text-[var(--nfi-text-secondary)]">{computedPanelDecision.readinessLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NfiBadge tone={getOverallDecisionTone(computedPanelDecision.overallDecision)}>
              {computedPanelDecision.overallDecision}
            </NfiBadge>
            <NfiBadge tone={computedPanelDecision.completedPanels === computedPanelDecision.totalPanels ? 'success' : 'warning'}>
              {computedPanelDecision.completedPanels}/{computedPanelDecision.totalPanels} panels completed
            </NfiBadge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {panelSummary.map((panel) => (
            <div key={panel.panelType} className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-2 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--nfi-text)] break-words">{panel.title}</p>
                  <p className="text-xs text-[var(--nfi-text-secondary)] break-words">{panel.panelLabel}</p>
                </div>
                <NfiBadge tone={getPanelStatusTone(panel.status)}>{panel.status}</NfiBadge>
              </div>
              <p className="text-sm text-[var(--nfi-text)] break-words">{panel.reviewerLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Recommendation</span>
                <NfiBadge tone={getPanelDecisionTone(panel.decision as PanelReviewDecision)}>{panel.decision === 'Pending' ? 'Pending / Not Reviewed' : panel.decision}</NfiBadge>
              </div>
              <p className="text-xs text-[var(--nfi-text-secondary)]">
                {panel.updatedAt ? `Updated ${new Date(panel.updatedAt).toLocaleDateString()}` : 'No panel activity yet'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)]">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Reviewer Assignment</h3>
            <p className="text-sm text-[var(--nfi-text-secondary)]">
              Clinical, Social, and Financial assignments drive the prototype three-panel review sections below.
            </p>
          </div>
          {!canEdit && <NfiBadge tone="neutral">Display Only</NfiBadge>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PANEL_ASSIGNMENT_ORDER.map((panelType) => {
            const assignment = workflowExt?.panelAssignments?.[panelType];
            const state = panelAssignments[panelType];
            const meta = PANEL_ASSIGNMENT_META[panelType];

            return (
              <div key={panelType} className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--nfi-text)]">{meta.title}</p>
                  <p className="text-xs text-[var(--nfi-text-secondary)]">{meta.subtitle}</p>
                </div>
                <div className="rounded-lg bg-[var(--nfi-bg-light)] border border-[var(--nfi-border)] px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Current Assignment</p>
                  <p className="text-sm font-medium text-[var(--nfi-text)] mt-1">{getReviewerAssignmentSummary(assignment)}</p>
                  <p className="text-xs text-[var(--nfi-text-secondary)] mt-1">
                    {assignment?.assignedAt
                      ? `Updated ${new Date(assignment.assignedAt).toLocaleDateString()}`
                      : 'Not yet assigned'}
                  </p>
                </div>
                {canEdit ? (
                  <div className="space-y-3">
                    <NfiField label="Reviewer / Panel">
                      <input
                        type="text"
                        value={state.reviewerName}
                        onChange={(e) => handleAssignmentChange(panelType, 'reviewerName', e.target.value)}
                        placeholder={`Assign ${meta.subtitle.toLowerCase()}`}
                        className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      />
                    </NfiField>
                    <NfiField label="Panel Label">
                      <input
                        type="text"
                        value={state.panelName}
                        onChange={(e) => handleAssignmentChange(panelType, 'panelName', e.target.value)}
                        placeholder={meta.defaultPanelName}
                        className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      />
                    </NfiField>
                    <NfiField label="Assignment Note">
                      <textarea
                        value={state.notes}
                        onChange={(e) => handleAssignmentChange(panelType, 'notes', e.target.value)}
                        rows={2}
                        placeholder="Optional placeholder note"
                        className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
                      />
                    </NfiField>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--nfi-text-secondary)]">
                    <p><span className="font-medium text-[var(--nfi-text)]">Panel:</span> {assignment?.panelName || meta.defaultPanelName}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Notes:</span> {assignment?.notes || 'No assignment note added'}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {canEdit && (
          <div className="pt-4 flex justify-end">
            <NfiButton onClick={handleSaveAssignments} disabled={savingAssignments}>
              <Save size={16} className="mr-2" />
              {savingAssignments ? 'Saving...' : 'Save Reviewer Assignments'}
            </NfiButton>
          </div>
        )}
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {clinicalSocialPanelTypes.map((panelType) => {
            const meta = PANEL_ASSIGNMENT_META[panelType];
            const assignment = workflowExt?.panelAssignments?.[panelType];
            const review = workflowExt?.panelReviews?.[panelType];
            const form = panelReviewForms[panelType];
            const panelStatus = getPanelStatus(review);
            const panelTitle = meta.title;

            return (
              <div key={panelType} className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-4 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-[var(--nfi-text)] break-words">{panelTitle}</h4>
                    <p className="text-xs text-[var(--nfi-text-secondary)] break-words">{assignment?.panelName || meta.defaultPanelName}</p>
                  </div>
                  <NfiBadge tone={getPanelStatusTone(panelStatus)}>{panelStatus}</NfiBadge>
                </div>

                <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3 text-sm space-y-1 break-words">
                  <p><span className="font-medium text-[var(--nfi-text)]">Assigned reviewer:</span> {getReviewerAssignmentSummary(assignment)}</p>
                  <p><span className="font-medium text-[var(--nfi-text)]">Assignment note:</span> {assignment?.notes || 'No assignment note added'}</p>
                  <p><span className="font-medium text-[var(--nfi-text)]">Last completed:</span> {review?.completedAt ? new Date(review.completedAt).toLocaleDateString() : 'Pending'}</p>
                </div>

                {panelType === 'clinical' && (
                  <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3 space-y-2 text-sm break-words">
                    <p className="font-medium text-[var(--nfi-text)]">Clinical context</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Diagnosis:</span> {clinicalData?.diagnosis || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Interim summary:</span> {clinicalData?.summary || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Doctor:</span> {clinicalData?.doctorName || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">NICU days:</span> {clinicalData?.nicuDays ?? 'Not available'}</p>
                  </div>
                )}

                {panelType === 'social' && (
                  <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3 space-y-2 text-sm break-words">
                    <p className="font-medium text-[var(--nfi-text)]">Social context</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Mother:</span> {familyData?.motherName || (caseData as any)?.motherName || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Father:</span> {familyData?.fatherName || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Phone:</span> {familyData?.phone || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Address:</span> {familyData?.address || 'Not available'}</p>
                    <p><span className="font-medium text-[var(--nfi-text)]">Interview outcome:</span> {workflowExt?.interview?.outcome || 'Not available'}</p>
                  </div>
                )}

                <div className="space-y-3 min-w-0">
                  <NfiField label="Recommendation">
                    <select
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={form.decision}
                      onChange={(e) => handlePanelReviewChange(panelType, 'decision', e.target.value)}
                      disabled={!canEditPanelReviews}
                    >
                      {getPanelDecisionOptions().map((option) => (
                        <option key={option} value={option}>
                          {option === 'Pending' ? 'Pending / Not Reviewed' : option}
                        </option>
                      ))}
                    </select>
                  </NfiField>

                  <NfiField label="Remarks / Notes">
                    <textarea
                      rows={4}
                      value={form.remarks}
                      onChange={(e) => handlePanelReviewChange(panelType, 'remarks', e.target.value)}
                      placeholder={`Add ${panelTitle.toLowerCase()} remarks`}
                      disabled={!canEditPanelReviews}
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
                    />
                  </NfiField>

                  <label className="flex items-center gap-2 text-sm text-[var(--nfi-text)]">
                    <input
                      type="checkbox"
                      checked={form.markComplete}
                      onChange={(e) => handlePanelReviewChange(panelType, 'markComplete', e.target.checked)}
                      disabled={!canEditPanelReviews}
                    />
                    Mark this panel review as completed
                  </label>

                  {review?.lastUpdatedAt && (
                    <p className="text-xs text-[var(--nfi-text-secondary)]">
                      Last updated {new Date(review.lastUpdatedAt).toLocaleDateString()} by {review?.lastUpdatedBy || 'Internal reviewer'}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <NfiButton
                      onClick={() => handleSavePanelReview(panelType)}
                      disabled={!canEditPanelReviews || savingPanelType === panelType}
                    >
                      {savingPanelType === panelType ? 'Saving...' : `Save ${panelTitle}`}
                    </NfiButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-[var(--nfi-border)] bg-white p-5 space-y-5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-[var(--nfi-text)] break-words">{financialPanelTitle}</h4>
              <p className="text-xs text-[var(--nfi-text-secondary)] break-words">
                {financialAssignment?.panelName || PANEL_ASSIGNMENT_META.financial.defaultPanelName}
              </p>
            </div>
            <NfiBadge tone={getPanelStatusTone(financialPanelStatus)}>{financialPanelStatus}</NfiBadge>
          </div>

          <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-4 py-4 text-sm space-y-1 break-words">
            <p><span className="font-medium text-[var(--nfi-text)]">Assigned reviewer:</span> {getReviewerAssignmentSummary(financialAssignment)}</p>
            <p><span className="font-medium text-[var(--nfi-text)]">Assignment note:</span> {financialAssignment?.notes || 'No assignment note added'}</p>
            <p><span className="font-medium text-[var(--nfi-text)]">Last completed:</span> {financialReview?.completedAt ? new Date(financialReview.completedAt).toLocaleDateString() : 'Pending'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(22rem,1fr)] gap-5 items-start">
            <IncomeEligibilityPanel
              evaluation={incomeEvaluation}
              audience="reviewer"
              title="Financial Review Summary"
            />
            <FinancialReviewArtifactCard context={financialReviewContext} />
          </div>

          <VarianceGovernanceCard context={financialReviewContext} />

          {varianceGovernance.status === 'director_review_required' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <p className="font-semibold">Director review required before final approval</p>
              <p className="mt-1">
                {varianceGovernance.gatingReason}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <FinancialArtifactReadinessCard context={financialReviewContext} />
            <SponsorIntelligenceCard context={financialReviewContext} />
          </div>

          <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] p-5 space-y-4 min-w-0">
            <div>
              <h5 className="font-semibold text-[var(--nfi-text)]">Financial recommendation</h5>
              <p className="text-sm text-[var(--nfi-text-secondary)]">
                Capture the internal financial recommendation, rationale, and funding guidance without changing the current H3/H4 behavior.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NfiField label="Recommendation">
                <select
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={financialForm.decision}
                  onChange={(e) => handlePanelReviewChange('financial', 'decision', e.target.value)}
                  disabled={!canEditPanelReviews}
                >
                  {getPanelDecisionOptions().map((option) => (
                    <option key={option} value={option}>
                      {option === 'Pending' ? 'Pending / Not Reviewed' : option}
                    </option>
                  ))}
                </select>
              </NfiField>

              <NfiField label="Proposed Sponsor Amount">
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={fundingData.proposedSponsorAmount}
                  onChange={(e) => setFundingData({ ...fundingData, proposedSponsorAmount: e.target.value })}
                  placeholder={financialReviewContext.sponsorIntelligence.proposedSponsorAmount?.toString() || 'Enter amount'}
                  disabled={!canEditPanelReviews}
                />
              </NfiField>
            </div>

            <NfiField label="Financial rationale">
              <textarea
                rows={5}
                value={financialForm.remarks}
                onChange={(e) => handlePanelReviewChange('financial', 'remarks', e.target.value)}
                placeholder="Capture financial rationale, exception context, or reviewer judgment"
                disabled={!canEditPanelReviews}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
              />
            </NfiField>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <NfiField label="Program">
                <select
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={fundingData.program}
                  onChange={(e) => setFundingData({ ...fundingData, program: e.target.value })}
                  disabled={!canEditPanelReviews}
                >
                  <option value="">Awaiting recommendation</option>
                  {programOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </NfiField>

              <NfiField label="Campaign">
                <select
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={fundingData.campaign}
                  onChange={(e) => setFundingData({ ...fundingData, campaign: e.target.value })}
                  disabled={!canEditPanelReviews}
                >
                  <option value="">No strong recommendation yet</option>
                  {campaignOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </NfiField>

              <NfiField label="Top-up">
                <select
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={fundingData.isTopUp ? 'Yes' : 'No'}
                  onChange={(e) =>
                    setFundingData({
                      ...fundingData,
                      isTopUp: e.target.value === 'Yes',
                      previousApprovedAmount: e.target.value === 'Yes' ? (fundingData.previousApprovedAmount || topUpPreviousBase) : '',
                      topUpAmount: e.target.value === 'Yes' ? fundingData.topUpAmount : '',
                    })
                  }
                  disabled={!canEditPanelReviews}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </NfiField>
            </div>

            {fundingData.isTopUp && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <NfiField label="Previous Approved Amount">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.previousApprovedAmount || topUpPreviousBase}
                    onChange={(e) => setFundingData({ ...fundingData, previousApprovedAmount: e.target.value })}
                    disabled={!canEditPanelReviews}
                  />
                </NfiField>

                <NfiField label="Top-up Amount">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.topUpAmount}
                    onChange={(e) => setFundingData({ ...fundingData, topUpAmount: e.target.value })}
                    disabled={!canEditPanelReviews}
                  />
                </NfiField>
              </div>
            )}

            <NfiField label="Funding recommendation note">
              <textarea
                rows={4}
                value={fundingData.recommendationNote}
                onChange={(e) => setFundingData({ ...fundingData, recommendationNote: e.target.value })}
                placeholder="Capture the sponsor/program/campaign recommendation note"
                disabled={!canEditPanelReviews}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
              />
            </NfiField>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NfiField label="Missing artifact / blocker note">
                <textarea
                  rows={4}
                  value={fundingData.missingArtifactNote}
                  onChange={(e) => setFundingData({ ...fundingData, missingArtifactNote: e.target.value })}
                  placeholder="Capture missing proof, bill, or settlement blockers"
                  disabled={!canEditPanelReviews}
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
                />
              </NfiField>

              <NfiField label="Manual review / exception note">
                <textarea
                  rows={4}
                  value={fundingData.manualReviewNote}
                  onChange={(e) => setFundingData({ ...fundingData, manualReviewNote: e.target.value })}
                  placeholder="Capture manual review or exception handling note"
                  disabled={!canEditPanelReviews}
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
                />
              </NfiField>
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--nfi-text)]">
              <input
                type="checkbox"
                checked={financialForm.markComplete}
                onChange={(e) => handlePanelReviewChange('financial', 'markComplete', e.target.checked)}
                disabled={!canEditPanelReviews}
              />
              Mark this panel review as completed
            </label>

            {financialReview?.lastUpdatedAt && (
              <p className="text-xs text-[var(--nfi-text-secondary)]">
                Last updated {new Date(financialReview.lastUpdatedAt).toLocaleDateString()} by {financialReview?.lastUpdatedBy || 'Internal reviewer'}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <NfiButton
                onClick={() => handleSavePanelReview('financial')}
                disabled={!canEditPanelReviews || savingPanelType === 'financial'}
              >
                {savingPanelType === 'financial' ? 'Saving...' : `Save ${financialPanelTitle}`}
              </NfiButton>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-[var(--nfi-text)]">Panel Decision</h4>
              <p className="text-sm text-[var(--nfi-text-secondary)]">
                Consolidated state across Clinical, Social, and Financial reviews.
              </p>
            </div>
            <NfiBadge tone={getOverallDecisionTone(computedPanelDecision.overallDecision)}>
              {computedPanelDecision.overallDecision}
            </NfiBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoItem label="Overall Panel Readiness" value={computedPanelDecision.readinessLabel} />
            <InfoItem label="Mixed Recommendations" value={computedPanelDecision.mixedRecommendations ? 'Yes' : 'No'} />
            <InfoItem label="Program" value={workflowExt?.funding?.program || 'Not available'} />
            <InfoItem label="Campaign" value={workflowExt?.funding?.campaign?.campaignName || 'Not available'} />
          </div>

          <NfiField label="Consolidated Remarks">
            <textarea
              rows={3}
              value={consolidatedRemarks}
              onChange={(e) => setConsolidatedRemarks(e.target.value)}
              placeholder="Capture the panel summary, conflicts, or next-step recommendation"
              disabled={!canEditPanelReviews}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none"
            />
          </NfiField>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--nfi-text-secondary)]">
              {computedPanelDecision.lastUpdatedAt
                ? `Last consolidated update ${new Date(computedPanelDecision.lastUpdatedAt).toLocaleDateString()}`
                : 'No consolidated panel note recorded yet'}
            </p>
            {canEditPanelReviews && (
              <NfiButton onClick={handleSaveConsolidation} disabled={savingConsolidation}>
                {savingConsolidation ? 'Saving...' : 'Save Panel Consolidation'}
              </NfiButton>
            )}
          </div>
        </div>

      {caseData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Panel Decision Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[var(--nfi-text-secondary)]">Submitted</p>
              <p className="font-medium text-[var(--nfi-text)]">
                {(caseData as any).submittedAt ? new Date((caseData as any).submittedAt).toLocaleDateString() : 'Not submitted'}
              </p>
            </div>
            <div>
              <p className="text-[var(--nfi-text-secondary)]">Panel Readiness</p>
              <p className="font-medium text-[var(--nfi-text)]">{computedPanelDecision.overallDecision}</p>
            </div>
            <div>
              <p className="text-[var(--nfi-text-secondary)]">Final Decision Date</p>
              <p className="font-medium text-[var(--nfi-text)]">
                {(caseData as any).decisionAt ? new Date((caseData as any).decisionAt).toLocaleDateString() : 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-[var(--nfi-text-secondary)]">Last Updated</p>
              <p className="font-medium text-[var(--nfi-text)]">
                {new Date(caseData.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Panel Decision</h3>
          {canEdit && decision && !isEditing && (
            <NfiButton size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 size={16} className="mr-1" />
              Edit Decision
            </NfiButton>
          )}
        </div>

        {showEditor ? (
          <div className="space-y-4 p-4 border border-[var(--nfi-border)] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NfiField label="Outcome" required>
                <select
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Need_More_Info">Need More Info</option>
                  <option value="Deferred">Deferred</option>
                </select>
              </NfiField>

              {formData.outcome === 'Approved' && (
                <NfiField label="Approved Amount (INR)" required>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.isTopUp ? (totalAfterTopUp?.toString() || '') : formData.approvedAmount}
                    onChange={(e) => setFormData({ ...formData, approvedAmount: e.target.value })}
                    placeholder={fundingData.isTopUp ? 'Derived from top-up fields' : 'Enter amount'}
                    disabled={fundingData.isTopUp}
                  />
                </NfiField>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--nfi-border)] space-y-4">
              <h4 className="font-semibold text-[var(--nfi-text)]">Funding Decision</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="Proposed Sponsor Amount">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.proposedSponsorAmount}
                    onChange={(e) => setFundingData({ ...fundingData, proposedSponsorAmount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </NfiField>

                <NfiField label="Program">
                  <select
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.program}
                    onChange={(e) => setFundingData({ ...fundingData, program: e.target.value })}
                  >
                    <option value="">Select Program</option>
                    {programOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </NfiField>

                <NfiField label="Campaign">
                  <select
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.campaign}
                    onChange={(e) => setFundingData({ ...fundingData, campaign: e.target.value })}
                  >
                    <option value="">Select Campaign</option>
                    {campaignOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </NfiField>

                <NfiField label="Top-up">
                  <select
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                    value={fundingData.isTopUp ? 'Yes' : 'No'}
                    onChange={(e) =>
                      setFundingData({
                        ...fundingData,
                        isTopUp: e.target.value === 'Yes',
                        previousApprovedAmount: e.target.value === 'Yes' ? topUpPreviousBase : '',
                        topUpAmount: e.target.value === 'Yes' ? fundingData.topUpAmount : '',
                      })
                    }
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </NfiField>

                {fundingData.isTopUp && (
                  <NfiField label="Previous Approved Amount">
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-gray-50"
                      value={fundingData.previousApprovedAmount || topUpPreviousBase}
                      readOnly
                    />
                  </NfiField>
                )}

                {fundingData.isTopUp && (
                  <NfiField label="Top-up Amount">
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      value={fundingData.topUpAmount}
                      onChange={(e) => setFundingData({ ...fundingData, topUpAmount: e.target.value })}
                      placeholder="Enter top-up amount"
                    />
                  </NfiField>
                )}

                {fundingData.isTopUp && (
                  <NfiField label="Total Approved Amount">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-gray-50"
                      value={totalAfterTopUp !== undefined ? `INR ${totalAfterTopUp.toLocaleString()}` : 'N/A'}
                      readOnly
                    />
                  </NfiField>
                )}
              </div>
              {formData.outcome !== 'Approved' && (
                <p className="text-xs text-[var(--nfi-text-secondary)]">
                  Funding values are captured now and applied on panel decision submission.
                </p>
              )}
            </div>

            <NfiField label="Decision Notes / Remarks">
              <textarea
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                rows={3}
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Add notes..."
              />
            </NfiField>

            {formData.outcome === 'Rejected' && (
              <div className="pt-4 border-t border-[var(--nfi-border)] space-y-4">
                <h4 className="font-semibold text-[var(--nfi-text)]">Rejection Details</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NfiField label="Reason Category" required>
                    <select
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg"
                      value={rejectionForm.reasonCategory}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, reasonCategory: e.target.value })}
                    >
                      <option value="Medical">Medical</option>
                      <option value="Financial">Financial</option>
                      <option value="Other">Other</option>
                    </select>
                  </NfiField>

                  <NfiField label="Rejection Level" required>
                    <select
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg"
                      value={rejectionForm.rejectionLevel}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, rejectionLevel: e.target.value })}
                    >
                      <option value="NFI">NFI</option>
                      <option value="BRC">BRC</option>
                      <option value="BRRC">BRRC</option>
                      <option value="BGRC">BGRC</option>
                      <option value="BCRC">BCRC</option>
                      <option value="Other">Other</option>
                    </select>
                  </NfiField>

                  <NfiField label="Communication Status" required>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg"
                      value={rejectionForm.communicationStatus}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, communicationStatus: e.target.value })}
                      placeholder="e.g., Email sent, Call made"
                    />
                  </NfiField>

                  <NfiField label="Referring Hospital">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg"
                      value={rejectionForm.referringHospital}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, referringHospital: e.target.value })}
                      placeholder="Optional"
                    />
                  </NfiField>
                </div>

                <NfiField label="Case Summary" required>
                  <textarea
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg"
                    rows={4}
                    value={rejectionForm.caseSummary}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, caseSummary: e.target.value })}
                    placeholder="Provide detailed reason for rejection..."
                  />
                </NfiField>
              </div>
            )}

            {panelFinalizationBlocked && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {varianceGovernance.gatingReason}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <NfiButton onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit Decision'}
              </NfiButton>
              {isEditing && (
                <NfiButton variant="secondary" onClick={() => {
                  setIsEditing(false);
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
                <p className="text-sm text-[var(--nfi-text-secondary)]">Outcome</p>
                <NfiBadge
                  tone={
                    (decision?.outcome || 'Pending') === 'Approved'
                      ? 'success'
                      : (decision?.outcome || 'Pending') === 'Rejected'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {(decision?.outcome || 'Pending').replace('_', ' ')}
                </NfiBadge>
              </div>
              {decision?.approvedAmount !== undefined && decision?.approvedAmount !== null && (
                <div>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Approved Amount</p>
                  <p className="font-semibold text-lg text-[var(--nfi-text)]">INR {Number(decision.approvedAmount).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-[var(--nfi-text-secondary)]">Decision Date</p>
                <p className="font-medium text-[var(--nfi-text)]">
                  {decision?.decisionDate || decision?.decidedAt ? new Date(decision.decisionDate || decision.decidedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {decision?.comments && (
                <div className="md:col-span-2">
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Decision Notes / Remarks</p>
                  <p className="text-[var(--nfi-text)]">{decision.comments}</p>
                </div>
              )}
              <div className="md:col-span-2 pt-2 border-t border-[var(--nfi-border)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem label="Proposed Sponsor Amount" value={toCurrency(workflowExt?.funding?.sponsorQuantification?.proposedAmount)} />
                  <InfoItem label="Program" value={workflowExt?.funding?.program || 'N/A'} />
                  <InfoItem label="Campaign" value={workflowExt?.funding?.campaign?.campaignName || 'N/A'} />
                  <InfoItem label="Top-up" value={workflowExt?.funding?.isTopUp ? 'Yes' : 'No'} />
                  {workflowExt?.funding?.isTopUp && (
                    <InfoItem label="Previous Approved Amount" value={toCurrency(workflowExt?.funding?.previousApprovedAmount)} />
                  )}
                  {workflowExt?.funding?.isTopUp && (
                    <InfoItem label="Top-up Amount" value={toCurrency(workflowExt?.funding?.topUpAmount)} />
                  )}
                  {workflowExt?.funding?.isTopUp && (
                    <InfoItem label="Total Approved Amount" value={toCurrency(workflowExt?.funding?.totalApprovedAmount)} />
                  )}
                </div>
                {(workflowExt?.funding?.recommendationNote || workflowExt?.funding?.manualReviewNote || workflowExt?.funding?.blockerNote) && (
                  <div className="mt-4 space-y-2 text-sm">
                    {workflowExt?.funding?.recommendationNote && (
                      <p className="text-[var(--nfi-text)]"><span className="font-medium">Funding recommendation note:</span> {workflowExt.funding.recommendationNote}</p>
                    )}
                    {workflowExt?.funding?.manualReviewNote && (
                      <p className="text-[var(--nfi-text)]"><span className="font-medium">Manual review / exception note:</span> {workflowExt.funding.manualReviewNote}</p>
                    )}
                    {workflowExt?.funding?.blockerNote && (
                      <p className="text-[var(--nfi-text)]"><span className="font-medium">Missing artifact / blocker note:</span> {workflowExt.funding.blockerNote}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {installments.length > 0 && (
        <div className="p-4 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Legacy Installment Records</h3>
              <p className="text-sm text-[var(--nfi-text-secondary)]">Hidden by default for MVP. Expand only when compatibility details are needed.</p>
            </div>
            <NfiButton
              size="sm"
              variant="secondary"
              onClick={() => setShowLegacyInstallments(prev => !prev)}
            >
              {showLegacyInstallments ? 'Hide' : 'Show'}
            </NfiButton>
          </div>
          {showLegacyInstallments && (
            <div className="space-y-3 mt-4">
              {installments.map((inst: any) => (
                <div key={inst.installmentId} className="flex items-center justify-between p-4 border border-[var(--nfi-border)] rounded-lg bg-white">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--nfi-text)]">{inst.label}</p>
                    <p className="text-sm text-[var(--nfi-text-secondary)]">
                      INR {Number(inst.amount).toLocaleString()}
                      {inst.dueDate && `${CASE_SUBTITLE_SEPARATOR}Due: ${new Date(inst.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <NfiBadge tone={inst.status === 'Paid' ? 'success' : inst.status === 'Requested' ? 'warning' : 'neutral'}>
                    {inst.status}
                  </NfiBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {rejectionDetails && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Rejection Details</h3>
          <div className="p-4 border border-[var(--nfi-border)] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Reason Category" value={rejectionDetails.reasonCategory} />
              <InfoItem label="Rejection Level" value={rejectionDetails.rejectionLevel} />
              <InfoItem label="Communication Status" value={rejectionDetails.communicationStatus} />
              {rejectionDetails.referringHospital && (
                <InfoItem label="Referring Hospital" value={rejectionDetails.referringHospital} />
              )}
              <div className="md:col-span-2">
                <InfoItem label="Case Summary" value={rejectionDetails.caseSummary} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function InstallmentsTab({ caseId, caseData, onUpdate }: { caseId: string; caseData: any; onUpdate: () => void }) {
  const authState = getAuthState();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const { t } = useTranslation();
  const [installments, setInstallments] = useState<FundingInstallment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    amount: '',
    plannedDate: '',
    paymentMode: 'BankTransfer',
    transactionRef: '',
    notes: '',
  });

  const canEdit = authState.activeRole === 'accounts' || authState.activeRole === 'admin';
  const isApproved = caseData?.caseStatus === 'Approved' || caseData?.caseStatus === 'Closed';

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [instalments, summaryData] = await Promise.all([
        provider.listInstallments(caseId),
        provider.getInstallmentSummary(caseId),
      ]);
      setInstallments(instalments);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading installments:', error);
      showToast('Failed to load installments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstallment = async () => {
    if (!formData.label || !formData.amount) {
      showToast('Label and amount are required', 'error');
      return;
    }

    try {
      const payload = {
        label: formData.label,
        amount: parseFloat(formData.amount),
        plannedDate: formData.plannedDate,
        paymentMode: formData.paymentMode as any,
        transactionRef: formData.transactionRef,
        notes: formData.notes,
        status: 'Scheduled' as const,
        updatedBy: authState.activeUser?.userId || 'unknown',
      };

      if (editingId) {
        await provider.updateInstallment(editingId, payload);
        showToast('Installment updated', 'success');
      } else {
        await provider.createInstallment(caseId, payload);
        showToast('Installment created', 'success');
      }

      setShowAddModal(false);
      setEditingId(null);
      setFormData({ label: '', amount: '', plannedDate: '', paymentMode: 'BankTransfer', transactionRef: '', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Error saving installment:', error);
      showToast('Failed to save installment', 'error');
    }
  };

  const handleStatusChange = async (installmentId: string, newStatus: InstallmentStatus) => {
    try {
      const patch: any = { status: newStatus };

      if (newStatus === 'Requested') {
        patch.requestedDate = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'Disbursed') {
        patch.paidDate = new Date().toISOString().split('T')[0];
      }

      await provider.updateInstallment(installmentId, patch);
      await loadData();
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (installmentId: string) => {
    if (!confirm('Are you sure you want to delete this installment?')) return;
    try {
      await provider.deleteInstallment(installmentId);
      await loadData();
      showToast('Installment deleted', 'success');
    } catch (error) {
      console.error('Error deleting installment:', error);
      showToast('Failed to delete installment', 'error');
    }
  };

  if (!isApproved) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--nfi-text-secondary)]">Installments tab is only available for approved cases</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-6">Loading installments...</div>;
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-[var(--nfi-text-secondary)]">Approved Amount</p>
            <p className="text-2xl font-bold text-[var(--nfi-primary)]">₹{summary.totalApproved.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-[var(--nfi-text-secondary)]">Total Planned</p>
            <p className="text-2xl font-bold text-purple-600">₹{summary.totalPlanned.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-[var(--nfi-text-secondary)]">Total Disbursed</p>
            <p className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-[var(--nfi-text-secondary)]">Balance</p>
            <p className="text-2xl font-bold text-orange-600">₹{summary.balance.toLocaleString()}</p>
          </div>
        </div>
      )}

      {summary && summary.totalPlanned !== summary.totalApproved && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Total planned amount (₹{summary.totalPlanned.toLocaleString()}) differs from approved amount (₹{summary.totalApproved.toLocaleString()})
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Installment Plan</h3>
          {canEdit && (
            <NfiButton size="sm" onClick={() => { setEditingId(null); setFormData({ label: '', amount: '', plannedDate: '', paymentMode: 'BankTransfer', transactionRef: '', notes: '' }); setShowAddModal(true); }}>
              Add Installment
            </NfiButton>
          )}
        </div>

        {installments.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[var(--nfi-border)] rounded-lg">
            <p className="text-[var(--nfi-text-secondary)]">No installments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Label</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Planned Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Payment Mode</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Txn Ref</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst) => (
                  <tr key={inst.installmentId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{inst.label}</td>
                    <td className="py-3 px-4 text-right text-[var(--nfi-text)]">₹{inst.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <select
                        value={inst.status}
                        onChange={(e) => handleStatusChange(inst.installmentId, e.target.value as InstallmentStatus)}
                        disabled={!canEdit}
                        className="px-2 py-1 border border-[var(--nfi-border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Requested">Requested</option>
                        <option value="Disbursed">Disbursed</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">{inst.plannedDate}</td>
                    <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">{inst.paymentMode || '-'}</td>
                    <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">{inst.transactionRef || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {canEdit && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleDelete(inst.installmentId)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-4">{editingId ? 'Edit Installment' : 'Add Installment'}</h3>
            <div className="space-y-4">
              <NfiField label="Label" required>
                <input type="text" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" placeholder="e.g., Installment 1" />
              </NfiField>
              <NfiField label="Amount (₹)" required>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" placeholder="0" />
              </NfiField>
              <NfiField label="Planned Date">
                <input type="date" value={formData.plannedDate} onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" />
              </NfiField>
              <NfiField label="Payment Mode">
                <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]">
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </NfiField>
              <NfiField label="Transaction Reference">
                <input type="text" value={formData.transactionRef} onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]" placeholder="e.g., TXN-2026-001" />
              </NfiField>
              <NfiField label="Notes">
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)] resize-none" rows={3} placeholder="Any additional notes..." />
              </NfiField>
            </div>
            <div className="flex gap-3 mt-6">
              <NfiButton variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</NfiButton>
              <NfiButton onClick={handleAddInstallment}>Save Installment</NfiButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FollowupsTab({ caseId }: { caseId: string }) {
  const authState = getAuthState();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [milestones, setMilestones] = useState<FollowupMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMilestone, setSelectedMilestone] = useState<FollowupMilestone | null>(null);

  const canEdit = authState.activeRole === 'beni_volunteer' || authState.activeRole === 'admin';

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const milestonesData = await provider.ensureFollowupMilestones(caseId, new Date().toISOString().split('T')[0]);
      setMilestones(sortMilestonesBySourceOrder(milestonesData));
    } catch (error) {
      console.error('Error loading follow-ups:', error);
      showToast('Failed to load follow-ups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFollowupDone = async (milestoneMonths: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await provider.setFollowupDate(caseId, milestoneMonths, today);
      await logAuditEvent({
        caseId,
        action: `Saved ${getFollowupAuditLabel(milestoneMonths)}`,
        notes: `Follow-up completed on ${today}.`,
      });
      await loadData();
      showToast('Follow-up marked as complete', 'success');
    } catch (error) {
      console.error('Error marking follow-up:', error);
      showToast('Failed to mark follow-up', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-6">Loading follow-ups...</div>;
  }

  const completedCount = milestones.filter(m => m.status === 'Completed').length;
  const nextDue = milestones.find(m => m.status === 'Due' || m.status === 'Overdue');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-[var(--nfi-text-secondary)]">Completed Milestones</p>
          <p className="text-2xl font-bold text-blue-600">{completedCount}/{milestones.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-[var(--nfi-text-secondary)]">Next Due</p>
          <p className="text-lg font-bold text-purple-600">{nextDue ? getFollowupQuestionnaire(nextDue.milestoneMonths).shortLabel : 'None'}</p>
          {nextDue && <p className="text-xs text-purple-500">{formatDateDMY(nextDue.dueDate)}</p>}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-[var(--nfi-text-secondary)]">Progress</p>
          <div className="mt-2 bg-green-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{width: `${(completedCount / milestones.length) * 100}%`}} />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Milestones</h3>
          <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
            Each milestone opens its own questionnaire. Questions change by milestone instead of reusing a generic form.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {milestones.map((milestone) => {
            const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
            const isCompleted = milestone.status === 'Completed' || !!milestone.followupDate;
            return (
              <div key={milestone.milestoneId} className="rounded-xl border border-[var(--nfi-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[var(--nfi-text)]">{questionnaire.milestoneLabel}</h4>
                    <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">{questionnaire.sectionTitle}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isCompleted ? 'bg-green-100 text-green-700' :
                    milestone.status === 'Due' ? 'bg-red-100 text-red-700' :
                    milestone.status === 'Overdue' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {isCompleted ? 'Completed' : milestone.status}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[var(--nfi-text-secondary)]">
                  <p>Due date: {formatDateDMY(milestone.dueDate)}</p>
                  <p>Follow-up date: {milestone.followupDate ? formatDateDMY(milestone.followupDate) : 'Not recorded'}</p>
                  <p>Questions: {questionnaire.questions.length}</p>
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-[var(--nfi-text-secondary)]">
                  {questionnaire.questions[0]?.label}
                </div>
                <div className="mt-4 flex gap-3">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedMilestone(milestone);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Open Questionnaire
                      </button>
                      {milestone.status !== 'Completed' && (
                        <button onClick={() => handleMarkFollowupDone(milestone.milestoneMonths)} className="text-green-600 hover:text-green-700 text-sm">Mark Done</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedMilestone && (
        <CompactMilestoneModal
          caseId={caseId}
          milestone={selectedMilestone}
          title={getFollowupQuestionnaire(selectedMilestone.milestoneMonths).milestoneLabel}
          mode="followup"
          onSaved={loadData}
          onClose={() => setSelectedMilestone(null)}
        />
      )}
    </div>
  );
}

function getIncomeAudience(role: UserRole | null): 'hospital' | 'internal' | 'reviewer' {
  if (role === 'hospital_spoc') return 'hospital';
  if (role === 'committee_member' || role === 'clinical' || role === 'clinical_reviewer' || role === 'leadership') {
    return 'reviewer';
  }
  return 'internal';
}

function AuditTab({ events, workflowEvents }: { events: AuditEvent[]; workflowEvents: CaseWorkflowEvent[] }) {
  const timeline = [
    ...workflowEvents.map((event) => ({
      id: event.eventId,
      timestamp: event.changedAt,
      title: `${event.fromStatus || 'Start'} -> ${event.toStatus}`,
      actor: getAuditActorDisplayName(event.changedBy, event.changedByRole as UserRole | null),
      role: event.changedByRole ? getRoleLabel(event.changedByRole as UserRole) : 'Workflow',
      note: event.reason,
      source: remapCommitteeLabel(event.source, 'Workflow'),
    })),
    ...events.map((event) => ({
      id: event.eventId,
      timestamp: event.timestamp,
      title: event.action,
      actor: getAuditActorDisplayName(event.userId, event.userRole),
      role: getRoleLabel(event.userRole),
      note: event.notes,
      source: 'Audit',
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (timeline.length === 0) {
    return <p className="text-sm text-[var(--nfi-text-secondary)]">No workflow history available yet.</p>;
  }

  return (
    <div className="space-y-4">
      {timeline.map((event) => (
        <div key={event.id} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-0">
          <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-[var(--nfi-primary)]" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-[var(--nfi-text)]">{event.title}</p>
            </div>
            <p className="text-sm text-[var(--nfi-text-secondary)] mb-1">
              {event.actor} • {event.role}
            </p>
            <p className="text-xs text-[var(--nfi-text-secondary)] mb-2">
              {formatDateTimeFriendly(event.timestamp)} • {remapCommitteeLabel(event.source, 'Workflow')}
            </p>
            {event.note && (
              <p className="text-sm text-[var(--nfi-text)] mt-2 p-3 bg-gray-50 rounded">{event.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}




