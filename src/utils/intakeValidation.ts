import { IntakeFundApplication, IntakeInterimSummary } from '../types';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: Record<string, string>;
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
    if (value === undefined || value === null || value === '') {
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
    if (value === undefined || value === null || value === '') {
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
        if (value === undefined || value === null || value === '') {
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
        if (value === undefined || value === null || value === '') {
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
    return value !== undefined && value !== null && value !== '';
  });
}
