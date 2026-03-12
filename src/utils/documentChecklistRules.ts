import type { ChecklistReadiness, DocumentWithTemplate } from '../data/providers/DataProvider';
import { MANDATORY_DOCUMENTS } from '../data/mandatoryDocuments';

export const PRIMARY_FINANCE_PROOF_DOC_TYPES = [
  'Father Bank Statement',
  'Income Certificate',
  'Talati/Govt Economic Card',
] as const;

export const FINANCE_PROOF_BLOCKER_LABEL =
  'Primary financial proof missing (upload any one: Father Bank Statement OR Income Certificate OR Talati/Govt Economic Card)';

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
  const mandatoryDocIds = new Set(
    MANDATORY_DOCUMENTS.map((doc) => `${doc.category}-${doc.docType}`)
  );

  const requiredIndividualDocs = docs.filter((doc) =>
    mandatoryDocIds.has(`${doc.category}-${doc.docType}`)
  );

  const requiredBlockingDocs = requiredIndividualDocs.filter((doc) => !isDocSatisfied(doc));

  const primaryFinanceDocs = docs.filter((doc) =>
    PRIMARY_FINANCE_PROOF_DOC_TYPES.some((type) => type === doc.docType)
  );
  const hasPrimaryFinanceProof = primaryFinanceDocs.some((doc) => isDocSatisfied(doc));

  const financeCompositeBlocker: DocumentWithTemplate[] = hasPrimaryFinanceProof
    ? []
    : [{
      docId: '__finance-primary-proof__',
      caseId: docs[0]?.caseId || '',
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
