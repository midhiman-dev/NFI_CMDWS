import type { IntakeFundApplication } from '../types';

export const MONTHLY_INCOME_THRESHOLD = 40000;

export type IncomeCaptureMode = 'monthly_primary' | 'daily_primary' | 'either';
export type ResolvedIncomeBasis = 'monthly' | 'daily' | 'none';

export interface ParentIncomeResolution {
  parent: 'Father' | 'Mother';
  occupation?: string;
  captureMode: IncomeCaptureMode;
  basis: ResolvedIncomeBasis;
  selectedValue?: number;
  monthlyIncome?: number;
  dailyIncome?: number;
  reviewNote?: string;
}

export interface IncomeThresholdEvaluation {
  captureBasis: 'monthly' | 'daily' | 'mixed' | 'not_captured';
  father: ParentIncomeResolution;
  mother: ParentIncomeResolution;
  combinedMonthlyIncome?: number;
  thresholdExceeded: boolean;
  manualReviewRequired: boolean;
  exceptionReviewRecommended: boolean;
  badgeLabel: string;
  badgeTone: 'success' | 'warning' | 'neutral';
  thresholdOutcomeLabel: string;
  warningBanner?: string;
  financialReviewNote: string;
  reviewNotes: string[];
}

export interface FinancialReviewSummaryRow {
  label: string;
  value: string;
}

const MONTHLY_KEYWORDS = [
  'salary',
  'salaried',
  'teacher',
  'engineer',
  'manager',
  'executive',
  'officer',
  'staff',
  'employee',
  'accountant',
  'clerk',
  'nurse',
  'government',
  'private job',
  'office',
  'supervisor',
];

const DAILY_KEYWORDS = [
  'daily',
  'wage',
  'labour',
  'labor',
  'construction',
  'mason',
  'driver',
  'helper',
  'vendor',
  'hawker',
  'maid',
  'domestic',
  'farmer',
  'agric',
  'coolie',
  'casual',
  'housekeeping',
  'loader',
  'security guard',
];

function normalizeOccupation(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function isPresentNumber(value?: number): value is number {
  return value !== undefined && value !== null && Number.isFinite(value);
}

function formatCurrency(value?: number): string {
  if (!isPresentNumber(value)) return 'Not provided';
  return `INR ${value.toLocaleString()}`;
}

export function getIncomeCaptureModeByOccupation(occupation?: string): IncomeCaptureMode {
  const normalized = normalizeOccupation(occupation);
  if (!normalized) return 'either';

  if (DAILY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'daily_primary';
  }

  if (MONTHLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'monthly_primary';
  }

  return 'either';
}

export function resolvePrimaryIncomeBasis(input: {
  parent: 'Father' | 'Mother';
  occupation?: string;
  monthlyIncome?: number;
  dailyIncome?: number;
}): ParentIncomeResolution {
  const { parent, occupation, monthlyIncome, dailyIncome } = input;
  const captureMode = getIncomeCaptureModeByOccupation(occupation);
  const hasMonthly = isPresentNumber(monthlyIncome);
  const hasDaily = isPresentNumber(dailyIncome);

  if (!hasMonthly && !hasDaily) {
    return {
      parent,
      occupation,
      captureMode,
      basis: 'none',
      monthlyIncome,
      dailyIncome,
    };
  }

  if (hasMonthly && hasDaily) {
    if (captureMode === 'daily_primary') {
      return {
        parent,
        occupation,
        captureMode,
        basis: 'daily',
        selectedValue: dailyIncome,
        monthlyIncome,
        dailyIncome,
        reviewNote: `${parent} has both monthly income and daily wage recorded. Daily wage is being treated as the primary capture basis for this occupation.`,
      };
    }

    return {
      parent,
      occupation,
      captureMode,
      basis: 'monthly',
      selectedValue: monthlyIncome,
      monthlyIncome,
      dailyIncome,
      reviewNote: captureMode === 'monthly_primary'
        ? `${parent} has both monthly income and daily wage recorded. Monthly income is being treated as the primary capture basis for this occupation.`
        : `${parent} has both monthly income and daily wage recorded. Monthly income is being used for now and the entry should be reviewed.`,
    };
  }

  if (hasMonthly) {
    return {
      parent,
      occupation,
      captureMode,
      basis: 'monthly',
      selectedValue: monthlyIncome,
      monthlyIncome,
      dailyIncome,
    };
  }

  return {
    parent,
    occupation,
    captureMode,
    basis: 'daily',
    selectedValue: dailyIncome,
    monthlyIncome,
    dailyIncome,
  };
}

export function shouldRequireManualIncomeReview(evaluation: IncomeThresholdEvaluation): boolean {
  return evaluation.manualReviewRequired;
}

export function evaluateIncomeThreshold(
  section?: IntakeFundApplication['occupationIncomeSection']
): IncomeThresholdEvaluation {
  const father = resolvePrimaryIncomeBasis({
    parent: 'Father',
    occupation: section?.fatherOccupation,
    monthlyIncome: section?.fatherMonthlyIncome,
    dailyIncome: section?.fatherDailyIncome,
  });
  const mother = resolvePrimaryIncomeBasis({
    parent: 'Mother',
    occupation: section?.motherOccupation,
    monthlyIncome: section?.motherMonthlyIncome,
    dailyIncome: section?.motherDailyIncome,
  });

  const reviewNotes = [father.reviewNote, mother.reviewNote].filter(Boolean) as string[];
  const resolvedParents = [father, mother];
  const hasDailyBasis = resolvedParents.some((entry) => entry.basis === 'daily');
  const hasMonthlyBasis = resolvedParents.some((entry) => entry.basis === 'monthly');
  const captureBasis =
    hasDailyBasis && hasMonthlyBasis
      ? 'mixed'
      : hasDailyBasis
      ? 'daily'
      : hasMonthlyBasis
      ? 'monthly'
      : 'not_captured';

  const combinedMonthlyIncome = captureBasis === 'monthly'
    ? resolvedParents.reduce((sum, entry) => sum + (entry.basis === 'monthly' ? entry.selectedValue || 0 : 0), 0)
    : undefined;

  const thresholdExceeded = captureBasis === 'monthly'
    && isPresentNumber(combinedMonthlyIncome)
    && combinedMonthlyIncome > MONTHLY_INCOME_THRESHOLD;

  const manualReviewRequired =
    thresholdExceeded
    || captureBasis === 'daily'
    || captureBasis === 'mixed'
    || reviewNotes.length > 0;

  if (thresholdExceeded) {
    return {
      captureBasis,
      father,
      mother,
      combinedMonthlyIncome,
      thresholdExceeded,
      manualReviewRequired,
      exceptionReviewRecommended: true,
      badgeLabel: 'Manual Review Required',
      badgeTone: 'warning',
      thresholdOutcomeLabel: 'Combined parent monthly income exceeds INR 40,000',
      warningBanner: 'Income threshold exceeded. The case remains reviewable and must go through manual financial review.',
      financialReviewNote: 'Combined father and mother monthly income is above the INR 40,000 threshold. Keep the case in review and route it through manual financial review or exception handling.',
      reviewNotes,
    };
  }

  if (captureBasis === 'daily') {
    return {
      captureBasis,
      father,
      mother,
      combinedMonthlyIncome,
      thresholdExceeded: false,
      manualReviewRequired: true,
      exceptionReviewRecommended: false,
      badgeLabel: 'Financial Review Required',
      badgeTone: 'warning',
      thresholdOutcomeLabel: 'Daily wage captured without monthly conversion',
      warningBanner: 'Daily wage income has been captured. No monthly conversion is applied in this prototype, so the case needs manual financial review.',
      financialReviewNote: 'Parent income is captured as daily wage. No slab or monthly-equivalent formula is applied. A financial reviewer should interpret the income details manually.',
      reviewNotes,
    };
  }

  if (captureBasis === 'mixed') {
    return {
      captureBasis,
      father,
      mother,
      combinedMonthlyIncome,
      thresholdExceeded: false,
      manualReviewRequired: true,
      exceptionReviewRecommended: false,
      badgeLabel: 'Income Review Note',
      badgeTone: 'warning',
      thresholdOutcomeLabel: 'Mixed income capture needs manual review',
      warningBanner: 'This case includes a mix of monthly income and daily wage capture. The occupation-aligned entries are being used, and the case should be reviewed manually.',
      financialReviewNote: 'Income capture is mixed across parents. The prototype keeps the entered values visible and flags the case for manual financial review instead of applying unsupported conversion logic.',
      reviewNotes,
    };
  }

  if (captureBasis === 'monthly') {
    return {
      captureBasis,
      father,
      mother,
      combinedMonthlyIncome,
      thresholdExceeded: false,
      manualReviewRequired: reviewNotes.length > 0,
      exceptionReviewRecommended: false,
      badgeLabel: reviewNotes.length > 0 ? 'Income Review Note' : 'Within Income Threshold',
      badgeTone: reviewNotes.length > 0 ? 'warning' : 'success',
      thresholdOutcomeLabel: 'Combined parent monthly income is within INR 40,000',
      warningBanner: reviewNotes.length > 0
        ? 'Income details were captured in multiple ways for at least one parent. The occupation-aligned value is being used and the case should be reviewed.'
        : undefined,
      financialReviewNote: reviewNotes.length > 0
        ? 'Monthly income stays within the INR 40,000 threshold, but conflicting income entries should still be reviewed.'
        : 'Combined father and mother monthly income is within the INR 40,000 threshold based on the values entered in the intake form.',
      reviewNotes,
    };
  }

  return {
    captureBasis,
    father,
    mother,
    thresholdExceeded: false,
    manualReviewRequired: false,
    exceptionReviewRecommended: false,
    badgeLabel: 'Income Details Pending',
    badgeTone: 'neutral',
    thresholdOutcomeLabel: 'Income details are not yet fully captured',
    financialReviewNote: 'Monthly income and daily wage fields remain available. Capture the applicable parent income details to complete the financial summary.',
    reviewNotes,
  };
}

export function formatIncomeRuleOutcome(evaluation: IncomeThresholdEvaluation): string {
  if (evaluation.thresholdExceeded) {
    return 'Income threshold exceeded. Case stays in review and requires manual financial review.';
  }

  if (evaluation.captureBasis === 'daily') {
    return 'Daily wage captured. No monthly conversion applied; manual financial review required.';
  }

  if (evaluation.captureBasis === 'mixed') {
    return 'Mixed income capture recorded. Occupation-aligned values are shown and the case needs manual review.';
  }

  if (evaluation.captureBasis === 'monthly') {
    return evaluation.manualReviewRequired
      ? 'Monthly income is within threshold, but conflicting entries should be reviewed.'
      : 'Monthly income is within the INR 40,000 threshold.';
  }

  return 'Income details are still pending.';
}

export function buildFinancialReviewSummary(
  evaluation: IncomeThresholdEvaluation
): FinancialReviewSummaryRow[] {
  return [
    { label: 'Income Capture Basis', value: evaluation.captureBasis === 'not_captured' ? 'Pending' : evaluation.captureBasis.replace('_', ' ') },
    { label: 'Father Monthly Income', value: formatCurrency(evaluation.father.monthlyIncome) },
    { label: 'Father Daily Wage', value: formatCurrency(evaluation.father.dailyIncome) },
    { label: 'Mother Monthly Income', value: formatCurrency(evaluation.mother.monthlyIncome) },
    { label: 'Mother Daily Wage', value: formatCurrency(evaluation.mother.dailyIncome) },
    {
      label: 'Combined Income',
      value: evaluation.captureBasis === 'monthly'
        ? formatCurrency(evaluation.combinedMonthlyIncome)
        : 'Not auto-calculated',
    },
    { label: 'Threshold Outcome', value: evaluation.thresholdOutcomeLabel },
    { label: 'Manual Review Required', value: evaluation.manualReviewRequired ? 'Yes' : 'No' },
    { label: 'Financial Review Note', value: evaluation.financialReviewNote },
  ];
}
