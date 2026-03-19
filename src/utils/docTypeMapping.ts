import type { DocumentCategory } from '../types';

export interface DocTypeAlias {
  legacyCode: string;
  legacyCategory: DocumentCategory;
  canonicalType: string;
  canonicalCategory: DocumentCategory;
}

export const LEGACY_DOC_MAPPING: Record<string, DocTypeAlias> = {
  'Medical_Reports': {
    legacyCode: 'Medical_Reports',
    legacyCategory: 'MEDICAL',
    canonicalType: 'Investigation Reports (All)',
    canonicalCategory: 'MEDICAL',
  },
  'Lab_Reports': {
    legacyCode: 'Lab_Reports',
    legacyCategory: 'MEDICAL',
    canonicalType: 'Lab Report',
    canonicalCategory: 'MEDICAL',
  },
  'Admission_Records': {
    legacyCode: 'Admission_Records',
    legacyCategory: 'MEDICAL',
    canonicalType: 'Internal Case Papers / Doctor Notes',
    canonicalCategory: 'MEDICAL',
  },
  'Birth_Certificate': {
    legacyCode: 'Birth_Certificate',
    legacyCategory: 'GENERAL',
    canonicalType: 'Aadhaar Cards (Mother & Father)',
    canonicalCategory: 'GENERAL',
  },
  'Hospital_Bills': {
    legacyCode: 'Hospital_Bills',
    legacyCategory: 'FINANCE',
    canonicalType: 'Father Bank Statement',
    canonicalCategory: 'FINANCE',
  },
  'Pharmacy_Bills': {
    legacyCode: 'Pharmacy_Bills',
    legacyCategory: 'FINANCE',
    canonicalType: 'Income Certificate',
    canonicalCategory: 'FINANCE',
  },
  'Proof_of_Income': {
    legacyCode: 'Proof_of_Income',
    legacyCategory: 'FINANCE',
    canonicalType: 'Talati/Govt Economic Card',
    canonicalCategory: 'FINANCE',
  },
  'Discharge_Summary': {
    legacyCode: 'Discharge_Summary',
    legacyCategory: 'FINAL',
    canonicalType: 'Discharge Summary',
    canonicalCategory: 'FINAL',
  },
  'NFI Fund Application Form': {
    legacyCode: 'NFI Fund Application Form',
    legacyCategory: 'GENERAL',
    canonicalType: 'Signed Fund Application Copy (Optional)',
    canonicalCategory: 'GENERAL',
  },
  'Interim Summary Document': {
    legacyCode: 'Interim Summary Document',
    legacyCategory: 'MEDICAL',
    canonicalType: 'Signed Interim Summary Copy (Optional)',
    canonicalCategory: 'MEDICAL',
  },
  'Family Photo': {
    legacyCode: 'Family Photo',
    legacyCategory: 'GENERAL',
    canonicalType: 'Parents with Baby in NICU / Hospital',
    canonicalCategory: 'GENERAL',
  },
  'Parents Photo': {
    legacyCode: 'Parents Photo',
    legacyCategory: 'GENERAL',
    canonicalType: 'Parents with Baby in NICU / Hospital',
    canonicalCategory: 'GENERAL',
  },
  'Consent Form': {
    legacyCode: 'Consent Form',
    legacyCategory: 'GENERAL',
    canonicalType: 'Consent Form',
    canonicalCategory: 'GENERAL',
  },
  'Baby Photo': {
    legacyCode: 'Baby Photo',
    legacyCategory: 'GENERAL',
    canonicalType: 'Baby Photo in NICU',
    canonicalCategory: 'GENERAL',
  },
  'Bank Statement': {
    legacyCode: 'Bank Statement',
    legacyCategory: 'FINANCE',
    canonicalType: 'Father Bank Statement',
    canonicalCategory: 'FINANCE',
  },
  'Internal Case Papers': {
    legacyCode: 'Internal Case Papers',
    legacyCategory: 'MEDICAL',
    canonicalType: 'Internal Case Papers / Doctor Notes',
    canonicalCategory: 'MEDICAL',
  },
  'Talati / Govt Economic Card': {
    legacyCode: 'Talati / Govt Economic Card',
    legacyCategory: 'FINANCE',
    canonicalType: 'Talati/Govt Economic Card',
    canonicalCategory: 'FINANCE',
  },
  'Payment Receipt': {
    legacyCode: 'Payment Receipt',
    legacyCategory: 'FINAL',
    canonicalType: 'Payment Requisition',
    canonicalCategory: 'FINAL',
  },
  'Discharge Certificate': {
    legacyCode: 'Discharge Certificate',
    legacyCategory: 'FINAL',
    canonicalType: 'Discharge Summary / Report',
    canonicalCategory: 'FINAL',
  },
  'Testimonial / Video (Optional)': {
    legacyCode: 'Testimonial / Video (Optional)',
    legacyCategory: 'FINAL',
    canonicalType: 'Testimonial Transcript / Supporting Document (Optional)',
    canonicalCategory: 'FINAL',
  },
};

export function resolveDocTypeAlias(docType: string, category: DocumentCategory): { docType: string; category: DocumentCategory } {
  const alias = LEGACY_DOC_MAPPING[docType];
  if (alias) {
    return {
      docType: alias.canonicalType,
      category: alias.canonicalCategory,
    };
  }
  return { docType, category };
}

export function getDisplayLabel(docType: string): string {
  return docType.replace(/_/g, ' ');
}
