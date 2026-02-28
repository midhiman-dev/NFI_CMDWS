import { IntakeFundApplication, IntakeInterimSummary } from '../types';
import { isPresentFieldValue } from './fieldValue';

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

export const FUND_APPLICATION_FIELDS = {
  parentsFamilySection: {
    label: 'Parents & Family',
    requiredFields: ['fatherDob', 'fatherEducation', 'motherDob', 'motherEducation', 'marriageDate', 'dependents'],
  },
  occupationIncomeSection: {
    label: 'Occupation & Income',
    requiredFields: ['fatherOccupation', 'fatherMonthlyIncome', 'motherOccupation', 'motherMonthlyIncome', 'incomeProofType'],
  },
  birthDetailsSection: {
    label: 'Birth Details',
    requiredFields: ['isInborn', 'conceptionType', 'gestationalAgeWeeks', 'deliveryType', 'gravida'],
  },
  nicuFinancialSection: {
    label: 'NICU & Financial',
    requiredFields: ['nicuAdmissionDate', 'estimatedNicuDays', 'nfiRequestedAmount', 'estimateBilled', 'estimateAfterDiscount'],
  },
  otherSupportSection: {
    label: 'Other Support',
    requiredFields: [],
  },
  declarationsSection: {
    label: 'Declarations',
    requiredFields: ['declarationsAccepted'],
  },
  hospitalApprovalSection: {
    label: 'Hospital Approval',
    requiredFields: ['approvedByName', 'approvalDate'],
  },
};

export const INTERIM_SUMMARY_FIELDS = {
  birthSummarySection: {
    label: 'Birth Summary',
    requiredFields: ['apgarScore', 'timeOfBirth', 'placeOfBirth', 'gestationalAgeWeeks'],
  },
  maternalDetailsSection: {
    label: 'Maternal Details',
    requiredFields: ['maritalStatus', 'yearsMarried', 'motherAge', 'gravida', 'parity', 'abortions', 'liveChildrenBefore'],
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
    requiredFields: [],
  },
  currentStatusSection: {
    label: 'Current Status',
    requiredFields: ['dayOfLife', 'currentWeight', 'correctedGestationalAge'],
  },
  feedingRespirationSection: {
    label: 'Feeding & Respiration',
    requiredFields: ['feedingMode', 'respirationStatus'],
  },
  dischargePlanInvestigationsSection: {
    label: 'Discharge Plan & Investigations',
    requiredFields: ['dischargeDate', 'investigationsPlanned'],
  },
  remarksSignatureSection: {
    label: 'Remarks & Signature',
    requiredFields: ['doctorName', 'signedAt'],
  },
};

export function validateFundApplicationSection(
  sectionKey: string,
  data: any
): ValidationResult {
  const config = FUND_APPLICATION_FIELDS[sectionKey as keyof typeof FUND_APPLICATION_FIELDS];
  if (!config) {
    return { isValid: true, missingFields: [], errors: {} };
  }

  const missingFields: string[] = [];
  const errors: Record<string, string> = {};

  config.requiredFields.forEach(fieldName => {
    const value = data?.[fieldName];
    if (!isPresentFieldValue(value)) {
      missingFields.push(fieldName);
      errors[fieldName] = `${fieldName} is required`;
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

export function validateInterimSummarySection(
  sectionKey: string,
  data: any
): ValidationResult {
  const config = INTERIM_SUMMARY_FIELDS[sectionKey as keyof typeof INTERIM_SUMMARY_FIELDS];
  if (!config) {
    return { isValid: true, missingFields: [], errors: {} };
  }

  const missingFields: string[] = [];
  const errors: Record<string, string> = {};

  config.requiredFields.forEach(fieldName => {
    const value = data?.[fieldName];
    if (!isPresentFieldValue(value)) {
      missingFields.push(fieldName);
      errors[fieldName] = `${fieldName} is required`;
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

export function validateFundApplicationForm(data: IntakeFundApplication): ValidationResult {
  const errors: Record<string, string> = {};
  const missingFields: string[] = [];

  Object.entries(FUND_APPLICATION_FIELDS).forEach(([sectionKey, config]) => {
    const section = data[sectionKey as keyof IntakeFundApplication];
    config.requiredFields.forEach(fieldName => {
      if (section) {
        const value = section[fieldName as keyof any];
        if (!isPresentFieldValue(value)) {
          const fullFieldName = `${config.label}.${fieldName}`;
          missingFields.push(fullFieldName);
          errors[fullFieldName] = `${fieldName} is required in ${config.label}`;
        }
      }
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
    const section = data[sectionKey as keyof IntakeInterimSummary];
    config.requiredFields.forEach(fieldName => {
      if (section) {
        const value = section[fieldName as keyof any];
        if (!isPresentFieldValue(value)) {
          const fullFieldName = `${config.label}.${fieldName}`;
          missingFields.push(fullFieldName);
          errors[fullFieldName] = `${fieldName} is required in ${config.label}`;
        }
      }
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

export function isSectionComplete(section: any, requiredFields: string[]): boolean {
  if (!section) return false;
  return requiredFields.every(field => {
    const value = section[field];
    return isPresentFieldValue(value);
  });
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

  if (sectionKey === 'treatmentGivenSection') {
    const hasAnyFlag = Boolean(
      section?.respiratorySupportRequired === true ||
      section?.phototherapyRequired === true ||
      section?.antibioticsRequired === true ||
      section?.nutritionalSupportRequired === true
    );
    const hasNotes = hasTextContent(section?.treatmentNotes);
    const hasTreatmentData = hasAnyFlag || hasNotes;
    return hasTreatmentData
      ? { pct: 100, filled: 1, total: 1 }
      : { pct: 0, filled: 0, total: 1 };
  }

  const requiredFields = INTERIM_SUMMARY_FIELDS[sectionKey].requiredFields;
  return getSectionProgress(section, requiredFields);
}
