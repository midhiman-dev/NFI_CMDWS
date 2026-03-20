import { getFollowupQuestionnaire } from './followupQuestionnaires';
import { getAuthState } from './auth';
import { providerFactory } from '../data/providers/ProviderFactory';
import { mockStore } from '../store/mockStore';
import { caseService } from '../services/caseService';
import type { AuditEvent, UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  hospital_spoc: 'Hospital SPOC',
  clinical: 'Clinical',
  clinical_reviewer: 'Clinical Reviewer',
  hospital_doctor: 'Hospital Doctor',
  verifier: 'Verifier',
  committee_member: 'Committee Member',
  accounts: 'Accounts',
  beni_volunteer: 'BENI Volunteer',
  leadership: 'Leadership',
  admin: 'Admin',
};

type AuditInput = {
  caseId: string;
  action: string;
  notes?: string;
  timestamp?: string;
};

export function getRoleLabel(role?: UserRole | null): string {
  if (!role) return 'User';
  return ROLE_LABELS[role] || 'User';
}

export function getAuditActorDisplayName(actor?: string | null, role?: UserRole | null): string {
  if (actor && !/^user[-_]/i.test(actor) && !/^[0-9a-f-]{12,}$/i.test(actor)) {
    return actor;
  }
  return getRoleLabel(role);
}

export async function logAuditEvent({ caseId, action, notes, timestamp }: AuditInput): Promise<void> {
  const authState = getAuthState();
  const actor = authState.activeUser;
  const actorRole = authState.activeRole || actor?.roles?.[0] || 'admin';
  const actorLabel = actor?.fullName || getRoleLabel(actorRole);
  const eventTimestamp = timestamp || new Date().toISOString();

  const event: Omit<AuditEvent, 'eventId'> = {
    caseId,
    timestamp: eventTimestamp,
    userId: actorLabel,
    userRole: actorRole,
    action,
    notes,
  };

  try {
    const mode = providerFactory.getMode();
    if (mode === 'DEMO') {
      mockStore.addAuditEvent(event);
      return;
    }
  } catch {
    mockStore.addAuditEvent(event);
    return;
  }

  await caseService.addAuditEvent({
    ...event,
    userId: actor?.userId || actorLabel,
  });
}

export async function getAuditEvents(caseId: string): Promise<AuditEvent[]> {
  try {
    const mode = providerFactory.getMode();
    if (mode === 'DEMO') {
      return mockStore.getAuditEvents(caseId);
    }
  } catch {
    return mockStore.getAuditEvents(caseId);
  }

  return caseService.getAuditEvents(caseId);
}

const FUND_SECTION_LABELS: Record<string, string> = {
  parentsFamilySection: 'Parents & Family',
  occupationIncomeSection: 'Occupation & Income',
  birthDetailsSection: 'Birth Details',
  nicuFinancialSection: 'NICU & Financial',
  otherSupportSection: 'Other Support',
  declarationsSection: 'Declarations',
  hospitalApprovalSection: 'Hospital Approval',
};

const INTERIM_SECTION_LABELS: Record<string, string> = {
  birthSummarySection: 'Birth Summary',
  maternalDetailsSection: 'Maternal Details',
  antenatalRiskFactorsSection: 'Antenatal Risk Factors',
  diagnosisSection: 'Diagnosis',
  treatmentGivenSection: 'Treatment Given',
  currentStatusSection: 'Current Status',
  feedingRespirationSection: 'Ongoing Treatment',
  dischargePlanInvestigationsSection: 'Discharge Plan & Investigations',
  remarksSignatureSection: 'Remarks & Signature',
};

export function getFundSectionLabel(sectionKey: string): string {
  return FUND_SECTION_LABELS[sectionKey] || 'Fund Application';
}

export function getInterimSectionLabel(sectionKey: string): string {
  return INTERIM_SECTION_LABELS[sectionKey] || 'Interim Summary';
}

export function getFollowupAuditLabel(milestoneMonths: number): string {
  return getFollowupQuestionnaire(milestoneMonths).milestoneLabel;
}
