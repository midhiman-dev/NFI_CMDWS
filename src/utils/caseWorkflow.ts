import type { CaseStatus } from '../types';

const WORKFLOW_STORAGE_KEY = 'nfi_demo_case_workflow_v1';

export interface CaseWorkflowEvent {
  eventId: string;
  caseId: string;
  fromStatus?: CaseStatus;
  toStatus: CaseStatus;
  changedAt: string;
  changedBy?: string;
  changedByRole?: string;
  reason?: string;
  source?: string;
}

type WorkflowStore = Record<string, CaseWorkflowEvent[]>;

function safeParseStore(raw: string | null): WorkflowStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as WorkflowStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function asTime(value?: string): number {
  if (!value) return 0;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

export function loadWorkflowStore(): WorkflowStore {
  return safeParseStore(localStorage.getItem(WORKFLOW_STORAGE_KEY));
}

export function saveWorkflowStore(store: WorkflowStore): void {
  localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(store));
}

export function listCaseWorkflowEvents(caseId: string): CaseWorkflowEvent[] {
  const store = loadWorkflowStore();
  const events = store[caseId] || [];
  return [...events].sort((a, b) => asTime(b.changedAt) - asTime(a.changedAt));
}

export function appendCaseWorkflowEvent(
  caseId: string,
  event: Omit<CaseWorkflowEvent, 'eventId' | 'caseId'>
): CaseWorkflowEvent {
  const store = loadWorkflowStore();
  const next: CaseWorkflowEvent = {
    eventId: `wf-${caseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    caseId,
    ...event,
  };
  const current = store[caseId] || [];
  store[caseId] = [...current, next].sort((a, b) => asTime(a.changedAt) - asTime(b.changedAt));
  saveWorkflowStore(store);
  return next;
}

function isForwardAfterReturn(status: CaseStatus): boolean {
  return ['Submitted', 'Under_Verification', 'Under_Review', 'Approved', 'Closed', 'Rejected'].includes(status);
}

export function getLatestReturnedEvent(events: CaseWorkflowEvent[]): CaseWorkflowEvent | null {
  const sorted = [...events].sort((a, b) => asTime(b.changedAt) - asTime(a.changedAt));
  return sorted.find((e) => e.toStatus === 'Returned') || null;
}

export function getLatestRejectedEvent(events: CaseWorkflowEvent[]): CaseWorkflowEvent | null {
  const sorted = [...events].sort((a, b) => asTime(b.changedAt) - asTime(a.changedAt));
  return sorted.find((e) => e.toStatus === 'Rejected') || null;
}

export function getHospitalDisplayStatus(caseStatus: CaseStatus, events: CaseWorkflowEvent[]): CaseStatus {
  if (caseStatus === 'Returned' || caseStatus === 'Rejected') {
    return caseStatus;
  }
  if (caseStatus !== 'Draft') {
    return caseStatus;
  }

  const latestReturn = getLatestReturnedEvent(events);
  if (!latestReturn) return caseStatus;

  const returnTime = asTime(latestReturn.changedAt);
  const hasForwardTransition = events.some(
    (e) => asTime(e.changedAt) > returnTime && isForwardAfterReturn(e.toStatus)
  );
  return hasForwardTransition ? caseStatus : 'Returned';
}
