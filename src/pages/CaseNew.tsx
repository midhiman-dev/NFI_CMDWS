import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiButton } from '../components/design-system/NfiButton';
import { NfiField } from '../components/design-system/NfiField';
import { IntakeFormsTab } from '../components/case-tabs/IntakeFormsTab';
import { DocumentsTab } from './CaseDetail';
import { ProcessType, CaseStatus, Hospital, CaseSubmitReadiness } from '../types';
import { ArrowLeft, ArrowRight, Save, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { getAuthState } from '../utils/auth';
import { normalizeHospitalId } from '../utils/roleAccess';
import { useToast } from '../components/design-system/Toast';
import { useAppContext } from '../App';
import type { DocumentWithTemplate } from '../data/providers/DataProvider';
import type { CaseWorkflowEvent } from '../utils/caseWorkflow';
import { getHospitalDisplayStatus, getLatestReturnedEvent, listCaseWorkflowEvents } from '../utils/caseWorkflow';
import { formatDateTimeFriendly } from '../utils/dateFormat';
import { translateGender, translateLiteral, translateProcessType } from '../i18n/helpers';
import { intakeService } from '../services/intakeService';
import { formatBabyDisplayName } from '../utils/casePresentation';

const TOTAL_STEPS = 5;
const STEP_TITLES = [
  'Basic Registration',
  'Fund Application',
  'Interim Summary',
  'Documents',
  'Review & Submit',
] as const;

const DEFAULT_CITY_OPTIONS = [
  'Ahmedabad',
  'Bangalore',
  'Chennai',
  'Delhi',
  'Hyderabad',
  'Kolkata',
  'Mumbai',
  'Pune',
];

interface CaseFormData {
  processType: ProcessType | '';
  hospitalId: string;
  admissionDate: string;
  intakeDate: string;
  beneficiaryNo: string;
  beneficiaryName: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dob: string;
  fatherName: string;
  motherName: string;
  fatherPhone: string;
  motherPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  diagnosis: string;
  summary: string;
  estimateAmount: string;
}

interface AttentionItem {
  label: string;
  status: 'Missing' | 'Replace' | 'Needs update' | 'Incomplete';
  group: 'documents' | 'fund' | 'interim' | 'other';
}

function getProcessTypeLabel(processType: ProcessType | ''): string {
  return translateProcessType(processType);
}

function buildDerivedBabyName(motherName: string): string {
  return formatBabyDisplayName(motherName, '');
}

function normalizeDateForInput(value?: string | null): string {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value;
}

export function CaseNew() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { caseId: routeCaseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { provider, mode } = useAppContext();
  const authState = getAuthState();
  const isHospitalSpoc = authState.activeRole === 'hospital_spoc';
  const scopedHospitalId = normalizeHospitalId(authState.activeUser?.hospitalId) || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intakeDateError, setIntakeDateError] = useState('');
  const [processingTypeLoading, setProcessingTypeLoading] = useState(false);
  const [processMappingMissing, setProcessMappingMissing] = useState(false);
  const [readiness, setReadiness] = useState<CaseSubmitReadiness | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentWithTemplate[]>([]);
  const [caseDisplayStatus, setCaseDisplayStatus] = useState<CaseStatus | null>(null);
  const [latestReturnEvent, setLatestReturnEvent] = useState<CaseWorkflowEvent | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [documentStats, setDocumentStats] = useState<{ total: number; uploaded: number; verified: number }>({
    total: 0,
    uploaded: 0,
    verified: 0,
  });

  const [formData, setFormData] = useState<CaseFormData>({
    processType: '',
    hospitalId: scopedHospitalId,
    admissionDate: '',
    intakeDate: new Date().toISOString().split('T')[0],
    beneficiaryNo: '',
    beneficiaryName: '',
    gender: '',
    dob: '',
    fatherName: '',
    motherName: '',
    fatherPhone: '',
    motherPhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    diagnosis: '',
    summary: '',
    estimateAmount: '',
  });

  const derivedHospitalBabyName = isHospitalSpoc
    ? buildDerivedBabyName(formData.motherName)
    : formData.beneficiaryName;
  const isResumedDraft = Boolean(routeCaseId);
  const isReturnedCase = isResumedDraft && caseDisplayStatus === 'Returned';
  const isRejectedCase = isResumedDraft && caseDisplayStatus === 'Rejected';

  const loadReturnedAttention = async (caseId: string, returnEvent: CaseWorkflowEvent | null) => {
    setAttentionLoading(true);
    try {
      const [submitReadiness, docs] = await Promise.all([
        provider.getCaseSubmitReadiness(caseId),
        provider.listCaseDocuments(caseId),
      ]);
      const nextItems: AttentionItem[] = [];

      submitReadiness.missingDocuments.forEach((docType) => {
        nextItems.push({ label: docType, status: 'Missing', group: 'documents' });
      });
      docs
        .filter((d) => d.status === 'Rejected')
        .forEach((d) => nextItems.push({ label: d.docType, status: 'Replace', group: 'documents' }));
      submitReadiness.missingSections.forEach((sectionLabel) => {
        if (sectionLabel.startsWith('Fund Application -> ')) {
          nextItems.push({
            label: sectionLabel.replace('Fund Application -> ', ''),
            status: 'Incomplete',
            group: 'fund',
          });
          return;
        }
        if (sectionLabel.startsWith('Interim Summary -> ')) {
          nextItems.push({
            label: sectionLabel.replace('Interim Summary -> ', ''),
            status: 'Incomplete',
            group: 'interim',
          });
          return;
        }
        nextItems.push({ label: sectionLabel, status: 'Incomplete', group: 'other' });
      });
      setAttentionItems(nextItems);
    } catch (error) {
      console.error('Failed to load returned case attention list:', error);
      setAttentionItems([]);
    } finally {
      setAttentionLoading(false);
    }
  };

  useEffect(() => {
    const loadHospitals = async () => {
      setHospitalsLoading(true);
      try {
        const data = await provider.getHospitals();
        setHospitals(data.filter(h => h.isActive));
      } catch (error) {
        console.error('Failed to load hospitals:', error);
        setHospitals([]);
      } finally {
        setHospitalsLoading(false);
      }
    };
    loadHospitals();
  }, [provider]);

  useEffect(() => {
    if (isHospitalSpoc && scopedHospitalId && formData.hospitalId !== scopedHospitalId) {
      setFormData((prev) => ({ ...prev, hospitalId: scopedHospitalId }));
    }
  }, [isHospitalSpoc, scopedHospitalId, formData.hospitalId]);

  useEffect(() => {
    const deriveProcessType = async () => {
      if (!formData.hospitalId) {
        setFormData((prev) => ({ ...prev, processType: '' }));
        setProcessMappingMissing(isHospitalSpoc);
        return;
      }

      setProcessingTypeLoading(true);
      try {
        const processType = await provider.getHospitalProcessType(formData.hospitalId);
        if (processType) {
          setFormData((prev) => ({ ...prev, processType }));
          setProcessMappingMissing(false);
        } else {
          setFormData((prev) => ({ ...prev, processType: '' }));
          setProcessMappingMissing(true);
        }
      } catch (error) {
        console.error('Failed to derive process type:', error);
        setFormData((prev) => ({ ...prev, processType: '' }));
        setProcessMappingMissing(true);
      } finally {
        setProcessingTypeLoading(false);
      }
    };

    deriveProcessType();
  }, [formData.hospitalId, provider, isHospitalSpoc]);

  useEffect(() => {
    if (!isHospitalSpoc) return;
    const nextName = buildDerivedBabyName(formData.motherName);
    if (formData.beneficiaryName !== nextName) {
      setFormData((prev) => ({ ...prev, beneficiaryName: nextName }));
    }
  }, [isHospitalSpoc, formData.motherName, formData.beneficiaryName]);

  useEffect(() => {
    if (!routeCaseId) return;
    let cancelled = false;

    const loadExistingDraft = async () => {
      try {
        const [caseInfo, beneficiary, family, clinical, intakeData] = await Promise.all([
          provider.getCaseById(routeCaseId),
          provider.getBeneficiary(routeCaseId).catch(() => null),
          provider.getFamily(routeCaseId).catch(() => null),
          provider.getClinicalDetails(routeCaseId).catch(() => null),
          intakeService.loadIntakeForCase(routeCaseId).catch(() => ({ fundApplication: undefined, interimSummary: undefined })),
        ]);

        if (!caseInfo || cancelled) return;

        const workflowEvents = listCaseWorkflowEvents(routeCaseId);
        const resolvedDisplayStatus = getHospitalDisplayStatus(caseInfo.caseStatus, workflowEvents);
        const resolvedReturn = getLatestReturnedEvent(workflowEvents);
        setCaseDisplayStatus(resolvedDisplayStatus);
        setLatestReturnEvent(resolvedReturn);

        setCreatedCaseId(routeCaseId);
        setFormData((prev) => ({
          ...prev,
          hospitalId: normalizeHospitalId(caseInfo.hospitalId) || prev.hospitalId,
          processType: caseInfo.processType || prev.processType,
          intakeDate: normalizeDateForInput(caseInfo.intakeDate) || prev.intakeDate,
          admissionDate: normalizeDateForInput(beneficiary?.admissionDate || clinical?.admissionDate) || prev.admissionDate,
          beneficiaryNo: beneficiary?.beneficiaryNo || caseInfo.beneficiaryNo || prev.beneficiaryNo,
          beneficiaryName: beneficiary?.beneficiaryName || caseInfo.childName || prev.beneficiaryName,
          dob: normalizeDateForInput(beneficiary?.dob) || prev.dob,
          gender: beneficiary?.gender || prev.gender,
          fatherName: family?.fatherName || prev.fatherName,
          motherName: family?.motherName || prev.motherName,
          fatherPhone: intakeData.fundApplication?.parentsFamilySection?.fatherContactNo || family?.phone || prev.fatherPhone,
          motherPhone: intakeData.fundApplication?.parentsFamilySection?.motherContactNo || family?.phone || prev.motherPhone,
          address: family?.address || prev.address,
          city: family?.city || prev.city,
          state: family?.state || prev.state,
          pincode: family?.pincode || prev.pincode,
        }));

        const stepFromQuery = Number(searchParams.get('step') || '');
        if (!Number.isNaN(stepFromQuery) && stepFromQuery >= 1 && stepFromQuery <= TOTAL_STEPS) {
          setCurrentStep(stepFromQuery);
        }

        if (resolvedDisplayStatus === 'Returned') {
          await loadReturnedAttention(routeCaseId, resolvedReturn);
        } else {
          setAttentionItems([]);
        }
      } catch (error) {
        console.error('Failed to load draft for wizard:', error);
        showToast('Unable to load this draft in wizard mode.', 'error');
      }
    };

    loadExistingDraft();
    return () => { cancelled = true; };
  }, [routeCaseId, provider, searchParams, showToast]);

  const persistRegistrationDetails = async (caseId: string) => {
    const resolvedBabyName = isHospitalSpoc
      ? buildDerivedBabyName(formData.motherName)
      : formData.beneficiaryName;
    const intakeData = await intakeService.loadIntakeForCase(caseId).catch(() => ({
      fundApplication: undefined,
      interimSummary: undefined,
    }));

    await Promise.all([
      provider.upsertBeneficiary(caseId, {
        beneficiaryNo: formData.beneficiaryNo || undefined,
        beneficiaryName: resolvedBabyName || undefined,
        dob: formData.dob || undefined,
        gender: (formData.gender || undefined) as 'Male' | 'Female' | 'Other' | undefined,
        admissionDate: formData.admissionDate || undefined,
      }),
      provider.upsertFamily(caseId, {
        fatherName: formData.fatherName || undefined,
        motherName: formData.motherName || undefined,
        phone: formData.motherPhone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        pincode: formData.pincode || undefined,
      }),
      provider.upsertClinical(caseId, {
        admissionDate: formData.admissionDate || undefined,
      }),
      intakeService.saveIntakeSection(caseId, 'fundApp', {
        ...(intakeData.fundApplication || {}),
        parentsFamilySection: {
          ...(intakeData.fundApplication?.parentsFamilySection || {}),
          fatherName: formData.fatherName || undefined,
          motherName: formData.motherName || undefined,
          fatherContactNo: formData.fatherPhone || undefined,
          motherContactNo: formData.motherPhone || undefined,
        },
      }),
    ]);
  };

  const refreshDocuments = async (caseId: string) => {
    const docs = await provider.listCaseDocuments(caseId);
    setDocuments(docs);
    const uploaded = docs.filter((d) => d.status === 'Uploaded' || d.status === 'Verified').length;
    const verified = docs.filter((d) => d.status === 'Verified').length;
    setDocumentStats({ total: docs.length, uploaded, verified });
  };

  useEffect(() => {
    if (currentStep !== 4 || !createdCaseId) return;
    let cancelled = false;

    const loadDocuments = async () => {
      try {
        const docs = await provider.listCaseDocuments(createdCaseId);
        if (cancelled) return;
        setDocuments(docs);
        const uploaded = docs.filter((d) => d.status === 'Uploaded' || d.status === 'Verified').length;
        const verified = docs.filter((d) => d.status === 'Verified').length;
        setDocumentStats({ total: docs.length, uploaded, verified });
      } catch (error) {
        console.error('Failed to load document checklist:', error);
      }
    };

    loadDocuments();
    return () => { cancelled = true; };
  }, [currentStep, createdCaseId, provider]);

  useEffect(() => {
    if (currentStep !== 5 || !createdCaseId) return;
    let cancelled = false;

    const loadReview = async () => {
      setReviewLoading(true);
      try {
        const [submitReadiness, docs] = await Promise.all([
          provider.getCaseSubmitReadiness(createdCaseId),
          provider.listCaseDocuments(createdCaseId),
        ]);
        if (cancelled) return;
        setReadiness(submitReadiness);

        const uploaded = docs.filter((d) => d.status === 'Uploaded' || d.status === 'Verified').length;
        const verified = docs.filter((d) => d.status === 'Verified').length;
        setDocumentStats({ total: docs.length, uploaded, verified });
      } catch (error) {
        console.error('Failed to load submit readiness:', error);
      } finally {
        if (!cancelled) {
          setReviewLoading(false);
        }
      }
    };

    loadReview();
    return () => { cancelled = true; };
  }, [currentStep, createdCaseId, provider]);

  const cityOptions = useMemo(() => {
    const citySet = new Set<string>(DEFAULT_CITY_OPTIONS);
    hospitals.forEach((h) => {
      if (h.city) citySet.add(h.city);
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [hospitals]);

  const selectedHospital = hospitals.find((h) => normalizeHospitalId(h.hospitalId) === normalizeHospitalId(formData.hospitalId));

  const updateField = (field: keyof CaseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'admissionDate' || field === 'intakeDate') {
      const newData = field === 'admissionDate'
        ? { ...formData, admissionDate: value }
        : { ...formData, intakeDate: value };

      if (newData.admissionDate && newData.intakeDate && newData.intakeDate < newData.admissionDate) {
        setIntakeDateError(t('wizard.intakeBeforeAdmission'));
      } else {
        setIntakeDateError('');
      }
    }
  };

  const validateStep1 = () => {
    if (!formData.fatherPhone.trim()) {
      showToast('Father phone number is required.', 'error');
      return false;
    }

    if (!formData.motherPhone.trim()) {
      showToast('Mother phone number is required.', 'error');
      return false;
    }

    const required: Array<keyof CaseFormData> = [
      'hospitalId',
      'processType',
      'beneficiaryName',
      'dob',
      'gender',
      'fatherName',
      'motherName',
      'fatherPhone',
      'motherPhone',
      'city',
      'admissionDate',
      'intakeDate',
    ];

    const missing = required.filter((field) => !formData[field]);
    if (missing.length > 0) {
      if (processMappingMissing) {
        showToast(t('wizard.processSetupMissing'), 'error');
      } else {
        showToast(t('wizard.completeRequiredFields'), 'error');
      }
      return false;
    }

    if (formData.intakeDate < formData.admissionDate) {
      showToast(t('wizard.intakeBeforeAdmission'), 'error');
      return false;
    }

    return true;
  };

  const validateForFinalSubmit = () => {
    if (!validateStep1()) return false;

    if (!formData.fatherName.trim()) {
      showToast(t('wizard.fatherRequiredFinal'), 'error');
      return false;
    }

    if (!formData.fatherPhone.trim()) {
      showToast('Father phone number is required before final submission.', 'error');
      return false;
    }

    if (!formData.motherPhone.trim()) {
      showToast('Mother phone number is required before final submission.', 'error');
      return false;
    }

    if (!readiness) {
      showToast(t('wizard.readinessLoading'), 'error');
      return false;
    }

    if (!readiness.canSubmit) {
      showToast(t('wizard.completeIntakeDocs'), 'error');
      return false;
    }

    return true;
  };

  const getTimingWarnings = () => {
    const warnings: string[] = [];

    if (formData.processType === 'BCRC' && formData.admissionDate) {
      const admissionDate = new Date(formData.admissionDate);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > 30) {
        warnings.push(`BCRC case is ${daysDiff} days after admission. Final documents expected within 72 hours of discharge.`);
      } else if (daysDiff > 2) {
        warnings.push(`BCRC case is ${daysDiff} days after admission. Please ensure timely documentation.`);
      }
    }

    return warnings;
  };

  const saveCase = async (status: CaseStatus) => {
    setSaving(true);
    try {
      const newCase = await provider.createCase({
        processType: formData.processType as ProcessType,
        hospitalId: formData.hospitalId,
        admissionDate: formData.admissionDate,
        intakeDate: formData.intakeDate,
        caseStatus: status,
        beneficiaryNo: formData.beneficiaryNo || undefined,
        beneficiaryName: (isHospitalSpoc ? buildDerivedBabyName(formData.motherName) : formData.beneficiaryName) || undefined,
        gender: (formData.gender || undefined) as 'Male' | 'Female' | 'Other' | undefined,
        dob: formData.dob || undefined,
        fatherName: formData.fatherName || undefined,
        motherName: formData.motherName || undefined,
        phone: formData.motherPhone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        pincode: formData.pincode || undefined,
        diagnosis: formData.diagnosis || undefined,
        summary: formData.summary || undefined,
        estimateAmount: formData.estimateAmount ? parseFloat(formData.estimateAmount) : undefined,
        createdBy: authState.activeUser?.userId || 'unknown',
      });

      await persistRegistrationDetails(newCase.caseId);

      return newCase;
    } finally {
      setSaving(false);
    }
  };

  const createDraftCase = async () => {
    if (createdCaseId) return true;
    if (!validateStep1()) return false;

    setSaving(true);
    try {
      const newCase = await saveCase('Draft');
      setCreatedCaseId(newCase.caseId);
      return true;
    } catch (error) {
      console.error('Failed to create draft case:', error);
      showToast('Failed to create case. Please try again.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!validateStep1()) return;

    try {
      if (createdCaseId) {
        await persistRegistrationDetails(createdCaseId);
        showToast('Draft updated. Continue in this wizard.', 'success');
        return;
      }

      const newCase = await saveCase('Draft');
      setCreatedCaseId(newCase.caseId);
      showToast('Case saved as draft', 'success');
    } catch (error) {
      console.error('Failed to save draft:', error);
      showToast('Failed to save case. Please try again.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!createdCaseId) {
      showToast('Create a draft case first to submit.', 'error');
      return;
    }

    if (!validateForFinalSubmit()) return;

    setSaving(true);
    try {
      await persistRegistrationDetails(createdCaseId);
      await provider.updateCaseStatus(createdCaseId, 'Submitted');
      showToast(isReturnedCase ? 'Case resubmitted successfully' : 'Case submitted successfully', 'success');
      navigate('/cases');
    } catch (error) {
      console.error('Failed to submit case:', error);
      showToast('Failed to submit case. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const success = await createDraftCase();
      if (!success) return;
    }

    setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const handlePrev = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const warnings = getTimingWarnings();

  if (isHospitalSpoc && processingTypeLoading && !formData.processType) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <NfiCard>
            <div className="flex items-center gap-3 text-[var(--nfi-text-secondary)]">
              <Loader2 size={18} className="animate-spin" />
              Resolving your hospital process setup...
            </div>
          </NfiCard>
        </div>
      </Layout>
    );
  }

  if (isHospitalSpoc && processMappingMissing) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-4">
          <NfiCard className="bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-700 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-yellow-900">Hospital setup required</h2>
                <p className="text-sm text-yellow-800 mt-1">
                  Your hospital does not have an active process mapping yet. Please ask NFI Admin to configure it in
                  Admin - Hospital Process Map before creating a new case.
                </p>
              </div>
            </div>
          </NfiCard>
          <NfiButton variant="secondary" onClick={() => navigate('/cases')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Cases
          </NfiButton>
        </div>
      </Layout>
    );
  }

  if (isRejectedCase) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-4">
          <NfiCard className="bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-700 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Rejected case is read-only</h2>
                <p className="text-sm text-red-800 mt-1">
                  This case was rejected and cannot be edited in the hospital wizard. Open the case detail page to review the rejection outcome and notes.
                </p>
              </div>
            </div>
          </NfiCard>
          <NfiButton variant="secondary" onClick={() => navigate(`/cases/${routeCaseId}`)}>
            <ArrowLeft size={16} className="mr-2" />
            Open Case Detail
          </NfiButton>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/cases')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">
              {isReturnedCase ? 'Returned Case' : isResumedDraft ? 'Draft Case' : 'New Case'}
            </h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Step {currentStep} of {TOTAL_STEPS}: {STEP_TITLES[currentStep - 1]}</p>
          </div>
        </div>

        {isReturnedCase && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
            <h2 className="text-base font-semibold text-amber-900">This case was returned for updates</h2>
            {latestReturnEvent?.reason && (
              <p className="text-sm text-amber-900"><span className="font-medium">Reason:</span> {latestReturnEvent.reason}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-amber-800">
              <p><span className="font-medium">{t('common.returnedBy')}:</span> {latestReturnEvent?.changedBy || 'N/A'}</p>
              <p><span className="font-medium">{t('common.when')}:</span> {formatDateTimeFriendly(latestReturnEvent?.changedAt)}</p>
              <p><span className="font-medium">{t('common.stage')}:</span> {latestReturnEvent?.source || 'Verification'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900 mb-2">{t('wizard.needsAttention')}</p>
              {attentionLoading ? (
                <p className="text-sm text-amber-800">{t('wizard.loadingCorrections')}</p>
              ) : attentionItems.length === 0 ? (
                <p className="text-sm text-amber-800">No specific item-level issues were found. Review the return reason and verify all sections before resubmission.</p>
              ) : (
                <div className="space-y-4">
                  {latestReturnEvent?.reason && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t('wizard.returnReason')}</h3>
                      <p className="text-sm text-amber-900">{latestReturnEvent.reason}</p>
                    </div>
                  )}

                  {(['documents', 'fund', 'interim', 'other'] as const).map((group) => {
                    const groupItems = attentionItems.filter((item) => item.group === group);
                    if (groupItems.length === 0) return null;
                    const heading =
                      group === 'documents'
                        ? t('wizard.missingDocsGroup')
                        : group === 'fund'
                        ? t('wizard.incompleteFundGroup')
                        : group === 'interim'
                        ? t('wizard.incompleteInterimGroup')
                        : t('wizard.otherNotesGroup');
                    return (
                      <div key={group} className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">{heading}</h3>
                        <div className="space-y-2">
                          {groupItems.map((item, idx) => (
                            <div key={`${group}-${idx}`} className="flex items-start gap-2 text-sm text-amber-900">
                              <span className="inline-flex px-2 py-0.5 rounded-full border border-amber-400 text-xs font-medium min-w-[88px] justify-center">
                                {item.status}
                              </span>
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            {warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertTriangle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, idx) => idx + 1).map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full ${step <= currentStep ? 'bg-[var(--nfi-primary)]' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-[var(--nfi-text-secondary)]">
            {STEP_TITLES.map((title, idx) => (
              <div key={title} className={idx + 1 === currentStep ? 'font-semibold text-[var(--nfi-text)]' : ''}>{title}</div>
            ))}
          </div>
        </div>

        <NfiCard>
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-2">{t('wizard.steps.basicRegistration')}</h2>
              <p className="text-sm text-[var(--nfi-text-secondary)] mb-2">{t('wizard.minimumDetails')}</p>

              {!isHospitalSpoc && (
                <NfiField label="Hospital" required>
                  {hospitalsLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-[var(--nfi-text-secondary)]">
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t('wizard.loadingHospitals')}</span>
                    </div>
                  ) : hospitals.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                      {mode === 'DEMO'
                        ? t('wizard.noHospitalsDemo')
                        : t('wizard.noHospitalsAdmin')}
                    </div>
                  ) : (
                    <select
                      value={formData.hospitalId}
                      onChange={(e) => updateField('hospitalId', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                    >
                      <option value="">{t('wizard.selectHospital')}</option>
                      {hospitals.map((h) => (
                        <option key={h.hospitalId} value={h.hospitalId}>
                          {h.name} - {h.city}
                        </option>
                      ))}
                    </select>
                  )}
                </NfiField>
              )}

              {isHospitalSpoc && (
                <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--nfi-text)]">{t('wizard.hospitalLabel')}:</span>{' '}
                  <span className="text-[var(--nfi-text-secondary)]">{selectedHospital?.name || 'Scoped hospital'}</span>
                </div>
              )}

              {!isHospitalSpoc && (
                <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--nfi-text)]">{t('wizard.processTypeLabel')}:</span>{' '}
                  <span className="text-[var(--nfi-text-secondary)]">{processingTypeLoading ? t('wizard.deriving') : getProcessTypeLabel(formData.processType)}</span>
                </div>
              )}

              <NfiField label="Baby Name" required>
                {isHospitalSpoc ? (
                  <div className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)] text-[var(--nfi-text)]">
                    {derivedHospitalBabyName || t('wizard.autoBabyName')}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.beneficiaryName}
                    onChange={(e) => updateField('beneficiaryName', e.target.value)}
                    placeholder={t('wizard.babyNamePlaceholder', { defaultValue: 'e.g., Baby Aanya' })}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                )}
              </NfiField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="Date of Birth" required>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => updateField('dob', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="Gender" required>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  >
                    <option value="">{t('wizard.selectGender')}</option>
                    <option value="Male">{translateGender('Male')}</option>
                    <option value="Female">{translateGender('Female')}</option>
                    <option value="Other">{translateGender('Other')}</option>
                  </select>
                </NfiField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="Father's Name" required>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => updateField('fatherName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="Mother's Name" required>
                  <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => updateField('motherName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="Father Phone Number" required hint="Required to continue.">
                  <input
                    type="tel"
                    value={formData.fatherPhone}
                    onChange={(e) => updateField('fatherPhone', e.target.value)}
                    placeholder={t('wizard.phonePlaceholder', { defaultValue: '+91-9876543210' })}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="Mother Phone Number" required hint="Required to continue.">
                  <input
                    type="tel"
                    value={formData.motherPhone}
                    onChange={(e) => updateField('motherPhone', e.target.value)}
                    placeholder={t('wizard.phonePlaceholder', { defaultValue: '+91-9876543210' })}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="City" required>
                  <select
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  >
                    <option value="">{t('wizard.selectCity')}</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </NfiField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="Admission Date" required>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => updateField('admissionDate', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="Intake Date" required hint={t('wizard.intakeDateHint')}>
                  <input
                    type="date"
                    value={formData.intakeDate}
                    onChange={(e) => updateField('intakeDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none ${
                      intakeDateError ? 'border-red-500' : 'border-[var(--nfi-border)]'
                    }`}
                  />
                  {intakeDateError && <p className="text-red-500 text-sm mt-1">{intakeDateError}</p>}
                </NfiField>
              </div>
            </div>
          )}

          {currentStep === 2 && createdCaseId && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">{t('wizard.steps.fundApplication')}</h2>
              <IntakeFormsTab caseId={createdCaseId} variant="wizard" section="fund" />
            </div>
          )}

          {currentStep === 3 && createdCaseId && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">{t('wizard.steps.interimSummary')}</h2>
              <IntakeFormsTab caseId={createdCaseId} variant="wizard" section="interim" />
            </div>
          )}

          {currentStep === 4 && createdCaseId && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">{t('wizard.steps.documents')}</h2>
              <p className="text-sm text-[var(--nfi-text-secondary)]">
                {t('wizard.documentsHint')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)]">
                  <p className="text-xs text-[var(--nfi-text-secondary)]">{t('wizard.checklistItems')}</p>
                  <p className="text-2xl font-semibold text-[var(--nfi-text)]">{documentStats.total}</p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)]">
                  <p className="text-xs text-[var(--nfi-text-secondary)]">{t('wizard.uploadedVerified')}</p>
                  <p className="text-2xl font-semibold text-[var(--nfi-text)]">{documentStats.uploaded}</p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)]">
                  <p className="text-xs text-[var(--nfi-text-secondary)]">{t('wizard.verified')}</p>
                  <p className="text-2xl font-semibold text-[var(--nfi-text)]">{documentStats.verified}</p>
                </div>
              </div>

              <DocumentsTab
                documents={documents}
                caseId={createdCaseId}
                onDocumentsChanged={() => {
                  void refreshDocuments(createdCaseId);
                }}
              />
            </div>
          )}

          {currentStep === 5 && createdCaseId && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">{t('wizard.steps.reviewSubmit')}</h2>

              <div className="border border-[var(--nfi-border)] rounded-lg p-4 bg-[var(--nfi-bg-light)]">
                <h3 className="font-semibold text-[var(--nfi-text)] mb-3">{t('wizard.registrationSummary')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium">{translateLiteral('Baby Name')}:</span> {(isHospitalSpoc ? derivedHospitalBabyName : formData.beneficiaryName) || '-'}</p>
                  <p><span className="font-medium">DOB:</span> {formData.dob || '-'}</p>
                  <p><span className="font-medium">{translateLiteral('Gender')}:</span> {formData.gender ? translateGender(formData.gender) : '-'}</p>
                  <p><span className="font-medium">{translateLiteral('Father Name')}:</span> {formData.fatherName || '-'}</p>
                  <p><span className="font-medium">{translateLiteral('Mother Name')}:</span> {formData.motherName || '-'}</p>
                  <p><span className="font-medium">Father Phone Number:</span> {formData.fatherPhone || '-'}</p>
                  <p><span className="font-medium">Mother Phone Number:</span> {formData.motherPhone || '-'}</p>
                  <p><span className="font-medium">{translateLiteral('City')}:</span> {formData.city || '-'}</p>
                  {!isHospitalSpoc && <p><span className="font-medium">{translateLiteral('Process')}:</span> {getProcessTypeLabel(formData.processType)}</p>}
                </div>
              </div>

              <div className="border border-[var(--nfi-border)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--nfi-text)] mb-3">{t('wizard.submissionReadiness')}</h3>
                {reviewLoading ? (
                  <div className="flex items-center gap-2 text-[var(--nfi-text-secondary)]">
                    <Loader2 size={16} className="animate-spin" />
                    {t('wizard.checkingReadiness')}
                  </div>
                ) : readiness ? (
                  <div className="space-y-2 text-sm">
                    <p>{t('wizard.steps.fundApplication')}: <span className={readiness.fundAppComplete ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{readiness.fundAppComplete ? t('common.complete') : t('common.incomplete')}</span></p>
                    <p>{t('wizard.steps.interimSummary')}: <span className={readiness.interimSummaryComplete ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{readiness.interimSummaryComplete ? t('common.complete') : t('common.incomplete')}</span></p>
                    <p>{t('wizard.steps.documents')}: <span className={readiness.documentsReady ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{readiness.documentsReady ? t('common.ready') : t('common.notReady')}</span></p>
                    {!readiness.canSubmit && readiness.missingFields.length > 0 && (
                      <p className="text-amber-800">{t('wizard.missingFields')}: {readiness.missingFields.join(', ')}</p>
                    )}
                    {!readiness.canSubmit && readiness.missingDocuments.length > 0 && (
                      <p className="text-amber-800">{t('wizard.missingDocuments')}: {readiness.missingDocuments.join(', ')}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Unable to load readiness yet.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--nfi-border)]">
            <div>
              {currentStep > 1 && (
                <NfiButton variant="secondary" onClick={handlePrev}>
                  <ArrowLeft size={16} className="mr-2" />
                  {t('common.previous')}
                </NfiButton>
              )}
            </div>

            <div className="flex gap-3">
              <NfiButton variant="secondary" onClick={handleSaveDraft} disabled={saving || processMappingMissing}>
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                {t('wizard.saveDraft')}
              </NfiButton>

              {currentStep < TOTAL_STEPS ? (
                <NfiButton onClick={handleNext} disabled={saving || processMappingMissing || processingTypeLoading}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                  {t('common.next')}
                  <ArrowRight size={16} className="ml-2" />
                </NfiButton>
              ) : (
                <NfiButton onClick={handleSubmit} disabled={saving || processMappingMissing || reviewLoading}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                  {isReturnedCase ? t('wizard.resubmitCase') : t('wizard.submitCase')}
                </NfiButton>
              )}
            </div>
          </div>
        </NfiCard>
      </div>
    </Layout>
  );
}
