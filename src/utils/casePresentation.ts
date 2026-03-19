import type { CaseStatus } from '../types';

const PRIMARY_ORDER: CaseStatus[] = ['Under_Review', 'Returned', 'Approved', 'Rejected', 'Closed'];
const SECONDARY_ORDER: CaseStatus[] = ['Draft', 'Submitted', 'Under_Verification'];

export function formatBabyDisplayName(
  motherName?: string | null,
  fallbackName?: string | null,
  options?: { compact?: boolean }
): string {
  const trimmedMotherName = motherName?.trim();
  if (trimmedMotherName) {
    return options?.compact ? `BO - ${trimmedMotherName}` : `Baby of ${trimmedMotherName}`;
  }

  const trimmedFallback = fallbackName?.trim();
  return trimmedFallback || 'Baby details pending';
}

export function getOrderedCaseStatuses(statuses: CaseStatus[]): CaseStatus[] {
  const uniqueStatuses = Array.from(new Set(statuses));
  const order = [...PRIMARY_ORDER, ...SECONDARY_ORDER];

  return uniqueStatuses.sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

export function isNewCase(createdAt?: string | null, now = new Date()): boolean {
  if (!createdAt) return false;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const diffMs = now.getTime() - created.getTime();
  return diffMs >= 0 && diffMs <= sevenDaysMs;
}
