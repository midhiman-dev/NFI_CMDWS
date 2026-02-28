import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiButton } from '../components/design-system/NfiButton';
import { NfiField } from '../components/design-system/NfiField';
import { IntakeFormsTab } from '../components/case-tabs/IntakeFormsTab';
import { ProcessType, CaseStatus, Hospital } from '../types';
import { ArrowLeft, ArrowRight, Save, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { getAuthState } from '../utils/auth';
import { useToast } from '../components/design-system/Toast';
import { useAppContext } from '../App';

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

export function CaseNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provider, mode } = useAppContext();
  const authState = getAuthState();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intakeDateError, setIntakeDateError] = useState('');
  const [processingTypeLoading, setProcessingTypeLoading] = useState(false);
  const [processMappingMissing, setProcessMappingMissing] = useState(false);
  const [formData, setFormData] = useState<CaseFormData>({
    processType: '',
    hospitalId: authState.activeUser?.hospitalId || '',
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
    const deriveProcessType = async () => {
      if (!formData.hospitalId) {
        setFormData((prev) => ({ ...prev, processType: '' }));
        setProcessMappingMissing(false);
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
  }, [formData.hospitalId, provider]);

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
    const missing: string[] = [];
    if (!formData.processType) missing.push('processType');
    if (!formData.hospitalId) missing.push('hospitalId');
    if (!formData.admissionDate) missing.push('admissionDate');
    if (!formData.intakeDate) missing.push('intakeDate');

    if (missing.length > 0) {
      console.log('[DEV] Step 1 validation failed:', missing);
      if (processMappingMissing) {
        showToast('Hospital process mapping is missing. Please contact your administrator.', 'error');
      } else {
        showToast('Please fill all required fields', 'error');
      }
      return false;
    }
    if (formData.intakeDate < formData.admissionDate) {
      showToast('Intake date cannot be before admission date', 'error');
      return false;
    }
    return true;
  };

  const validateForSubmit = () => {
    const required = [
      'processType',
      'hospitalId',
      'admissionDate',
      'intakeDate',
      'beneficiaryName',
      'gender',
      'dob',
      'motherName',
      'phone',
      'diagnosis',
      'summary',
      'estimateAmount',
    ];

    const missing = required.filter((field) => !formData[field as keyof CaseFormData]);
    if (missing.length > 0) {
      console.log('[DEV] Submit validation failed:', missing);
      showToast(`Missing required fields: ${missing.join(', ')}`, 'error');
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
        beneficiaryName: formData.beneficiaryName || undefined,
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

      return newCase;
    } finally {
      setSaving(false);
    }
  };

  const createDraftCase = async () => {
    if (createdCaseId) {
      return true;
    }

    if (!validateStep1()) {
      return false;
    }

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
      const newCase = await saveCase('Draft');
      showToast('Case saved as draft', 'success');
      navigate(`/cases/${newCase.caseId}`);
    } catch (error) {
      console.error('Failed to save draft:', error);
      showToast('Failed to save case. Please try again.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!validateForSubmit()) return;

    try {
      const newCase = await saveCase('Submitted');
      showToast('Case submitted successfully', 'success');
      navigate(`/cases/${newCase.caseId}`);
    } catch (error) {
      console.error('Failed to submit case:', error);
      showToast('Failed to submit case. Please try again.', 'error');
    }
  };

  const handleFinish = () => {
    if (!createdCaseId) {
      showToast('Error: Case ID not found', 'error');
      return;
    }
    showToast('Case created. Complete Intake Forms before submission.', 'success');
    navigate(`/cases/${createdCaseId}`);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      const success = await createDraftCase();
      if (success) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const warnings = getTimingWarnings();
  const isHospitalSpoc = authState.activeUser?.roles?.includes('hospital_spoc') && authState.activeUser?.hospitalId;

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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">New Case</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Step {currentStep} of 4</p>
          </div>
        </div>

        {processMappingMissing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">Hospital process mapping is missing. Please contact your administrator.</p>
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

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full ${
                step <= currentStep ? 'bg-[var(--nfi-primary)]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <NfiCard>
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Case Basics</h2>

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
                    disabled={!!isHospitalSpoc}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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

              <NfiField label="Process Type" required>
                {processingTypeLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-[var(--nfi-text-secondary)]">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deriving process type...</span>
                  </div>
                ) : formData.processType ? (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[var(--nfi-text)]">
                    {formData.processType === 'BRC' && 'BRC - Birth & Resuscitation Care'}
                    {formData.processType === 'BRRC' && 'BRRC - Birth & Re-admission Resuscitation Care'}
                    {formData.processType === 'BGRC' && 'BGRC - Birth & Growth Care'}
                    {formData.processType === 'BCRC' && 'BCRC - Birth & Closure/Completion Care'}
                    {formData.processType === 'NON_BRC' && 'NON_BRC - Non-BRC Case'}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                    Select a hospital to derive process type
                  </div>
                )}
              </NfiField>

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
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Beneficiary & Family</h2>

              <NfiField label="Beneficiary Number" hint="Optional at draft stage, can be assigned later">
                <input
                  type="text"
                  value={formData.beneficiaryNo}
                  onChange={(e) => updateField('beneficiaryNo', e.target.value)}
                  placeholder="e.g., BEN001"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>

              <NfiField label="Baby Name" required>
                <input
                  type="text"
                  value={formData.beneficiaryName}
                  onChange={(e) => updateField('beneficiaryName', e.target.value)}
                  placeholder="e.g., Baby Aanya"
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

              <NfiField label="Date of Birth" required>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => updateField('dob', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NfiField label="Father's Name">
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

              <NfiField label="Phone Number" required>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>

              <NfiField label="Address">
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NfiField label="City">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="State">
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>

                <NfiField label="Pincode">
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => updateField('pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                  />
                </NfiField>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Clinical & Financial</h2>

              <NfiField label="Diagnosis" required>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => updateField('diagnosis', e.target.value)}
                  placeholder="e.g., Respiratory Distress Syndrome"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>

              <NfiField label="Case Summary" required>
                <textarea
                  value={formData.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  rows={4}
                  placeholder="Brief description of the case..."
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none resize-none"
                />
              </NfiField>

              <NfiField label="Estimated Amount" required>
                <input
                  type="number"
                  value={formData.estimateAmount}
                  onChange={(e) => updateField('estimateAmount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                />
              </NfiField>
            </div>
          )}

          {currentStep === 4 && createdCaseId && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Intake Forms (Optional)</h2>
              <IntakeFormsTab caseId={createdCaseId} variant="wizard" />
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--nfi-border)]">
            <div>
              {currentStep > 1 && (
                <NfiButton variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                  <ArrowLeft size={16} className="mr-2" />
                  Previous
                </NfiButton>
              )}
            </div>

            <div className="flex gap-3">
              <NfiButton variant="secondary" onClick={handleSaveDraft} disabled={saving}>
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                Save Draft
              </NfiButton>

              {currentStep < 4 ? (
                <NfiButton onClick={handleNext} disabled={saving}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ArrowRight size={16} className="ml-2" />}
                  Next
                </NfiButton>
              ) : currentStep === 4 ? (
                <NfiButton onClick={handleFinish} disabled={saving}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                  Continue to Case
                </NfiButton>
              ) : (
                <NfiButton onClick={handleSubmit} disabled={saving || processMappingMissing}>
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
