import type { SubmitGatingInfo, IntakeCompleteness, DoctorReview } from '../types';

export function getSubmitGatingInfo(
  intakeCompleteness: IntakeCompleteness | null,
  documentsReady: boolean,
  doctorReview: DoctorReview | null
): SubmitGatingInfo {
  const blockedBy: string[] = [];
  const details = {
    fundAppComplete: intakeCompleteness?.fundAppIsComplete ?? false,
    interimSummaryComplete: intakeCompleteness?.interimSummaryIsComplete ?? false,
    documentsReady,
    doctorReviewApproved: doctorReview?.outcome === 'Approved' || doctorReview?.outcome === 'Approved_With_Comments',
  };

  if (!details.fundAppComplete) {
    blockedBy.push('Fund Application incomplete');
  }
  if (!details.interimSummaryComplete) {
    blockedBy.push('Interim Summary incomplete');
  }
  if (!details.documentsReady) {
    blockedBy.push('Required documents missing or not verified');
  }
  if (!details.doctorReviewApproved) {
    blockedBy.push('Clinical Review: Not approved');
  }

  return {
    canSubmit: blockedBy.length === 0,
    blockedBy,
    details,
  };
}

export function getDoctorReviewGatingInfo(
  doctorReview: DoctorReview | null
): { canSendToCommittee: boolean; reason?: string } {
  if (!doctorReview) {
    return {
      canSendToCommittee: false,
      reason: 'No clinical review assigned',
    };
  }

  if (!doctorReview.submittedAt) {
    return {
      canSendToCommittee: false,
      reason: 'Clinical review not yet submitted',
    };
  }

  if (doctorReview.outcome === 'Returned') {
    return {
      canSendToCommittee: false,
      reason: 'Clinical review returned for revisions',
    };
  }

  if (doctorReview.outcome === 'Approved' || doctorReview.outcome === 'Approved_With_Comments') {
    return {
      canSendToCommittee: true,
    };
  }

  return {
    canSendToCommittee: false,
    reason: 'Clinical review pending',
  };
}
