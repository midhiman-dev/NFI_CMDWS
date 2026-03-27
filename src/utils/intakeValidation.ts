import { isPresentFieldValue } from './fieldValue';
import { diffFullYears, parseDateFlexible } from './derivedFields';
import i18next from '../i18n';
import type { IntakeFundApplication, IntakeInterimSummary } from '../types';
import { getIncomeCaptureModeByOccupation } from './incomeEligibility';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: Record<string, string>;
}

export type SectionStatus = 'not_started' | 'in_progress' | 'complete';

export interface SectionProgress {
  pct: number;
  filled: number;
  total: number;
}

export const MINIMUM_PARENT_AGE_AT_CHILD_BIRTH = 18;

export const FUND_APPLICATION_FIELDS = {
  parentsFamilySection: {
    label: 'Parents & Family',
    requiredFields: [
      'fatherName',
      'motherName',
      'fatherContactNo',
      'motherContactNo',
      'addressDetails',
      'fatherDob',
      'fatherEducation',
      'motherDob',
      'motherEducation',
      'marriageDate',
      'numberOfFamilyMembers',
    ],
  },
  occupationIncomeSection: {
    label: 'Occupation & Income',
    requiredFields: [
      'fatherOccupation',
      'fatherEmployer',
      'motherOccupation',
      'motherEmployer',
      'assetsLandHouse',
    ],
  },
  birthDetailsSection: {
    label: 'Birth Details',
    requiredFields: [
      'babyDateOfBirth',
      'babyGender',
      'babyBirthWeightKg',
      'isInborn',
      'conceptionType',
      'gestationalAgeWeeks',
      'deliveryType',
      'deliveryCharges',
      'gravida',
    ],
  },
  nicuFinancialSection: {
    label: 'NICU & Financial',
    requiredFields: ['nicuAdmissionDate', 'estimatedNicuDays', 'totalEstimatedHospitalBill', 'advancePaidByFamily', 'currentOutstandingBillAmount'],
  },
  otherSupportSection: {
    label: 'Other Support',
    requiredFields: ['anyOtherSupportReceived'],
  },
  declarationsSection: {
    label: 'Declarations',
    requiredFields: [
      'declarationTruthfulnessAccepted',
      'declarationDocumentationConsentAccepted',
      'declarationPhotoVideoConsentAccepted',
      'declarationDate',
      'parentSignatureRef',
    ],
  },
  hospitalApprovalSection: {
    label: 'Hospital Approval',
    requiredFields: ['approvedByName', 'approvalDesignation', 'approvalSignatureStampRef'],
  },
};

export const INTERIM_SUMMARY_FIELDS = {
  birthSummarySection: {
    label: 'Birth Summary',
    requiredFields: ['babyBirthWeightKg', 'gender', 'isInborn', 'apgarAt1Min', 'apgarAt5Min', 'dateOfBirth', 'timeOfBirth', 'gestationalAgeWeeks'],
  },
  maternalDetailsSection: {
    label: 'Maternal Details',
    requiredFields: ['maritalStatus', 'yearsMarried', 'motherAge', 'gravida', 'parity', 'abortions', 'liveChildrenBefore', 'conceptionMode'],
  },
  antenatalRiskFactorsSection: {
    label: 'Antenatal Risk Factors',
    requiredFields: [],
  },
  diagnosisSection: {
    label: 'Diagnosis',
    requiredFields: [],
  },
  treatmentGivenSection: {
    label: 'Treatment Given',
    requiredFields: ['mechanicalVentilation', 'cpap', 'hhfnc', 'o2', 'ivAntibiotics', 'ionotropes', 'tpn'],
  },
  currentStatusSection: {
    label: 'Current Status',
    requiredFields: ['dayOfLife', 'currentWeight', 'correctedGestationalAge'],
  },
  feedingRespirationSection: {
    label: 'Ongoing Treatment',
    requiredFields: ['ongoingMechanicalVentilation', 'ongoingCpap', 'ongoingHhfnc', 'ongoingO2', 'ongoingNpo', 'ongoingOg', 'ongoingPalada', 'ongoingDbf'],
  },
  dischargePlanInvestigationsSection: {
    label: 'Discharge Plan & Investigations',
    requiredFields: ['planOfDischarge', 'investigationsLabs', 'investigationsXRay', 'investigationsScans', 'investigationsOthers'],
  },
  remarksSignatureSection: {
    label: 'Remarks & Signature',
    requiredFields: ['signatureRef'],
  },
};

const FUND_FIELD_LABELS: Record<string, string> = {
  fatherName: "Father's Name",
  motherName: "Mother's Name",
  fatherContactNo: "Father's Contact No",
  motherContactNo: "Mother's Contact No",
  addressDetails: 'Address Details',
  fatherDob: "Father's Date of Birth",
  fatherEducation: "Father's Education",
  motherDob: "Mother's Date of Birth",
  motherEducation: "Mother's Education",
  marriageDate: 'Date of Marriage',
  numberOfFamilyMembers: 'Number of Family Members',
  fatherOccupation: "Father's Occupation",
  fatherEmployer: "Father's Employer / Company Name",
  fatherMonthlyIncome: "Father's Monthly Income",
  fatherDailyIncome: "Father's Daily Wages",
  motherOccupation: "Mother's Occupation",
  motherEmployer: "Mother's Employer / Company Name",
  motherMonthlyIncome: "Mother's Monthly Income",
  motherDailyIncome: "Mother's Daily Wages",
  assetsLandHouse: 'Assets / Own Land-House',
  incomeProofSelection: 'Income Proof Selection',
  babyDateOfBirth: 'Baby Date of Birth',
  babyGender: 'Baby Gender',
  babyBirthWeightKg: 'Baby Birth Weight (kg)',
  isInborn: 'Inborn / Outborn',
  outbornHospitalName: 'Outborn Hospital Name',
  conceptionType: 'Type of Conception',
  gestationalAgeWeeks: 'Gestational Age (weeks)',
  deliveryType: 'Type of Delivery',
  deliveryCharges: 'Delivery Charges',
  gravida: 'Gravida',
  nicuAdmissionDate: 'NICU Admission Date',
  estimatedNicuDays: 'Estimated NICU Days',
  totalEstimatedHospitalBill: 'Total Estimated Hospital Bill',
  advancePaidByFamily: 'Advance Paid by Family',
  currentOutstandingBillAmount: 'Current Outstanding / Running Bill',
  anyOtherSupportReceived: 'Any Other Support Received',
  declarationTruthfulnessAccepted: 'Truthfulness Declaration',
  declarationDocumentationConsentAccepted: 'Documentation / E-Meeting Consent',
  declarationPhotoVideoConsentAccepted: 'Signed Consent Form Declaration',
  declarationDate: 'Declaration Date',
  parentSignatureRef: 'Parent Signature',
  approvedByName: 'Approver Name',
  approvalDesignation: 'Approver Designation',
  approvalSignatureStampRef: 'Signature & Stamp',
};

const INTERIM_FIELD_LABELS: Record<string, string> = {
  babyBirthWeightKg: 'Baby Birth Weight (kg)',
  gender: 'Gender',
  isInborn: 'Inborn / Outborn',
  outbornHospitalName: 'Outborn Hospital Name',
  apgarAt1Min: 'APGAR at 1 minute',
  apgarAt5Min: 'APGAR at 5 minutes',
  dateOfBirth: 'Date of Birth',
  timeOfBirth: 'Time of Birth',
  gestationalAgeWeeks: 'Gestational Age (weeks)',
  maritalStatus: 'Marital Status',
  yearsMarried: 'Years Married',
  motherAge: "Mother's Age",
  gravida: 'Gravida',
  parity: 'Parity',
  abortions: 'Abortions',
  liveChildrenBefore: 'Live Children Before',
  conceptionMode: 'Mode of Conception',
  mechanicalVentilation: 'Mechanical Ventilation',
  cpap: 'CPAP',
  hhfnc: 'HHFNC',
  o2: 'O2',
  ivAntibiotics: 'IV Antibiotics',
  ionotropes: 'Ionotropes',
  tpn: 'TPN',
  dayOfLife: 'DOL',
  currentWeight: "Today's Weight",
  correctedGestationalAge: 'CGA',
  ongoingMechanicalVentilation: 'Ongoing Mechanical Ventilation',
  ongoingCpap: 'Ongoing CPAP',
  ongoingHhfnc: 'Ongoing HHFNC',
  ongoingO2: 'Ongoing O2',
  ongoingNpo: 'Ongoing NPO',
  ongoingOg: 'Ongoing OG',
  ongoingPalada: 'Ongoing PALADA',
  ongoingDbf: 'Ongoing DBF',
  planOfDischarge: 'Plan of Discharge',
  investigationsLabs: 'Labs Attached',
  investigationsXRay: 'X Ray Attached',
  investigationsScans: 'Scans Attached',
  investigationsOthers: 'Other Investigations Attached',
  signatureRef: 'Signature',
};

function buildErrorMessage(fieldName: string, labels: Record<string, string>): string {
  return i18next.t('validation.requiredField', {
    defaultValue: '{{field}} is required',
    field: labels[fieldName] || fieldName,
  });
}

function hasIncomeProofSelection(section: any): boolean {
  return section?.incomeProofTahsildarCertificate === true || section?.incomeProofBankStatement6Months === true;
}

function hasParentIncome(section: any, parentKey: 'father' | 'mother'): boolean {
  const monthlyValue = section?.[`${parentKey}MonthlyIncome`];
  const dailyValue = section?.[`${parentKey}DailyIncome`];
  return isPresentFieldValue(monthlyValue) || isPresentFieldValue(dailyValue);
}

function addIncomeCaptureErrors(
  result: ValidationResult,
  section: IntakeFundApplication['occupationIncomeSection'] | undefined,
  parentKey: 'father' | 'mother'
) {
  if (hasParentIncome(section, parentKey)) {
    return;
  }

  const parentLabel = parentKey === 'father' ? 'Father' : 'Mother';
  const occupation = section?.[`${parentKey}Occupation` as const];
  const captureMode = getIncomeCaptureModeByOccupation(occupation);
  const monthlyField = `${parentKey}MonthlyIncome`;
  const dailyField = `${parentKey}DailyIncome`;

  const message = captureMode === 'daily_primary'
    ? `Enter ${parentLabel.toLowerCase()}'s daily wage or monthly income. Daily wage is the primary field for this occupation.`
    : captureMode === 'monthly_primary'
    ? `Enter ${parentLabel.toLowerCase()}'s monthly income or daily wage. Monthly income is the primary field for this occupation.`
    : `Enter ${parentLabel.toLowerCase()}'s monthly income or daily wage.`;

  if (captureMode === 'daily_primary') {
    result.missingFields.push(dailyField);
    result.errors[dailyField] = message;
    return;
  }

  result.missingFields.push(monthlyField);
  result.errors[monthlyField] = message;
  if (captureMode === 'either') {
    result.errors[dailyField] = message;
  }
}

function buildParentAgeErrorMessage(parentLabel: 'Mother' | 'Father'): string {
  return `${parentLabel} must meet the minimum age requirement based on the child's date of birth.`;
}

function buildChildDobAgeErrorMessage(): string {
  return "Child date of birth must align with the parent minimum age requirement.";
}

export function calculateAgeAtReferenceDate(
  dob: string | undefined,
  referenceDate: string | undefined
): number | null {
  const birthDate = parseDateFlexible(dob);
  const comparisonDate = parseDateFlexible(referenceDate);

  if (!birthDate || !comparisonDate) {
    return null;
  }

  return diffFullYears(birthDate, comparisonDate);
}

export function validateParentAge(input: {
  motherDob?: string;
  fatherDob?: string;
  childDob?: string;
  minimumAge?: number;
}): Record<string, string> {
  const { motherDob, fatherDob, childDob, minimumAge = MINIMUM_PARENT_AGE_AT_CHILD_BIRTH } = input;
  const errors: Record<string, string> = {};

  const motherAgeAtBirth = calculateAgeAtReferenceDate(motherDob, childDob);
  if (motherAgeAtBirth !== null && motherAgeAtBirth < minimumAge) {
    errors.motherDob = buildParentAgeErrorMessage('Mother');
  }

  const fatherAgeAtBirth = calculateAgeAtReferenceDate(fatherDob, childDob);
  if (fatherAgeAtBirth !== null && fatherAgeAtBirth < minimumAge) {
    errors.fatherDob = buildParentAgeErrorMessage('Father');
  }

  return errors;
}

function validateRequiredFields(
  data: any,
  requiredFields: string[],
  labels: Record<string, string>
): ValidationResult {
  const missingFields: string[] = [];
  const errors: Record<string, string> = {};

  requiredFields.forEach(fieldName => {
    const value = data?.[fieldName];
    if (!isPresentFieldValue(value)) {
      missingFields.push(fieldName);
      errors[fieldName] = buildErrorMessage(fieldName, labels);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

export function validateFundApplicationSection(
  sectionKey: string,
  data: any,
  formData?: IntakeFundApplication
): ValidationResult {
  const config = FUND_APPLICATION_FIELDS[sectionKey as keyof typeof FUND_APPLICATION_FIELDS];
  if (!config) {
    return { isValid: true, missingFields: [], errors: {} };
  }

  const result = validateRequiredFields(data, config.requiredFields, FUND_FIELD_LABELS);

  if (sectionKey === 'occupationIncomeSection' && !hasIncomeProofSelection(data)) {
    result.missingFields.push('incomeProofSelection');
    result.errors.incomeProofSelection = buildErrorMessage('incomeProofSelection', FUND_FIELD_LABELS);
  }

  if (sectionKey === 'occupationIncomeSection') {
    addIncomeCaptureErrors(result, data, 'father');
    addIncomeCaptureErrors(result, data, 'mother');
  }

  if (sectionKey === 'birthDetailsSection' && data?.isInborn === false && !isPresentFieldValue(data?.outbornHospitalName)) {
    result.missingFields.push('outbornHospitalName');
    result.errors.outbornHospitalName = buildErrorMessage('outbornHospitalName', FUND_FIELD_LABELS);
  }

  if (sectionKey === 'parentsFamilySection' || sectionKey === 'birthDetailsSection') {
    const parentAgeErrors = validateParentAge({
      motherDob: formData?.parentsFamilySection?.motherDob,
      fatherDob: formData?.parentsFamilySection?.fatherDob,
      childDob: formData?.birthDetailsSection?.babyDateOfBirth,
    });

    Object.entries(parentAgeErrors).forEach(([fieldName, message]) => {
      if (!result.missingFields.includes(fieldName)) {
        result.missingFields.push(fieldName);
      }
      result.errors[fieldName] = message;
    });

    if (sectionKey === 'birthDetailsSection' && Object.keys(parentAgeErrors).length > 0) {
      result.errors.babyDateOfBirth = buildChildDobAgeErrorMessage();
    }
  }

  result.isValid = result.missingFields.length === 0;
  return result;
}

export function validateInterimSummarySection(
  sectionKey: string,
  data: any,
  context?: {
    formData?: IntakeInterimSummary;
    parentDobContext?: {
      motherDob?: string;
      fatherDob?: string;
    };
  }
): ValidationResult {
  const config = INTERIM_SUMMARY_FIELDS[sectionKey as keyof typeof INTERIM_SUMMARY_FIELDS];
  if (!config) {
    return { isValid: true, missingFields: [], errors: {} };
  }

  const result = validateRequiredFields(data, config.requiredFields, INTERIM_FIELD_LABELS);

  if (sectionKey === 'birthSummarySection' && data?.isInborn === false && !isPresentFieldValue(data?.outbornHospitalName)) {
    result.missingFields.push('outbornHospitalName');
    result.errors.outbornHospitalName = buildErrorMessage('outbornHospitalName', INTERIM_FIELD_LABELS);
  }

  if (sectionKey === 'birthSummarySection') {
    const parentAgeErrors = validateParentAge({
      motherDob: context?.parentDobContext?.motherDob,
      fatherDob: context?.parentDobContext?.fatherDob,
      childDob: data?.dateOfBirth ?? context?.formData?.birthSummarySection?.dateOfBirth,
    });

    Object.entries(parentAgeErrors).forEach(([fieldName, message]) => {
      if (!result.missingFields.includes(fieldName)) {
        result.missingFields.push(fieldName);
      }
      result.errors[fieldName] = message;
    });

    if (Object.keys(parentAgeErrors).length > 0) {
      result.errors.dateOfBirth = buildChildDobAgeErrorMessage();
    }
  }

  result.isValid = result.missingFields.length === 0;
  return result;
}

export function validateFundApplicationForm(data: IntakeFundApplication): ValidationResult {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  Object.entries(FUND_APPLICATION_FIELDS).forEach(([sectionKey, config]) => {
    const section = data[sectionKey as keyof IntakeFundApplication] as Record<string, unknown> | undefined;
    const sectionValidation = validateFundApplicationSection(sectionKey, section, data);

    sectionValidation.missingFields.forEach(fieldName => {
      const fullFieldName = `${config.label}.${fieldName}`;
      missingFields.push(fullFieldName);
      errors[fullFieldName] = sectionValidation.errors[fieldName] || `${fieldName} is required in ${config.label}`;
    });
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

export function validateInterimSummaryForm(data: IntakeInterimSummary): ValidationResult {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  Object.entries(INTERIM_SUMMARY_FIELDS).forEach(([sectionKey, config]) => {
    const section = data[sectionKey as keyof IntakeInterimSummary] as Record<string, unknown> | undefined;
    const sectionValidation = validateInterimSummarySection(sectionKey, section, { formData: data });

    sectionValidation.missingFields.forEach(fieldName => {
      const fullFieldName = `${config.label}.${fieldName}`;
      missingFields.push(fullFieldName);
      errors[fullFieldName] = sectionValidation.errors[fieldName] || `${fieldName} is required in ${config.label}`;
    });
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

export function getSectionLabel(sectionKey: string, type: 'fundApp' | 'interimSummary'): string {
  const config = type === 'fundApp'
    ? FUND_APPLICATION_FIELDS[sectionKey as keyof typeof FUND_APPLICATION_FIELDS]
    : INTERIM_SUMMARY_FIELDS[sectionKey as keyof typeof INTERIM_SUMMARY_FIELDS];
  return config?.label || sectionKey;
}

function isFilledValue(value: unknown): boolean {
  return isPresentFieldValue(value);
}

export function getSectionProgress(section: any, requiredFields: string[]): SectionProgress {
  const total = requiredFields.length;
  if (total === 0) {
    return { pct: 0, filled: 0, total: 0 };
  }

  const filled = requiredFields.filter(field => isFilledValue(section?.[field])).length;
  const pct = Math.round((filled / total) * 100);

  return { pct, filled, total };
}

export function getFundApplicationSectionProgress(
  sectionKey: keyof typeof FUND_APPLICATION_FIELDS,
  section: any
): SectionProgress {
  const requiredFields = [...FUND_APPLICATION_FIELDS[sectionKey].requiredFields];
  if (sectionKey === 'birthDetailsSection' && section?.isInborn === false) {
    requiredFields.push('outbornHospitalName');
  }

  const baseProgress = getSectionProgress(section, requiredFields);
  if (sectionKey === 'occupationIncomeSection') {
    const total = baseProgress.total + 3;
    const filled = baseProgress.filled
      + (hasParentIncome(section, 'father') ? 1 : 0)
      + (hasParentIncome(section, 'mother') ? 1 : 0)
      + (hasIncomeProofSelection(section) ? 1 : 0);
    const pct = Math.round((filled / total) * 100);
    return { pct, filled, total };
  }

  return baseProgress;
}

export function getSectionStatus(progress: SectionProgress): SectionStatus {
  if (progress.total === 0 || progress.pct === 0) return 'not_started';
  if (progress.pct === 100) return 'complete';
  return 'in_progress';
}

function hasTextContent(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasArrayContent(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasRiskFactorsContent(value: unknown): boolean {
  return hasArrayContent(value) || hasTextContent(value);
}

export function getInterimSummarySectionProgress(
  sectionKey: keyof typeof INTERIM_SUMMARY_FIELDS,
  section: any
): SectionProgress {
  if (sectionKey === 'birthSummarySection') {
    const requiredFields = [...INTERIM_SUMMARY_FIELDS[sectionKey].requiredFields];
    if (section?.isInborn === false) {
      requiredFields.push('outbornHospitalName');
    }
    return getSectionProgress(section, requiredFields);
  }

  if (sectionKey === 'antenatalRiskFactorsSection') {
    const hasRiskFactors = hasRiskFactorsContent(section?.riskFactors);
    return hasRiskFactors
      ? { pct: 100, filled: 1, total: 1 }
      : { pct: 0, filled: 0, total: 1 };
  }

  if (sectionKey === 'diagnosisSection') {
    const hasDiagnoses = hasRiskFactorsContent(section?.diagnoses);
    const hasOtherDiagnosis = hasTextContent(section?.otherDiagnosis);
    const hasAnyDiagnosis = hasDiagnoses || hasOtherDiagnosis;
    return hasAnyDiagnosis
      ? { pct: 100, filled: 1, total: 1 }
      : { pct: 0, filled: 0, total: 1 };
  }

  const requiredFields = INTERIM_SUMMARY_FIELDS[sectionKey].requiredFields;
  return getSectionProgress(section, requiredFields);
}
