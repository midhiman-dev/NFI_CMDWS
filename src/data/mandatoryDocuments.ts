import type { DocumentCategory } from '../types';

export interface MandatoryDocSpec {
  docType: string;
  category: DocumentCategory;
  description: string;
}

export const MANDATORY_DOCUMENTS: MandatoryDocSpec[] = [
  { docType: 'Aadhaar Card - Mother', category: 'GENERAL', description: 'Mother\'s Aadhaar card' },
  { docType: 'Aadhaar Card - Father', category: 'GENERAL', description: 'Father\'s Aadhaar card' },
  { docType: 'Family Photo', category: 'GENERAL', description: 'Family photograph' },

  { docType: 'Bank Statement', category: 'FINANCE', description: 'Bank account statement' },
  { docType: 'Income Certificate', category: 'FINANCE', description: 'Government income certificate' },
  { docType: 'Talati/Govt Economic Card', category: 'FINANCE', description: 'Talati or Government economic status card' },
  { docType: 'BPL Card', category: 'FINANCE', description: 'Below Poverty Line card' },

  { docType: 'Lab Report', category: 'MEDICAL', description: 'Laboratory test reports' },
  { docType: 'Internal Case Papers', category: 'MEDICAL', description: 'Internal case documentation' },
  { docType: 'Investigation Reports (All)', category: 'MEDICAL', description: 'All investigation reports' },
];

export const MANDATORY_DOC_COUNT = MANDATORY_DOCUMENTS.length;

export const DOCUMENT_CATEGORIES = ['GENERAL', 'FINANCE', 'MEDICAL', 'FINAL'] as const;

export function isMandatoryDocument(docType: string, category: DocumentCategory): boolean {
  return MANDATORY_DOCUMENTS.some(
    doc => doc.docType === docType && doc.category === category
  );
}

export function getMandatoryDocsByCategory(category: DocumentCategory): MandatoryDocSpec[] {
  return MANDATORY_DOCUMENTS.filter(doc => doc.category === category);
}
