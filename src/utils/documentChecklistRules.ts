import type { ChecklistReadiness, DocumentWithTemplate } from '../data/providers/DataProvider';
import { MANDATORY_DOCUMENTS } from '../data/mandatoryDocuments';

export const PRIMARY_FINANCE_PROOF_DOC_TYPES = [
  'Father Bank Statement',
  'Income Certificate',
  'Talati/Govt Economic Card',
] as const;

export const FINANCE_PROOF_BLOCKER_LABEL =
  'Primary financial proof missing (upload any one: Father Bank Statement OR Income Certificate OR Talati/Govt Economic Card)';

export const OPTIONAL_SUPPORTING_DOC_TYPES = new Set([
  'Consent Form',
  'Signed Fund Application Copy (Optional)',
  'Signed Interim Summary Copy (Optional)',
  'Mother Bank Statement (Optional)',
  'BPL Card (Optional Supporting)',
  'Pregnancy / Birth / Initial Treatment Records from Other Hospitals',
  'Final Bill',
  'Payment Requisition',
  'Discharge Summary / Report',
  'Post-Discharge Baby Photo',
  'Post-Discharge Parents with Baby Photo',
  'Testimonial Transcript / Supporting Document (Optional)',
]);

export function normalizeOptionalSupportingDoc<T extends Pick<DocumentWithTemplate, 'docType' | 'mandatoryFlag'>>(
  doc: T
): T {
  if (!OPTIONAL_SUPPORTING_DOC_TYPES.has(doc.docType)) {
    return doc;
  }

  return {
    ...doc,
    mandatoryFlag: false,
  };
}

function isDocSatisfied(doc: DocumentWithTemplate): boolean {
  const latestVersion = doc.versions?.[doc.versions.length - 1];
  const status = latestVersion?.status || doc.status;
  return status === 'Verified' || status === 'Not_Applicable' || status === 'Uploaded';
}

export function getHospitalFacingFolderLabel(category: string): string {
  if (category === 'FINAL') return 'Discharge & Settlement';
  if (category === 'GENERAL') return 'General';
  if (category === 'FINANCE') return 'Finance';
  if (category === 'MEDICAL') return 'Medical';
  return category;
}

export function getChecklistReadinessFromDocuments(docs: DocumentWithTemplate[]): ChecklistReadiness {
  const normalizedDocs = docs.map(normalizeOptionalSupportingDoc);
  const mandatoryDocIds = new Set(
    MANDATORY_DOCUMENTS.map((doc) => `${doc.category}-${doc.docType}`)
  );

  const requiredIndividualDocs = normalizedDocs.filter((doc) =>
    mandatoryDocIds.has(`${doc.category}-${doc.docType}`)
  );

  const requiredBlockingDocs = requiredIndividualDocs.filter((doc) => !isDocSatisfied(doc));

  const primaryFinanceDocs = normalizedDocs.filter((doc) =>
    PRIMARY_FINANCE_PROOF_DOC_TYPES.some((type) => type === doc.docType)
  );
  const hasPrimaryFinanceProof = primaryFinanceDocs.some((doc) => isDocSatisfied(doc));

  const financeCompositeBlocker: DocumentWithTemplate[] = hasPrimaryFinanceProof
    ? []
    : [{
      docId: '__finance-primary-proof__',
      caseId: normalizedDocs[0]?.caseId || '',
      category: 'FINANCE',
      docType: FINANCE_PROOF_BLOCKER_LABEL,
      status: 'Missing',
      mandatoryFlag: true,
    }];

  const mandatoryTotal = MANDATORY_DOCUMENTS.length + 1;
  const mandatoryComplete = Math.min(
    mandatoryTotal,
    (requiredIndividualDocs.length - requiredBlockingDocs.length) + (hasPrimaryFinanceProof ? 1 : 0)
  );
  const blockingDocs = [...requiredBlockingDocs, ...financeCompositeBlocker];

  return {
    mandatoryTotal,
    mandatoryComplete,
    blockingDocs,
    isReady: blockingDocs.length === 0,
  };
}
