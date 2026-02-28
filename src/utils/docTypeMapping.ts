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
    canonicalType: 'Internal Case Papers',
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
    canonicalType: 'Bank Statement',
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
    canonicalType: 'Talati / Govt Economic Card',
    canonicalCategory: 'FINANCE',
  },
  'Discharge_Summary': {
    legacyCode: 'Discharge_Summary',
    legacyCategory: 'FINAL',
    canonicalType: 'Discharge Summary',
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
