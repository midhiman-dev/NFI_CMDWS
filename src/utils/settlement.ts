import type { Case, SettlementRecord } from '../types';

export const PAYMENT_STATUS_OPTIONS: Array<NonNullable<SettlementRecord['paymentStatus']>> = [
  'Unpaid',
  'Partially Paid',
  'Paid',
];

export function getDefaultPaymentStatus(settlement?: SettlementRecord | null): NonNullable<SettlementRecord['paymentStatus']> {
  if (settlement?.paymentStatus) {
    return settlement.paymentStatus;
  }

  const finalBillAmount = settlement?.finalBillAmount ?? 0;
  const totalPaid = (settlement?.nfiPaidAmount ?? 0) + (settlement?.otherPaidAmount ?? 0);

  if (totalPaid <= 0) {
    return 'Unpaid';
  }

  if (finalBillAmount > 0 && totalPaid < finalBillAmount) {
    return 'Partially Paid';
  }

  return 'Paid';
}

export function getDonorMappingDisplay(caseData?: Case, settlement?: SettlementRecord | null) {
  const funding = caseData?.workflowExt?.funding;
  const sponsorName = funding?.sponsorQuantification?.sponsorName;
  const proposedAmount = funding?.sponsorQuantification?.proposedAmount;
  const fallbackAllocation = funding?.totalApprovedAmount ?? proposedAmount ?? settlement?.nfiPaidAmount;

  const fundingSource = funding?.channel === 'Campaign'
    ? funding?.campaign?.campaignName
      ? `Campaign - ${funding.campaign.campaignName}`
      : 'Campaign'
    : funding?.program
      ? `Direct Sponsor - ${funding.program}`
      : 'Direct Sponsor';

  return {
    donorOrSponsor: sponsorName || 'Awaiting donor mapping',
    fundingSource: funding?.channel ? fundingSource : 'Not mapped yet',
    donorAllocation: fallbackAllocation !== undefined ? `Rs ${fallbackAllocation.toLocaleString()}` : 'Allocation pending',
    supportedBy: [funding?.program, funding?.campaign?.campaignName].filter(Boolean).join(' / ') || 'Operations team pending',
  };
}
