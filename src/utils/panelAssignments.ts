import type { PanelAssignmentType, WorkflowExtensions, WorkflowPanelAssignment } from '../types';

export const PANEL_ASSIGNMENT_ORDER: PanelAssignmentType[] = ['clinical', 'social', 'financial'];

export const PANEL_ASSIGNMENT_META: Record<
  PanelAssignmentType,
  {
    title: string;
    subtitle: string;
    defaultPanelName: string;
  }
> = {
  clinical: {
    title: 'Clinical Review',
    subtitle: 'Clinical reviewer / panel',
    defaultPanelName: 'Clinical Panel',
  },
  social: {
    title: 'Social Review',
    subtitle: 'Social reviewer / panel',
    defaultPanelName: 'Social Panel',
  },
  financial: {
    title: 'Financial Review',
    subtitle: 'Financial reviewer / panel',
    defaultPanelName: 'Financial Panel',
  },
};

export type PanelAssignmentFormState = Record<
  PanelAssignmentType,
  {
    reviewerName: string;
    panelName: string;
    notes: string;
  }
>;

export function buildPanelAssignmentState(
  assignments?: WorkflowExtensions['panelAssignments']
): PanelAssignmentFormState {
  return PANEL_ASSIGNMENT_ORDER.reduce((acc, panelType) => {
    const assignment = assignments?.[panelType];
    acc[panelType] = {
      reviewerName: assignment?.reviewerName || '',
      panelName: assignment?.panelName || PANEL_ASSIGNMENT_META[panelType].defaultPanelName,
      notes: assignment?.notes || '',
    };
    return acc;
  }, {} as PanelAssignmentFormState);
}

export function buildPanelAssignmentsPayload(
  state: PanelAssignmentFormState,
  existing?: WorkflowExtensions['panelAssignments'],
  actor?: string
): WorkflowExtensions['panelAssignments'] {
  const now = new Date().toISOString();

  return PANEL_ASSIGNMENT_ORDER.reduce((acc, panelType) => {
    const previous = existing?.[panelType];
    const next = state[panelType];

    acc[panelType] = {
      panelType,
      reviewerUserId: previous?.reviewerUserId,
      reviewerName: next.reviewerName.trim() || undefined,
      panelName: next.panelName.trim() || PANEL_ASSIGNMENT_META[panelType].defaultPanelName,
      notes: next.notes.trim() || undefined,
      assignedAt: now,
      assignedBy: actor || previous?.assignedBy,
    } satisfies WorkflowPanelAssignment;

    return acc;
  }, {} as NonNullable<WorkflowExtensions['panelAssignments']>);
}

export function getReviewerAssignmentSummary(assignment?: WorkflowPanelAssignment): string {
  if (assignment?.reviewerName?.trim()) {
    return assignment.reviewerName.trim();
  }
  if (assignment?.panelName?.trim()) {
    return `${assignment.panelName.trim()} placeholder`;
  }
  return 'Not assigned';
}

export function remapCommitteeLabel(value?: string | null, fallback = 'Panel'): string {
  if (!value) return fallback;
  return value.replace(/Committee/g, 'Panel').replace(/committee/g, 'panel');
}
