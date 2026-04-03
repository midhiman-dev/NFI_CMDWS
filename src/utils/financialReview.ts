import type { DocumentWithTemplate } from '../data/providers/DataProvider';
import type {
  Case,
  FamilyProfile,
  FinancialCaseDetails,
  IntakeFundApplication,
  SettlementRecord,
  WorkflowExtensions,
} from '../types';
import type { IncomeThresholdEvaluation } from './incomeEligibility';
import { getDonorMappingDisplay } from './settlement';
import type { VarianceGovernanceEvaluation } from './varianceGovernance';
import { evaluateVarianceGovernance } from './varianceGovernance';

type ReadinessStatus = 'available' | 'missing' | 'partial' | 'context';
type RecommendationTone = 'success' | 'warning' | 'neutral';

export interface FinancialReadinessCue {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface FinancialArtifactReadiness {
  cues: FinancialReadinessCue[];
  blockers: string[];
  primaryFinancialProofAvailable: boolean;
  bankStatementAvailable: boolean;
  incomeProofAvailable: boolean;
  paymentRequisitionAvailable: boolean;
  finalBillAvailable: boolean;
  referenceAmountAvailable: boolean;
  settlementContextAvailable: boolean;
}

export interface FinancialReviewerArtifact {
  captureBasisLabel: string;
  fatherValue: string;
  motherValue: string;
  combinedIncome: string;
  thresholdOutcome: string;
  manualReviewRequired: boolean;
  financialReviewNote: string;
  requestedAmount: number | undefined;
  referenceAmount: number | undefined;
  estimatedBill: number | undefined;
  approvedAmount: number | undefined;
  paidAmount: number | undefined;
  outstandingAmount: number | undefined;
  donorOrSponsor: string;
  fundingSource: string;
  donorAllocation: string;
  supportedBy: string;
  proofReadinessLabel: string;
}

export interface FundingRecommendationState {
  label: string;
  tone: RecommendationTone;
  detail: string;
}

export interface SponsorIntelligence {
  state: FundingRecommendationState;
  suggestedProgram?: string;
  suggestedCampaign?: string;
  proposedSponsorAmount?: number;
  topUpIndicated: boolean;
  rationale: string[];
  recommendationNote: string;
  blockerNote: string;
}

export interface FinancialReviewContext {
  artifact: FinancialReviewerArtifact;
  readiness: FinancialArtifactReadiness;
  sponsorIntelligence: SponsorIntelligence;
  reviewerNotes: string[];
  varianceGovernance: VarianceGovernanceEvaluation;
}

function getDocStatus(doc?: DocumentWithTemplate): string {
  if (!doc) return 'Missing';
  const latest = doc.versions?.[doc.versions.length - 1];
  return latest?.status || doc.status || 'Missing';
}

function isDocAvailable(doc?: DocumentWithTemplate): boolean {
  const status = getDocStatus(doc);
  return status === 'Uploaded' || status === 'Verified' || status === 'Not_Applicable';
}

function findDoc(
  documents: DocumentWithTemplate[] = [],
  docTypes: string[]
): DocumentWithTemplate | undefined {
  return documents.find((doc) => docTypes.includes(doc.docType));
}

function toCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'Not available';
  return `INR ${value.toLocaleString()}`;
}

function getParentIncomeLabel(
  label: 'Father' | 'Mother',
  monthlyIncome?: number,
  dailyIncome?: number
): string {
  if (monthlyIncome !== undefined && monthlyIncome !== null) {
    return `${label} monthly: INR ${monthlyIncome.toLocaleString()}`;
  }
  if (dailyIncome !== undefined && dailyIncome !== null) {
    return `${label} daily: INR ${dailyIncome.toLocaleString()}`;
  }
  return `${label}: Not captured`;
}

function getOutstandingAmount(
  settlement?: SettlementRecord | null,
  financialData?: FinancialCaseDetails | null,
  fundApplication?: Partial<IntakeFundApplication>
): number | undefined {
  const settlementOutstanding =
    settlement?.finalBillAmount !== undefined
      ? Math.max(
          settlement.finalBillAmount - ((settlement.nfiPaidAmount ?? 0) + (settlement.otherPaidAmount ?? 0)),
          0
        )
      : undefined;

  if (settlementOutstanding !== undefined) return settlementOutstanding;
  if (fundApplication?.nicuFinancialSection?.currentOutstandingBillAmount !== undefined) {
    return fundApplication.nicuFinancialSection.currentOutstandingBillAmount;
  }
  if (
    financialData?.finalBillAmount !== undefined &&
    financialData?.approvedAmount !== undefined
  ) {
    return Math.max(financialData.finalBillAmount - financialData.approvedAmount, 0);
  }
  return undefined;
}

export function getFinancialArtifactReadiness(input: {
  documents?: DocumentWithTemplate[];
  settlement?: SettlementRecord | null;
  financialData?: FinancialCaseDetails | null;
  fundApplication?: Partial<IntakeFundApplication>;
}): FinancialArtifactReadiness {
  const { documents = [], settlement, financialData, fundApplication } = input;
  const bankStatementDoc = findDoc(documents, ['Father Bank Statement', 'Mother Bank Statement (Optional)', 'Bank Statement']);
  const incomeProofDoc = findDoc(documents, ['Income Certificate', 'Talati/Govt Economic Card']);
  const paymentRequisitionDoc = findDoc(documents, ['Payment Requisition']);
  const finalBillDoc = findDoc(documents, ['Final Bill']);

  const bankStatementAvailable =
    isDocAvailable(bankStatementDoc) || !!fundApplication?.occupationIncomeSection?.incomeProofBankStatement6Months;
  const incomeProofAvailable =
    isDocAvailable(incomeProofDoc) || !!fundApplication?.occupationIncomeSection?.incomeProofTahsildarCertificate;
  const primaryFinancialProofAvailable = bankStatementAvailable || incomeProofAvailable;
  const paymentRequisitionAvailable = isDocAvailable(paymentRequisitionDoc);
  const finalBillAvailable = isDocAvailable(finalBillDoc) || settlement?.finalBillAmount !== undefined || financialData?.finalBillAmount !== undefined;
  const referenceAmountAvailable =
    settlement?.referenceAmount !== undefined ||
    financialData?.nfiRequestedAmount !== undefined ||
    fundApplication?.nicuFinancialSection?.nfiRequestedAmount !== undefined;
  const settlementContextAvailable =
    settlement?.referenceAmount !== undefined ||
    settlement?.finalBillAmount !== undefined ||
    settlement?.paymentStatus !== undefined ||
    settlement?.nfiPaidAmount !== undefined ||
    settlement?.otherPaidAmount !== undefined;

  const blockers: string[] = [];
  if (!primaryFinancialProofAvailable) {
    blockers.push('Primary financial proof is still missing.');
  }
  if (!referenceAmountAvailable) {
    blockers.push('Reference or requested amount is not available yet.');
  }

  const cues: FinancialReadinessCue[] = [
    {
      key: 'primary-proof',
      label: 'Primary financial proof',
      status: primaryFinancialProofAvailable ? 'available' : 'missing',
      detail: primaryFinancialProofAvailable
        ? 'Bank statement or income proof is available for review.'
        : 'Upload bank statement, income certificate, or equivalent proof.',
    },
    {
      key: 'bank-statement',
      label: 'Bank statement',
      status: bankStatementAvailable ? 'available' : 'missing',
      detail: bankStatementAvailable
        ? 'Bank statement context is available.'
        : 'No bank statement is visible yet.',
    },
    {
      key: 'income-proof',
      label: 'Income proof',
      status: incomeProofAvailable ? 'available' : 'missing',
      detail: incomeProofAvailable
        ? 'Income certificate or government proof is available.'
        : 'Income proof is not visible yet.',
    },
    {
      key: 'payment-requisition',
      label: 'Payment requisition',
      status: paymentRequisitionAvailable ? 'available' : 'missing',
      detail: paymentRequisitionAvailable
        ? 'Payment requisition is present.'
        : 'Payment requisition has not been uploaded.',
    },
    {
      key: 'final-bill',
      label: 'Final bill',
      status: finalBillAvailable ? 'available' : 'missing',
      detail: finalBillAvailable
        ? 'Final bill context is available from documents or settlement.'
        : 'Final bill is not available yet.',
    },
    {
      key: 'reference-amount',
      label: 'Reference / requested amount',
      status: referenceAmountAvailable ? 'available' : 'missing',
      detail: referenceAmountAvailable
        ? 'Requested or reference amount is available.'
        : 'Requested or reference amount is still pending.',
    },
    {
      key: 'settlement-context',
      label: 'Settlement / payment context',
      status: settlementContextAvailable ? 'context' : 'partial',
      detail: settlementContextAvailable
        ? 'Settlement, payment, or post-discharge funding context is visible.'
        : 'No settlement context is recorded yet.',
    },
  ];

  return {
    cues,
    blockers,
    primaryFinancialProofAvailable,
    bankStatementAvailable,
    incomeProofAvailable,
    paymentRequisitionAvailable,
    finalBillAvailable,
    referenceAmountAvailable,
    settlementContextAvailable,
  };
}

export function buildFinancialReviewerArtifact(input: {
  caseData?: Case | null;
  familyData?: FamilyProfile | null;
  financialData?: FinancialCaseDetails | null;
  workflowExt?: WorkflowExtensions | null;
  settlement?: SettlementRecord | null;
  fundApplication?: Partial<IntakeFundApplication>;
  evaluation: IncomeThresholdEvaluation;
  readiness: FinancialArtifactReadiness;
}): FinancialReviewerArtifact {
  const { caseData, financialData, workflowExt, settlement, fundApplication, evaluation, readiness } = input;
  const donorMapping = getDonorMappingDisplay(caseData || undefined, settlement);
  const requestedAmount =
    financialData?.nfiRequestedAmount ?? fundApplication?.nicuFinancialSection?.nfiRequestedAmount;
  const estimatedBill =
    financialData?.estimateAmount ?? fundApplication?.nicuFinancialSection?.totalEstimatedHospitalBill;
  const approvedAmount = financialData?.approvedAmount ?? financialData?.nfiApprovedAmount;
  const paidAmount = (settlement?.nfiPaidAmount ?? 0) + (settlement?.otherPaidAmount ?? 0) || undefined;
  const outstandingAmount = getOutstandingAmount(settlement, financialData, fundApplication);

  return {
    captureBasisLabel: evaluation.captureBasis === 'not_captured' ? 'Pending' : evaluation.captureBasis.replace('_', ' '),
    fatherValue: getParentIncomeLabel('Father', evaluation.father.monthlyIncome, evaluation.father.dailyIncome),
    motherValue: getParentIncomeLabel('Mother', evaluation.mother.monthlyIncome, evaluation.mother.dailyIncome),
    combinedIncome:
      evaluation.captureBasis === 'monthly' && evaluation.combinedMonthlyIncome !== undefined
        ? `INR ${evaluation.combinedMonthlyIncome.toLocaleString()}`
        : 'Not auto-calculated',
    thresholdOutcome: evaluation.thresholdOutcomeLabel,
    manualReviewRequired: evaluation.manualReviewRequired,
    financialReviewNote: evaluation.financialReviewNote,
    requestedAmount,
    referenceAmount: settlement?.referenceAmount,
    estimatedBill,
    approvedAmount,
    paidAmount,
    outstandingAmount,
    donorOrSponsor: donorMapping.donorOrSponsor,
    fundingSource: donorMapping.fundingSource,
    donorAllocation: donorMapping.donorAllocation,
    supportedBy: donorMapping.supportedBy,
    proofReadinessLabel: readiness.primaryFinancialProofAvailable ? 'Proof available' : 'Proof incomplete',
  };
}

export function getFundingRecommendationState(input: {
  evaluation: IncomeThresholdEvaluation;
  readiness: FinancialArtifactReadiness;
  workflowExt?: WorkflowExtensions | null;
}): FundingRecommendationState {
  const { evaluation, readiness, workflowExt } = input;
  const hasExistingRecommendation =
    !!workflowExt?.funding?.program ||
    !!workflowExt?.funding?.campaign?.campaignName ||
    workflowExt?.funding?.sponsorQuantification?.proposedAmount !== undefined ||
    !!workflowExt?.funding?.recommendationNote;

  if (!readiness.primaryFinancialProofAvailable) {
    return {
      label: 'Needs artifact completion',
      tone: 'warning',
      detail: 'Primary financial proof is missing, so sponsor intelligence stays reviewer-led and incomplete.',
    };
  }

  if (hasExistingRecommendation) {
    return {
      label: 'Reviewer recommendation in progress',
      tone: 'success',
      detail: 'A reviewer-entered sponsor or funding recommendation is already available.',
    };
  }

  if (evaluation.captureBasis === 'not_captured') {
    return {
      label: 'Awaiting reviewer input',
      tone: 'neutral',
      detail: 'Income inputs are incomplete, so no strong recommendation is surfaced yet.',
    };
  }

  if (evaluation.manualReviewRequired) {
    return {
      label: 'Needs manual financial assessment',
      tone: 'warning',
      detail: 'H2 has flagged this case for manual review, so sponsor intelligence remains advisory only.',
    };
  }

  return {
    label: 'Ready for reviewer recommendation',
    tone: 'success',
    detail: 'Core financial inputs are available and the reviewer can record a recommendation.',
  };
}

export function getSponsorIntelligence(input: {
  caseData?: Case | null;
  financialData?: FinancialCaseDetails | null;
  workflowExt?: WorkflowExtensions | null;
  settlement?: SettlementRecord | null;
  fundApplication?: Partial<IntakeFundApplication>;
  evaluation: IncomeThresholdEvaluation;
  readiness: FinancialArtifactReadiness;
}): SponsorIntelligence {
  const { caseData, financialData, workflowExt, settlement, fundApplication, evaluation, readiness } = input;
  const outstandingAmount = getOutstandingAmount(settlement, financialData, fundApplication);
  const referenceAmount =
    settlement?.referenceAmount ??
    financialData?.nfiRequestedAmount ??
    fundApplication?.nicuFinancialSection?.nfiRequestedAmount;
  const estimatedAmount =
    financialData?.estimateAmount ??
    fundApplication?.nicuFinancialSection?.estimateAfterDiscount ??
    fundApplication?.nicuFinancialSection?.totalEstimatedHospitalBill;

  const suggestedProgram = workflowExt?.funding?.program || (
    caseData?.processType === 'BGRC'
      ? 'Growth Follow-up'
      : (outstandingAmount ?? estimatedAmount ?? 0) >= 200000
      ? 'Emergency Support'
      : referenceAmount !== undefined || estimatedAmount !== undefined
      ? 'Core NICU Support'
      : undefined
  );
  const suggestedCampaign = workflowExt?.funding?.campaign?.campaignName || undefined;
  const proposedSponsorAmount =
    workflowExt?.funding?.sponsorQuantification?.proposedAmount ??
    outstandingAmount ??
    referenceAmount ??
    estimatedAmount;
  const topUpIndicated = !!workflowExt?.funding?.isTopUp || (
    financialData?.approvedAmount !== undefined &&
    outstandingAmount !== undefined &&
    outstandingAmount > 0
  );

  const rationale = [
    evaluation.financialReviewNote,
    readiness.primaryFinancialProofAvailable
      ? 'Primary financial proof is available for finance review.'
      : 'Primary financial proof is missing, so recommendations stay provisional.',
    settlement?.referenceAmount !== undefined
      ? `Reference amount available: INR ${settlement.referenceAmount.toLocaleString()}.`
      : undefined,
    outstandingAmount !== undefined
      ? `Outstanding context visible: INR ${outstandingAmount.toLocaleString()}.`
      : undefined,
    workflowExt?.funding?.sponsorQuantification?.sponsorName
      ? `Existing donor mapping is visible as context: ${workflowExt.funding.sponsorQuantification.sponsorName}.`
      : undefined,
  ].filter(Boolean) as string[];

  return {
    state: getFundingRecommendationState({ evaluation, readiness, workflowExt }),
    suggestedProgram,
    suggestedCampaign,
    proposedSponsorAmount,
    topUpIndicated,
    rationale,
    recommendationNote:
      workflowExt?.funding?.recommendationNote ||
      workflowExt?.funding?.sponsorQuantification?.notes ||
      'Awaiting reviewer input',
    blockerNote:
      workflowExt?.funding?.blockerNote ||
      (readiness.blockers[0] || 'No blocker noted'),
  };
}

export function getFinancialReviewerNotes(input: {
  evaluation: IncomeThresholdEvaluation;
  readiness: FinancialArtifactReadiness;
  workflowExt?: WorkflowExtensions | null;
}): string[] {
  const { evaluation, readiness, workflowExt } = input;
  return [
    evaluation.financialReviewNote,
    ...evaluation.reviewNotes,
    workflowExt?.funding?.manualReviewNote,
    workflowExt?.funding?.blockerNote,
    ...readiness.blockers,
  ].filter(Boolean) as string[];
}

export function getFinancialReviewContext(input: {
  caseData?: Case | null;
  familyData?: FamilyProfile | null;
  financialData?: FinancialCaseDetails | null;
  workflowExt?: WorkflowExtensions | null;
  settlement?: SettlementRecord | null;
  documents?: DocumentWithTemplate[];
  fundApplication?: Partial<IntakeFundApplication>;
  evaluation: IncomeThresholdEvaluation;
}): FinancialReviewContext {
  const readiness = getFinancialArtifactReadiness({
    documents: input.documents,
    settlement: input.settlement,
    financialData: input.financialData,
    fundApplication: input.fundApplication,
  });

  return {
    artifact: buildFinancialReviewerArtifact({
      caseData: input.caseData,
      familyData: input.familyData,
      financialData: input.financialData,
      workflowExt: input.workflowExt,
      settlement: input.settlement,
      fundApplication: input.fundApplication,
      evaluation: input.evaluation,
      readiness,
    }),
    readiness,
    sponsorIntelligence: getSponsorIntelligence({
      caseData: input.caseData,
      financialData: input.financialData,
      workflowExt: input.workflowExt,
      settlement: input.settlement,
      fundApplication: input.fundApplication,
      evaluation: input.evaluation,
      readiness,
    }),
    reviewerNotes: getFinancialReviewerNotes({
      evaluation: input.evaluation,
      readiness,
      workflowExt: input.workflowExt,
    }),
    varianceGovernance: evaluateVarianceGovernance({
      settlement: input.settlement,
      financialData: input.financialData,
      workflowExt: input.workflowExt,
      fundApplication: input.fundApplication,
    }),
  };
}
