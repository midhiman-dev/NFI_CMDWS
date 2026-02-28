import type { DocumentWithTemplate, DocVersion } from '../types';
import type { UserRole } from '../types';

export function isDocSatisfied(doc: DocumentWithTemplate): boolean {
  const latestVersion = doc.versions?.[doc.versions.length - 1];
  const status = latestVersion?.status || doc.status;
  return status === 'Verified' || status === 'Not_Applicable' || status === 'Uploaded';
}

export function getLatestVersion(doc: DocumentWithTemplate): DocVersion | null {
  if (!doc.versions || doc.versions.length === 0) {
    if (doc.uploadedAt && doc.uploadedBy) {
      return {
        versionNo: 1,
        fileName: doc.fileName || 'Unknown',
        fileType: doc.fileType,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.uploadedBy,
        status: doc.status,
      };
    }
    return null;
  }
  return doc.versions[doc.versions.length - 1];
}

export function getVisibleCategories(userRole: UserRole | null): string[] {
  if (!userRole) return ['GENERAL', 'FINANCE', 'MEDICAL', 'FINAL'];

  switch (userRole) {
    case 'hospital_spoc':
    case 'verifier':
    case 'committee_member':
    case 'accounts':
    case 'admin':
    case 'leadership':
      return ['GENERAL', 'FINANCE', 'MEDICAL', 'FINAL'];
    case 'clinical':
      return ['MEDICAL'];
    case 'beni_volunteer':
      return ['GENERAL', 'MEDICAL', 'FINAL'];
    default:
      return ['GENERAL', 'FINANCE', 'MEDICAL', 'FINAL'];
  }
}

export function isRestrictedRole(userRole: UserRole | null): boolean {
  return false;
}
