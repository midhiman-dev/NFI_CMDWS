import type { CaseStatus, UserRole } from '../types';

const APPROVED_CASE_STATUSES = new Set<CaseStatus>(['Approved', 'Closed']);
const BENEFICIARY_NUMBER_PATTERN = /^NFI-BN-(\d{4})-(\d{6})$/;

export interface PrototypeIdentifierInput {
  caseRef?: string | number | null;
  caseReferenceSerial?: number | null;
  beneficiaryNo?: string | null;
  beneficiaryNumberAllocatedAt?: string | null;
  caseStatus?: CaseStatus | null;
  decisionAt?: string | null;
  intakeDate?: string | null;
}

export interface PrototypeIdentifierState {
  caseReferenceSerial?: number;
  caseRef: string;
  beneficiaryNo?: string;
  beneficiaryNumberAllocatedAt?: string;
}

export function parseCaseReferenceSerial(value?: string | number | null): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  const normalized = String(value || '').trim();
  if (!normalized) return undefined;

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  const matches = normalized.match(/(\d+)/g);
  if (!matches?.length) return undefined;

  const lastSegment = matches[matches.length - 1];
  const parsed = Number.parseInt(lastSegment, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function formatCaseReference(value?: string | number | null): string {
  const serial = parseCaseReferenceSerial(value);
  return serial ? String(serial) : '';
}

export function generatePrototypeCaseReference(serial: number): string {
  return formatCaseReference(serial);
}

export function isApprovedForBeneficiaryNumber(status?: CaseStatus | null): boolean {
  return status ? APPROVED_CASE_STATUSES.has(status) : false;
}

export function parseBeneficiaryNumber(value?: string | null): { year: number; serial: number } | undefined {
  const match = String(value || '').trim().match(BENEFICIARY_NUMBER_PATTERN);
  if (!match) return undefined;

  return {
    year: Number.parseInt(match[1], 10),
    serial: Number.parseInt(match[2], 10),
  };
}

export function formatBeneficiaryNumber(year: number, serial: number): string {
  return `NFI-BN-${year}-${String(serial).padStart(6, '0')}`;
}

export function generatePrototypeBeneficiaryNumber(input: {
  serial: number;
  approvedAt?: string | null;
  intakeDate?: string | null;
  existingBeneficiaryNo?: string | null;
}): string {
  const existing = parseBeneficiaryNumber(input.existingBeneficiaryNo);
  if (existing) {
    return formatBeneficiaryNumber(existing.year, existing.serial);
  }

  const yearSource = input.approvedAt || input.intakeDate;
  const resolvedDate = yearSource ? new Date(yearSource) : new Date();
  const year = Number.isNaN(resolvedDate.getTime()) ? new Date().getFullYear() : resolvedDate.getFullYear();
  return formatBeneficiaryNumber(year, input.serial);
}

export function shouldShowBeneficiaryNo(role?: UserRole | null, status?: CaseStatus | null): boolean {
  if (!role || role === 'hospital_spoc') return false;
  return isApprovedForBeneficiaryNumber(status);
}

export function resolvePrototypeIdentifiers(input: PrototypeIdentifierInput): PrototypeIdentifierState {
  const caseReferenceSerial = input.caseReferenceSerial ?? parseCaseReferenceSerial(input.caseRef);
  const caseRef = caseReferenceSerial ? formatCaseReference(caseReferenceSerial) : formatCaseReference(input.caseRef);
  const beneficiaryNumberAllocatedAt = isApprovedForBeneficiaryNumber(input.caseStatus)
    ? input.beneficiaryNumberAllocatedAt || input.decisionAt || input.intakeDate || undefined
    : undefined;
  const beneficiaryNo = isApprovedForBeneficiaryNumber(input.caseStatus) && caseReferenceSerial
    ? generatePrototypeBeneficiaryNumber({
        serial: caseReferenceSerial,
        approvedAt: beneficiaryNumberAllocatedAt,
        intakeDate: input.intakeDate,
        existingBeneficiaryNo: input.beneficiaryNo,
      })
    : undefined;

  return {
    caseReferenceSerial,
    caseRef,
    beneficiaryNo,
    beneficiaryNumberAllocatedAt,
  };
}
