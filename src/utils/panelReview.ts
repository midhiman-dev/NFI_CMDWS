import type {
  PanelOverallDecision,
  PanelReviewDecision,
  PanelReviewStatus,
  WorkflowExtensions,
  WorkflowPanelAssignment,
  WorkflowPanelDecisionSummary,
  WorkflowPanelReview,
} from '../types';
import { PANEL_ASSIGNMENT_META, PANEL_ASSIGNMENT_ORDER } from './panelAssignments';

export function getPanelDecisionOptions(): PanelReviewDecision[] {
  return ['Pending', 'Approve', 'Return', 'Reject'];
}

export function isPanelComplete(review?: WorkflowPanelReview | null): boolean {
  return !!review?.completedAt;
}

export function getPanelStatus(review?: WorkflowPanelReview | null): PanelReviewStatus {
  if (!review) return 'Not started';

  if (review.completedAt) {
    if (review.decision === 'Reject') return 'Rejected';
    if (review.decision === 'Return') return 'Returned';
    if (review.decision === 'Approve') return 'Approved recommendation';
    return 'Reviewed';
  }

  if (review.remarks?.trim() || review.reviewedAt || (review.decision && review.decision !== 'Pending')) {
    return 'In progress';
  }

  return 'Not started';
}

export function getAssignedPanelReviewer(assignment?: WorkflowPanelAssignment | null): string {
  if (assignment?.reviewerName?.trim()) return assignment.reviewerName.trim();
  return 'Not assigned';
}

export function getOverallPanelDecision(
  panelReviews?: WorkflowExtensions['panelReviews']
): WorkflowPanelDecisionSummary {
  const completedPanels = PANEL_ASSIGNMENT_ORDER.filter((panelType) => isPanelComplete(panelReviews?.[panelType])).length;
  const totalPanels = PANEL_ASSIGNMENT_ORDER.length;

  if (completedPanels < totalPanels) {
    return {
      overallDecision: 'Pending',
      readinessLabel: `Pending panel reviews (${completedPanels}/${totalPanels} completed)`,
      completedPanels,
      totalPanels,
      mixedRecommendations: false,
    };
  }

  const completedDecisions = PANEL_ASSIGNMENT_ORDER.map((panelType) => panelReviews?.[panelType]?.decision || 'Pending');
  const uniqueDecisions = Array.from(new Set(completedDecisions));

  if (uniqueDecisions.length > 1) {
    return {
      overallDecision: 'Needs Resolution',
      readinessLabel: 'All panel reviews are complete, but recommendations conflict',
      completedPanels,
      totalPanels,
      mixedRecommendations: true,
    };
  }

  const finalDecision = uniqueDecisions[0];

  if (finalDecision === 'Approve') {
    return {
      overallDecision: 'Ready for Final Approval',
      readinessLabel: 'All three panels approved',
      completedPanels,
      totalPanels,
      mixedRecommendations: false,
    };
  }

  if (finalDecision === 'Reject') {
    return {
      overallDecision: 'Reject Recommended',
      readinessLabel: 'All three panels completed with rejection recommendation',
      completedPanels,
      totalPanels,
      mixedRecommendations: false,
    };
  }

  if (finalDecision === 'Return') {
    return {
      overallDecision: 'Return Recommended',
      readinessLabel: 'All three panels completed with return recommendation',
      completedPanels,
      totalPanels,
      mixedRecommendations: false,
    };
  }

  return {
    overallDecision: 'Pending',
    readinessLabel: 'Panel decisions are recorded but not ready for consolidation',
    completedPanels,
    totalPanels,
    mixedRecommendations: false,
  };
}

export function buildPanelSummary(
  panelReviews?: WorkflowExtensions['panelReviews'],
  panelAssignments?: WorkflowExtensions['panelAssignments']
) {
  return PANEL_ASSIGNMENT_ORDER.map((panelType) => {
    const review = panelReviews?.[panelType];
    const assignment = panelAssignments?.[panelType];

    return {
      panelType,
      title: PANEL_ASSIGNMENT_META[panelType].title,
      panelLabel: assignment?.panelName || PANEL_ASSIGNMENT_META[panelType].defaultPanelName,
      reviewerLabel: getAssignedPanelReviewer(assignment),
      decision: review?.decision || 'Pending',
      status: getPanelStatus(review),
      completed: isPanelComplete(review),
      updatedAt: review?.completedAt || review?.lastUpdatedAt || assignment?.assignedAt,
    };
  });
}

export function getOverallDecisionTone(decision: PanelOverallDecision): 'neutral' | 'warning' | 'success' | 'error' {
  if (decision === 'Ready for Final Approval') return 'success';
  if (decision === 'Reject Recommended') return 'error';
  if (decision === 'Return Recommended' || decision === 'Needs Resolution') return 'warning';
  return 'neutral';
}
