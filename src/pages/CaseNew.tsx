import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  diagnosis: string;
  summary: string;
  estimateAmount: string;
}

function getProcessTypeLabel(processType: ProcessType | ''): string {
  switch (processType) {
    case 'BRC': return 'BRC - Birth & Resuscitation Care';
    case 'BRRC': return 'BRRC - Birth & Re-admission Resuscitation Care';
    case 'BGRC': return 'BGRC - Birth & Growth Care';
    case 'BCRC': return 'BCRC - Birth & Closure/Completion Care';
    case 'NON_BRC': return 'NON_BRC - Non-BRC Case';
    default: return 'Not mapped';
  }
}

function buildDerivedBabyName(motherName: string): string {
  const trimmed = motherName.trim();
  return trimmed ? `Baby of ${trimmed}` : '';
}

function normalizeDateForInput(value?: string | null): string {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value;
}

export function CaseNew() {
  const navigate = useNavigate();
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
    phone: '',
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
        const [caseInfo, beneficiary, family, clinical] = await Promise.all([
          provider.getCaseById(routeCaseId),
          provider.getBeneficiary(routeCaseId).catch(() => null),
          provider.getFamily(routeCaseId).catch(() => null),
          provider.getClinicalDetails(routeCaseId).catch(() => null),
        ]);

        if (!caseInfo || cancelled) return;

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
          phone: family?.phone || prev.phone,
          address: family?.address || prev.address,
          city: family?.city || prev.city,
          state: family?.state || prev.state,
          pincode: family?.pincode || prev.pincode,
        }));

        const stepFromQuery = Number(searchParams.get('step') || '');
        if (!Number.isNaN(stepFromQuery) && stepFromQuery >= 1 && stepFromQuery <= TOTAL_STEPS) {
          setCurrentStep(stepFromQuery);
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
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        pincode: formData.pincode || undefined,
      }),
      provider.upsertClinical(caseId, {
        admissionDate: formData.admissionDate || undefined,
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
        setIntakeDateError('Intake date cannot be before admission date');
      } else {
        setIntakeDateError('');
      }
    }
  };

  const validateStep1 = () => {
    const required: Array<keyof CaseFormData> = [
      'hospitalId',
      'processType',
      'beneficiaryName',
      'dob',
      'gender',
      'fatherName',
      'motherName',
      'phone',
      'city',
      'admissionDate',
      'intakeDate',
    ];

    const missing = required.filter((field) => !formData[field]);
    if (missing.length > 0) {
      if (processMappingMissing) {
        showToast('Hospital process setup is missing. Please contact NFI Admin before creating a case.', 'error');
      } else {
        showToast('Please complete all required registration fields.', 'error');
      }
      return false;
    }

    if (formData.intakeDate < formData.admissionDate) {
      showToast('Intake date cannot be before admission date', 'error');
      return false;
    }

    return true;
  };

  const validateForFinalSubmit = () => {
    if (!validateStep1()) return false;

    if (!formData.fatherName.trim()) {
      showToast('Father name is required before final submission.', 'error');
      return false;
    }

    if (!readiness) {
      showToast('Submit readiness is still loading. Please wait a moment.', 'error');
      return false;
    }

    if (!readiness.canSubmit) {
      showToast('Please complete intake and required documents before submission.', 'error');
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
        phone: formData.phone || undefined,
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
      showToast('Case submitted successfully', 'success');
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{isResumedDraft ? 'Draft Case' : 'New Case'}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Step {currentStep} of {TOTAL_STEPS}: {STEP_TITLES[currentStep - 1]}</p>
          </div>
        </div>

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
              <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-2">Basic Registration</h2>
              <p className="text-sm text-[var(--nfi-text-secondary)] mb-2">Enter minimum registration details to start intake.</p>

              {!isHospitalSpoc && (
                <NfiField label="Hospital" required>
                  {hospitalsLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-[var(--nfi-text-secondary)]">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Loading hospitals...</span>
                    </div>
                  ) : hospitals.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                      {mode === 'DEMO'
                        ? 'No hospitals available. Please reset demo data.'
                        : 'No hospitals found. Please add hospitals in Admin > Hospitals.'}
                    </div>
                  ) : (
                    <select
                      value={formData.hospitalId}
                      onChange={(e) => updateField('hospitalId', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                    >
                      <option value="">Select hospital</option>
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
                  <span className="font-medium text-[var(--nfi-text)]">Hospital:</span>{' '}
                  <span className="text-[var(--nfi-text-secondary)]">{selectedHospital?.name || 'Scoped hospital'}</span>
                </div>
              )}

              <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-2 text-sm">
                <span className="font-medium text-[var(--nfi-text)]">Process Type:</span>{' '}
                <span className="text-[var(--nfi-text-secondary)]">{processingTypeLoading ? 'Deriving...' : getProcessTypeLabel(formData.processType)}</span>
              </div>

              <NfiField label="Baby Name" required>
                {isHospitalSpoc ? (
                  <div className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-[var(--nfi-bg-light)] text-[var(--nfi-text)]">
                    {derivedHospitalBabyName || 'Will be auto-generated from Mother Name'}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.beneficiaryName}
                    onChange={(e) => updateField('beneficiaryName', e.target.value)}
                    placeholder="e.g., Baby Aanya"
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
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
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
                <NfiField label="Primary Phone" required>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="City" required>
                  <select
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  >
                    <option value="">Select city</option>
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

                <NfiField label="Intake Date" required hint="Date when case was registered with NFI">
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
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Fund Application</h2>
              <IntakeFormsTab caseId={createdCaseId} variant="wizard" section="fund" />
            </div>
          )}

          {currentStep === 3 && createdCaseId && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Interim Summary</h2>
              <IntakeFormsTab caseId={createdCaseId} variant="wizard" section="interim" />
            </div>
          )}

          {currentStep === 4 && createdCaseId && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Documents</h2>
              <p className="text-sm text-[var(--nfi-text-secondary)]">
                Upload pre-approval required documents. Post-discharge documents can be added later.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)]">
                  <p className="text-xs text-[var(--nfi-text-secondary)]">Checklist Items</p>
                  <p className="text-2xl font-semibold text-[var(--nfi-text)]">{documentStats.total}</p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)]">
                  <p className="text-xs text-[var(--nfi-text-secondary)]">Uploaded/Verified</p>
                  <p className="text-2xl font-semibold text-[var(--nfi-text)]">{documentStats.uploaded}</p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)]">
                  <p className="text-xs text-[var(--nfi-text-secondary)]">Verified</p>
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
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Review & Submit</h2>

              <div className="border border-[var(--nfi-border)] rounded-lg p-4 bg-[var(--nfi-bg-light)]">
                <h3 className="font-semibold text-[var(--nfi-text)] mb-3">Registration Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium">Baby Name:</span> {(isHospitalSpoc ? derivedHospitalBabyName : formData.beneficiaryName) || '-'}</p>
                  <p><span className="font-medium">DOB:</span> {formData.dob || '-'}</p>
                  <p><span className="font-medium">Gender:</span> {formData.gender || '-'}</p>
                  <p><span className="font-medium">Father Name:</span> {formData.fatherName || '-'}</p>
                  <p><span className="font-medium">Mother Name:</span> {formData.motherName || '-'}</p>
                  <p><span className="font-medium">Phone:</span> {formData.phone || '-'}</p>
                  <p><span className="font-medium">City:</span> {formData.city || '-'}</p>
                  <p><span className="font-medium">Process:</span> {getProcessTypeLabel(formData.processType)}</p>
                </div>
              </div>

              <div className="border border-[var(--nfi-border)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--nfi-text)] mb-3">Submission Readiness</h3>
                {reviewLoading ? (
                  <div className="flex items-center gap-2 text-[var(--nfi-text-secondary)]">
                    <Loader2 size={16} className="animate-spin" />
                    Checking readiness...
                  </div>
                ) : readiness ? (
                  <div className="space-y-2 text-sm">
                    <p>Fund Application: <span className={readiness.fundAppComplete ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{readiness.fundAppComplete ? 'Complete' : 'Incomplete'}</span></p>
                    <p>Interim Summary: <span className={readiness.interimSummaryComplete ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{readiness.interimSummaryComplete ? 'Complete' : 'Incomplete'}</span></p>
                    <p>Documents: <span className={readiness.documentsReady ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{readiness.documentsReady ? 'Ready' : 'Not Ready'}</span></p>
                    {!readiness.canSubmit && readiness.missingFields.length > 0 && (
                      <p className="text-amber-800">Missing Fields: {readiness.missingFields.join(', ')}</p>
                    )}
                    {!readiness.canSubmit && readiness.missingDocuments.length > 0 && (
                      <p className="text-amber-800">Missing Documents: {readiness.missingDocuments.join(', ')}</p>
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
                  Previous
                </NfiButton>
              )}
            </div>

            <div className="flex gap-3">
              <NfiButton variant="secondary" onClick={handleSaveDraft} disabled={saving || processMappingMissing}>
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                Save Draft
              </NfiButton>

              {currentStep < TOTAL_STEPS ? (
                <NfiButton onClick={handleNext} disabled={saving || processMappingMissing || processingTypeLoading}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                  Next
                  <ArrowRight size={16} className="ml-2" />
                </NfiButton>
              ) : (
                <NfiButton onClick={handleSubmit} disabled={saving || processMappingMissing || reviewLoading}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                  Submit Case
                </NfiButton>
              )}
            </div>
          </div>
        </NfiCard>
      </div>
    </Layout>
  );
}
