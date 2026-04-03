import type {
  FinancialCaseDetails,
  IntakeFundApplication,
  SettlementRecord,
  VarianceDirection,
  VarianceGovernanceStatus,
  WorkflowExtensions,
  WorkflowVarianceGovernance,
} from '../types';

const DEFAULT_TOLERANCE_PERCENT = 10;

export interface VarianceGovernanceEvaluation {
  baselineAmount: number | null;
  finalBillAmount: number | null;
  varianceAmount: number | null;
  variancePercent: number | null;
  varianceDirection: VarianceDirection;
  tolerancePercent: number;
  status: VarianceGovernanceStatus;
  directorReviewRequired: boolean;
  governanceMessage: string;
  governanceBadge: string;
  gatingReason?: string;
}

type VarianceGovernanceInput = {
  settlement?: SettlementRecord | null;
  financialData?: FinancialCaseDetails | null;
  workflowExt?: WorkflowExtensions | null;
  fundApplication?: Partial<IntakeFundApplication>;
  baselineAmount?: number | null;
  finalBillAmount?: number | null;
};

function toPositiveAmount(value?: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function resolveVarianceBaselineAmount(input: VarianceGovernanceInput): number | null {
  const { settlement, financialData, fundApplication, baselineAmount } = input;
  return (
    toPositiveAmount(baselineAmount) ??
    toPositiveAmount(settlement?.referenceAmount) ??
    toPositiveAmount(financialData?.nfiRequestedAmount) ??
    toPositiveAmount(fundApplication?.nicuFinancialSection?.nfiRequestedAmount) ??
    toPositiveAmount(financialData?.estimateAmount) ??
    toPositiveAmount(fundApplication?.nicuFinancialSection?.estimateAfterDiscount) ??
    toPositiveAmount(fundApplication?.nicuFinancialSection?.totalEstimatedHospitalBill) ??
    toPositiveAmount(fundApplication?.nicuFinancialSection?.estimateBilled) ??
    null
  );
}

export function resolveVarianceFinalBillAmount(input: VarianceGovernanceInput): number | null {
  return toPositiveAmount(input.finalBillAmount) ?? toPositiveAmount(input.settlement?.finalBillAmount) ?? null;
}

function hasCompletedDirectorReview(varianceGovernance?: WorkflowVarianceGovernance | null): boolean {
  return !!(varianceGovernance?.directorDecision && varianceGovernance?.reviewedAt && varianceGovernance?.reviewedBy);
}

export function evaluateVarianceGovernance(input: VarianceGovernanceInput): VarianceGovernanceEvaluation {
  const tolerancePercent = input.workflowExt?.varianceGovernance?.tolerancePercent ?? DEFAULT_TOLERANCE_PERCENT;
  const baselineAmount = resolveVarianceBaselineAmount(input);
  const finalBillAmount = resolveVarianceFinalBillAmount(input);

  if (!baselineAmount || !finalBillAmount) {
    return {
      baselineAmount,
      finalBillAmount,
      varianceAmount: null,
      variancePercent: null,
      varianceDirection: 'pending',
      tolerancePercent,
      status: 'pending_data',
      directorReviewRequired: false,
      governanceMessage: 'Variance check pending final bill/reference amount.',
      governanceBadge: 'Pending data',
    };
  }

  const varianceAmount = finalBillAmount - baselineAmount;
  const variancePercent = roundPercent((Math.abs(varianceAmount) / baselineAmount) * 100);
  const varianceDirection: VarianceDirection =
    varianceAmount > 0 ? 'increase' : varianceAmount < 0 ? 'decrease' : 'no_change';

  if (variancePercent <= tolerancePercent) {
    return {
      baselineAmount,
      finalBillAmount,
      varianceAmount,
      variancePercent,
      varianceDirection,
      tolerancePercent,
      status: 'within_tolerance',
      directorReviewRequired: false,
      governanceMessage: `Variance is within the ${tolerancePercent}% governance tolerance.`,
      governanceBadge: 'Within tolerance',
    };
  }

  if (hasCompletedDirectorReview(input.workflowExt?.varianceGovernance)) {
    return {
      baselineAmount,
      finalBillAmount,
      varianceAmount,
      variancePercent,
      varianceDirection,
      tolerancePercent,
      status: 'director_review_completed',
      directorReviewRequired: true,
      governanceMessage: 'Variance exceeds tolerance and Director review has been completed.',
      governanceBadge: 'Director review completed',
    };
  }

  return {
    baselineAmount,
    finalBillAmount,
    varianceAmount,
    variancePercent,
    varianceDirection,
    tolerancePercent,
    status: 'director_review_required',
    directorReviewRequired: true,
    governanceMessage: `Variance exceeds ${tolerancePercent}%. Director review is required before final settlement approval/closure.`,
    governanceBadge: 'Director review required',
    gatingReason: `Variance exceeds ${tolerancePercent}%. Director review must be completed before final approval or closure.`,
  };
}

export function getVarianceStatusTone(status: VarianceGovernanceStatus): 'neutral' | 'success' | 'warning' {
  if (status === 'within_tolerance' || status === 'director_review_completed') {
    return 'success';
  }
  if (status === 'director_review_required') {
    return 'warning';
  }
  return 'neutral';
}

export function getVarianceDirectionLabel(direction: VarianceDirection): string {
  if (direction === 'increase') return 'Final bill above estimate';
  if (direction === 'decrease') return 'Final bill below estimate';
  if (direction === 'no_change') return 'No variance';
  return 'Pending data';
}

export function formatVariancePercent(value: number | null): string {
  return value === null ? 'Pending' : `${value}%`;
}

export function formatVarianceCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const prefix = value > 0 ? '+Rs ' : value < 0 ? '-Rs ' : 'Rs ';
  return `${prefix}${Math.abs(value).toLocaleString()}`;
}

export function buildVarianceGovernanceSnapshot(
  evaluation: VarianceGovernanceEvaluation,
  existing?: WorkflowVarianceGovernance | null
): WorkflowVarianceGovernance {
  return {
    tolerancePercent: evaluation.tolerancePercent,
    baselineAmount: evaluation.baselineAmount,
    finalBillAmount: evaluation.finalBillAmount,
    varianceAmount: evaluation.varianceAmount,
    variancePercent: evaluation.variancePercent,
    varianceDirection: evaluation.varianceDirection,
    status: evaluation.status,
    directorReviewRequired: evaluation.directorReviewRequired,
    directorDecision: existing?.directorDecision,
    revisedSanctionAmount: existing?.revisedSanctionAmount ?? null,
    directorRemarks: existing?.directorRemarks,
    reviewedBy: existing?.reviewedBy ?? null,
    reviewedAt: existing?.reviewedAt ?? null,
  };
}
