import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiField } from '../design-system/NfiField';
import { NfiCard } from '../design-system/NfiCard';
import { NfiBadge } from '../design-system/NfiBadge';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import { getAuthState } from '../../utils/auth';
import { PAYMENT_STATUS_OPTIONS, getDefaultPaymentStatus, getDonorMappingDisplay } from '../../utils/settlement';
import { logAuditEvent } from '../../utils/auditTrail';
import {
  buildVarianceGovernanceSnapshot,
  evaluateVarianceGovernance,
  formatVarianceCurrency,
  formatVariancePercent,
  getVarianceDirectionLabel,
  getVarianceStatusTone,
} from '../../utils/varianceGovernance';
import type { SettlementRecord, Case, CaseStatus, VarianceDirectorDecision, WorkflowExtensions } from '../../types';

interface Props {
  caseId: string;
  caseData?: Case;
  onStatusChange?: (newStatus: CaseStatus) => void;
}

export function SettlementTab({ caseId, caseData, onStatusChange }: Props) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const authState = getAuthState();
  const user = authState.activeUser;

  const [settlement, setSettlement] = useState<SettlementRecord | null>(null);
  const [workflowExt, setWorkflowExt] = useState<WorkflowExtensions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [showClosureConfirm, setShowClosureConfirm] = useState(false);

  const [referenceAmount, setReferenceAmount] = useState<number | undefined>();
  const [finalBillAmount, setFinalBillAmount] = useState<number | undefined>();
  const [nfiPaidAmount, setNfiPaidAmount] = useState<number | undefined>();
  const [otherPaidAmount, setOtherPaidAmount] = useState<number | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<NonNullable<SettlementRecord['paymentStatus']>>('Unpaid');
  const [dueDate, setDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [reductionAmount, setReductionAmount] = useState<number | undefined>();
  const [reductionNotes, setReductionNotes] = useState('');

  const [directorDecision, setDirectorDecision] = useState<VarianceDirectorDecision | ''>('');
  const [revisedSanctionAmount, setRevisedSanctionAmount] = useState<number | undefined>();
  const [directorComments, setDirectorComments] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [result, workflowExtResult] = await Promise.all([
        provider.getSettlement(caseId),
        provider.getWorkflowExt(caseId).catch(() => null),
      ]);
      setSettlement(result);
      setWorkflowExt(workflowExtResult);
      if (result) {
        setReferenceAmount(result.referenceAmount);
        setFinalBillAmount(result.finalBillAmount);
        setNfiPaidAmount(result.nfiPaidAmount);
        setOtherPaidAmount(result.otherPaidAmount);
        setPaymentStatus(getDefaultPaymentStatus(result));
        setDueDate(result.dueDate || '');
        setPaymentDate(result.paymentDate || '');
        setReductionAmount(result.reductionAmount);
        setReductionNotes(result.reductionNotes || '');
      } else {
        setReferenceAmount(undefined);
        setFinalBillAmount(undefined);
        setNfiPaidAmount(undefined);
        setOtherPaidAmount(undefined);
        setPaymentStatus('Unpaid');
        setDueDate('');
        setPaymentDate('');
        setReductionAmount(undefined);
        setReductionNotes('');
      }

      const varianceReview = workflowExtResult?.varianceGovernance;
      setDirectorDecision(varianceReview?.directorDecision || '');
      setRevisedSanctionAmount(varianceReview?.revisedSanctionAmount ?? undefined);
      setDirectorComments(varianceReview?.directorRemarks || '');
    } catch {
      // safe fallback
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const canEditSettlement = ['hospital_spoc', 'verifier', 'admin', 'leadership'].includes(user?.roles[0] || '');
  const canDirectorReview = ['admin', 'leadership'].includes(user?.roles[0] || '');
  const canCloseCaseWithSettlement = ['admin', 'leadership'].includes(user?.roles[0] || '');

  const varianceGovernance = evaluateVarianceGovernance({
    settlement: {
      ...settlement,
      referenceAmount,
      finalBillAmount,
    },
    workflowExt,
    baselineAmount: referenceAmount,
    finalBillAmount,
  });
  const varianceReview = workflowExt?.varianceGovernance;
  const requiresDirectorReview = varianceGovernance.directorReviewRequired;
  const directorReviewSubmitted = varianceGovernance.status === 'director_review_completed';
  const totalPaidAmount = (nfiPaidAmount ?? 0) + (otherPaidAmount ?? 0);
  const balanceAmount = finalBillAmount !== undefined ? Math.max(finalBillAmount - totalPaidAmount, 0) : undefined;
  const donorMapping = getDonorMappingDisplay(caseData, settlement);

  const handleSaveSettlement = async () => {
    if (!canEditSettlement) {
      showToast('You do not have permission to edit settlement', 'error');
      return;
    }

    setSaving(true);
    try {
      const nextVarianceSnapshot = buildVarianceGovernanceSnapshot(varianceGovernance, varianceReview);
      const data: Partial<SettlementRecord> = {
        referenceAmount,
        finalBillAmount,
        nfiPaidAmount,
        otherPaidAmount,
        paymentStatus,
        dueDate: dueDate || undefined,
        paymentDate: paymentDate || undefined,
        reductionAmount,
        reductionNotes: reductionNotes.trim() || undefined,
        variancePct: varianceGovernance.variancePercent ?? undefined,
        varianceFlag: varianceGovernance.status === 'director_review_required' || varianceGovernance.status === 'director_review_completed',
      };

      await provider.saveSettlement(caseId, data);
      await provider.saveWorkflowExt(caseId, { varianceGovernance: nextVarianceSnapshot });

      await logAuditEvent({
        caseId,
        action: 'Settlement saved',
        notes: `Settlement saved: Reference ${fmtCurrency(referenceAmount)}, Final Bill ${fmtCurrency(finalBillAmount)}, Payment ${paymentStatus}, Variance ${formatVariancePercent(varianceGovernance.variancePercent)}.`,
      }).catch(() => {});
      await logAuditEvent({
        caseId,
        action: 'Variance governance evaluated',
        notes: `${varianceGovernance.governanceBadge}. ${varianceGovernance.governanceMessage}`,
      }).catch(() => {});

      if (varianceGovernance.status === 'director_review_required') {
        await logAuditEvent({
          caseId,
          action: 'Variance exceeds tolerance',
          notes: `Variance ${varianceGovernance.variancePercent}% exceeds the ${varianceGovernance.tolerancePercent}% tolerance.`,
        }).catch(() => {});
        await logAuditEvent({
          caseId,
          action: 'Director review required',
          notes: varianceGovernance.gatingReason,
        }).catch(() => {});
      }

      if (varianceGovernance.status === 'director_review_completed') {
        await logAuditEvent({
          caseId,
          action: 'Variance cleared / governance satisfied',
          notes: varianceGovernance.governanceMessage,
        }).catch(() => {});
      }

      showToast('Settlement saved successfully', 'success');
      await load();
    } catch {
      showToast('Failed to save settlement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitDirectorReview = async () => {
    if (!canDirectorReview) {
      showToast('You do not have permission to submit director review', 'error');
      return;
    }

    if (!requiresDirectorReview && !directorReviewSubmitted) {
      showToast('Director review is not required for the current variance state', 'error');
      return;
    }

    if (!directorDecision) {
      showToast('Please select a decision', 'error');
      return;
    }

    if (directorDecision === 'revise_sanction' && !revisedSanctionAmount) {
      showToast('Revised sanction amount is required for revise sanction', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const reviewedAt = new Date().toISOString();
      await provider.saveWorkflowExt(caseId, {
        varianceGovernance: {
          ...buildVarianceGovernanceSnapshot(varianceGovernance, varianceReview),
          directorDecision,
          revisedSanctionAmount: directorDecision === 'revise_sanction' ? revisedSanctionAmount ?? null : null,
          directorRemarks: directorComments.trim() || undefined,
          reviewedBy: user?.fullName || 'Unknown',
          reviewedAt,
        },
      });

      await logAuditEvent({
        caseId,
        action: 'Director review saved',
        notes: `Decision: ${directorDecision}.${directorComments.trim() ? ` Remarks: ${directorComments.trim()}` : ''}`,
      }).catch(() => {});
      await logAuditEvent({
        caseId,
        action: 'Variance cleared / governance satisfied',
        notes: 'Director variance review has been completed.',
      }).catch(() => {});

      if (directorDecision === 'revise_sanction') {
        await logAuditEvent({
          caseId,
          action: 'Director revised sanction amount',
          notes: `Revised sanction amount recorded as ${fmtCurrency(revisedSanctionAmount)}.`,
        }).catch(() => {});
      }

      showToast('Director review saved', 'success');
      await load();
      setDirectorDecision('');
      setRevisedSanctionAmount(undefined);
      setDirectorComments('');
    } catch {
      showToast('Failed to submit director review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const isClosed = caseData?.caseStatus === 'Closed';
  const isApproved = caseData?.caseStatus === 'Approved';

  const settlementComplete = finalBillAmount && nfiPaidAmount !== undefined && otherPaidAmount !== undefined;
  const directorApproved = varianceGovernance.status !== 'director_review_required';
  const canCloseCaseNow = settlementComplete && directorApproved && !isClosed;
  const paymentStatusTone = paymentStatus === 'Paid'
    ? 'bg-emerald-100 text-emerald-800'
    : paymentStatus === 'Partially Paid'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-100 text-slate-700';

  const handleCloseCaseWithSettlement = async () => {
    if (!canCloseCaseWithSettlement) {
      showToast('You do not have permission to close cases', 'error');
      return;
    }

    if (varianceGovernance.status === 'director_review_required') {
      await logAuditEvent({
        caseId,
        action: 'Final action blocked due to pending director variance review',
        notes: varianceGovernance.gatingReason,
      }).catch(() => {});
      showToast(varianceGovernance.gatingReason || 'Director variance review is required before closure', 'error');
      return;
    }

    if (!canCloseCaseNow) {
      showToast('Settlement requirements not met', 'error');
      return;
    }

    setClosingCase(true);
    try {
      await provider.closeCaseWithSettlement(caseId, user?.fullName || 'Unknown');

      await logAuditEvent({
        caseId,
        action: 'Case closed',
        notes: 'Case closed via settlement workflow',
      }).catch(() => {});

      showToast('Case closed successfully', 'success');
      onStatusChange?.('Closed');
      await load();
    } catch {
      showToast('Failed to close case', 'error');
    } finally {
      setClosingCase(false);
      setShowClosureConfirm(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-[var(--nfi-text-secondary)]">Loading settlement data...</div>;
  if (!isApproved && !isClosed) return <div className="py-8 text-center text-[var(--nfi-text-secondary)]">Settlement workflow available only for Approved cases</div>;

  return (
    <div className="space-y-6">
      <NfiCard className="p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Payment Tracking</h3>
            <p className="text-sm text-[var(--nfi-text-secondary)]">Settlement-level tracking for payment state, dates, and reductions.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${paymentStatusTone}`}>
              {paymentStatus}
            </span>
            {isClosed && (
              <span className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm font-medium text-white">
                <CheckCircle size={16} /> Case Closed
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <SettlementSummaryCard label="Final Bill" value={fmtCurrency(finalBillAmount)} />
          <SettlementSummaryCard label="Total Paid" value={fmtCurrency(totalPaidAmount)} />
          <SettlementSummaryCard label="Balance" value={fmtCurrency(balanceAmount)} />
          <SettlementSummaryCard label="Reduction" value={fmtCurrency(reductionAmount)} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NfiField label="Reference Amount (Rs)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="nfi-input flex-1"
                  value={referenceAmount ?? ''}
                  onChange={e => setReferenceAmount(e.target.value ? +e.target.value : undefined)}
                  disabled={!canEditSettlement || isClosed}
                />
                {!referenceAmount && <span className="text-sm text-[var(--nfi-text-secondary)]">No reference found</span>}
              </div>
            </NfiField>

            <NfiField label="Final Bill Amount (Rs)">
              <input
                type="number"
                className="nfi-input"
                value={finalBillAmount ?? ''}
                onChange={e => setFinalBillAmount(e.target.value ? +e.target.value : undefined)}
                disabled={!canEditSettlement || isClosed}
              />
            </NfiField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NfiField label="Amount Paid by NFI (Rs)">
              <input
                type="number"
                className="nfi-input"
                value={nfiPaidAmount ?? ''}
                onChange={e => setNfiPaidAmount(e.target.value ? +e.target.value : undefined)}
                disabled={!canEditSettlement || isClosed}
              />
            </NfiField>

            <NfiField label="Amount Paid by Family / Other (Rs)">
              <input
                type="number"
                className="nfi-input"
                value={otherPaidAmount ?? ''}
                onChange={e => setOtherPaidAmount(e.target.value ? +e.target.value : undefined)}
                disabled={!canEditSettlement || isClosed}
              />
            </NfiField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NfiField label="Payment Status">
              <select
                className="nfi-input"
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as NonNullable<SettlementRecord['paymentStatus']>)}
                disabled={!canEditSettlement || isClosed}
              >
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </NfiField>

            <NfiField label="Due Date">
              <input
                type="date"
                className="nfi-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={!canEditSettlement || isClosed}
              />
            </NfiField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NfiField label="Payment Date">
              <input
                type="date"
                className="nfi-input"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                disabled={!canEditSettlement || isClosed}
              />
            </NfiField>

            <NfiField label="Reduction / Discount / Concession (Rs)">
              <input
                type="number"
                className="nfi-input"
                value={reductionAmount ?? ''}
                onChange={e => setReductionAmount(e.target.value ? +e.target.value : undefined)}
                disabled={!canEditSettlement || isClosed}
              />
            </NfiField>
          </div>

          <NfiField label="Reduction Notes">
            <textarea
              className="nfi-input min-h-[90px]"
              value={reductionNotes}
              onChange={e => setReductionNotes(e.target.value)}
              disabled={!canEditSettlement || isClosed}
              placeholder="Optional note on discount, concession, or negotiated reduction"
            />
          </NfiField>

          {canEditSettlement && !isClosed && (
            <NfiButton onClick={handleSaveSettlement} disabled={saving} className="w-full">
              <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Settlement'}
            </NfiButton>
          )}
        </div>
      </NfiCard>

      <NfiCard className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Donor Mapping</h3>
          <p className="text-sm text-[var(--nfi-text-secondary)]">Visibility-only view of sponsor, allocation, and funding source context.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DonorInfoRow label="Donor / Sponsor" value={donorMapping.donorOrSponsor} />
          <DonorInfoRow label="Funding Source" value={donorMapping.fundingSource} />
          <DonorInfoRow label="Donor Allocation" value={donorMapping.donorAllocation} />
          <DonorInfoRow label="Supported By" value={donorMapping.supportedBy} />
        </div>
      </NfiCard>

      <NfiCard className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Variance Governance</h3>
            <p className="text-sm text-[var(--nfi-text-secondary)]">
              Governance visibility for final bill versus estimate/reference baseline.
            </p>
          </div>
          <NfiBadge tone={getVarianceStatusTone(varianceGovernance.status)}>
            {varianceGovernance.governanceBadge}
          </NfiBadge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SettlementSummaryCard label="Estimate / Reference" value={fmtCurrency(varianceGovernance.baselineAmount ?? undefined)} />
          <SettlementSummaryCard label="Final Bill" value={fmtCurrency(varianceGovernance.finalBillAmount ?? undefined)} />
          <SettlementSummaryCard label="Variance Amount" value={formatVarianceCurrency(varianceGovernance.varianceAmount)} />
          <SettlementSummaryCard label="Variance %" value={formatVariancePercent(varianceGovernance.variancePercent)} />
          <SettlementSummaryCard label="Tolerance Rule" value={`${varianceGovernance.tolerancePercent}%`} />
        </div>

        <div className="mt-4 rounded border border-[var(--nfi-border)] bg-[var(--nfi-bg-secondary)] p-4 text-sm text-[var(--nfi-text)] space-y-2">
          <p><span className="font-medium">Direction:</span> {getVarianceDirectionLabel(varianceGovernance.varianceDirection)}</p>
          <p><span className="font-medium">Status:</span> {varianceGovernance.governanceMessage}</p>
        </div>

        {varianceGovernance.status === 'director_review_required' && (
          <div className="mt-4 flex items-start gap-2 rounded border border-amber-300 bg-amber-100 p-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-700" />
            <span className="text-sm text-amber-800">
              Variance exceeds 10%. Director review is required before final settlement approval/closure.
            </span>
          </div>
        )}

        {(requiresDirectorReview || directorReviewSubmitted) && (
          <div className="mt-5 space-y-4 rounded border border-[var(--nfi-border)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-[var(--nfi-text)]">Director Review</h4>
                <p className="text-sm text-[var(--nfi-text-secondary)]">
                  Admin acts as the Director placeholder in this prototype.
                </p>
              </div>
              {varianceReview?.reviewedAt && (
                <NfiBadge tone="success">Review completed</NfiBadge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <NfiField label="Director Decision" required>
                <select
                  className="nfi-input"
                  value={directorDecision}
                  onChange={e => setDirectorDecision(e.target.value as VarianceDirectorDecision | '')}
                  disabled={!canDirectorReview}
                >
                  <option value="">Select decision...</option>
                  <option value="keep_current_sanction">Keep current sanction</option>
                  <option value="revise_sanction">Revise sanction</option>
                  <option value="return_for_clarification">Return for clarification</option>
                </select>
              </NfiField>

              {directorDecision === 'revise_sanction' ? (
                <NfiField label="Revised Sanction Amount" required>
                  <input
                    type="number"
                    className="nfi-input"
                    value={revisedSanctionAmount ?? ''}
                    onChange={e => setRevisedSanctionAmount(e.target.value ? +e.target.value : undefined)}
                    disabled={!canDirectorReview}
                  />
                </NfiField>
              ) : (
                <div className="rounded border border-dashed border-[var(--nfi-border)] px-4 py-3 text-sm text-[var(--nfi-text-secondary)]">
                  Revised sanction amount is only needed when the Director chooses to revise sanction.
                </div>
              )}
            </div>

            <NfiField label="Director Remarks">
              <textarea
                className="nfi-input min-h-[120px]"
                value={directorComments}
                onChange={e => setDirectorComments(e.target.value)}
                disabled={!canDirectorReview}
                placeholder="Capture the governance reasoning or clarification note"
              />
            </NfiField>

            {(varianceReview?.reviewedBy || varianceReview?.reviewedAt) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
                <div className="rounded border border-[var(--nfi-border)] bg-[var(--nfi-bg-secondary)] p-3">
                  <span className="text-[var(--nfi-text-secondary)]">Reviewed By</span>
                  <p className="font-medium text-[var(--nfi-text)]">{varianceReview?.reviewedBy || 'N/A'}</p>
                </div>
                <div className="rounded border border-[var(--nfi-border)] bg-[var(--nfi-bg-secondary)] p-3">
                  <span className="text-[var(--nfi-text-secondary)]">Reviewed At</span>
                  <p className="font-medium text-[var(--nfi-text)]">
                    {varianceReview?.reviewedAt ? new Date(varianceReview.reviewedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {canDirectorReview && (
              <NfiButton onClick={handleSubmitDirectorReview} disabled={submittingReview || !directorDecision} className="w-full">
                <Save size={16} className="mr-2" /> {submittingReview ? 'Saving...' : 'Save Director Review'}
              </NfiButton>
            )}
          </div>
        )}
      </NfiCard>

      <NfiCard className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--nfi-text)]">Case Closure</h3>

        <div className="mb-6 space-y-3 rounded bg-[var(--nfi-bg-secondary)] p-4">
          <div className="flex items-center gap-2">
            {settlementComplete ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <AlertCircle size={18} className="text-gray-400" />
            )}
            <span className={settlementComplete ? 'font-medium text-green-600' : 'text-[var(--nfi-text-secondary)]'}>
              Settlement Summary complete
            </span>
          </div>

          <div className="flex items-center gap-2">
            {directorApproved ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <AlertCircle size={18} className="text-amber-500" />
            )}
            <span className={directorApproved ? 'font-medium text-green-600' : 'font-medium text-amber-600'}>
              {requiresDirectorReview ? 'Director review completed' : 'No director review required'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-blue-500" />
            <span className="text-sm text-[var(--nfi-text-secondary)]">
              Closure document baseline available for review
            </span>
          </div>
        </div>

        {varianceGovernance.status === 'director_review_required' && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {varianceGovernance.gatingReason}
          </div>
        )}

        {!settlementComplete && !isClosed && (
          <div className="rounded border border-[var(--nfi-border)] bg-[var(--nfi-bg-secondary)] p-4 text-sm text-[var(--nfi-text-secondary)]">
            Complete final bill and payment figures before closure.
          </div>
        )}

        {!isClosed && settlementComplete && (
          <>
            {!showClosureConfirm ? (
              <NfiButton onClick={() => setShowClosureConfirm(true)} className="w-full bg-green-600 hover:bg-green-700">
                Mark Case Closed
              </NfiButton>
            ) : (
              <div className="space-y-3">
                <div className="rounded border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 font-semibold text-amber-900">Confirm Case Closure</p>
                  <p className="mb-4 text-sm text-amber-800">
                    This action will mark the case as Closed and cannot be reversed. Ensure all settlement details are correct.
                  </p>
                </div>
                <div className="flex gap-3">
                  <NfiButton
                    variant="secondary"
                    onClick={() => setShowClosureConfirm(false)}
                    disabled={closingCase}
                    className="flex-1"
                  >
                    Cancel
                  </NfiButton>
                  <NfiButton
                    onClick={handleCloseCaseWithSettlement}
                    disabled={closingCase}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {closingCase ? 'Closing...' : 'Confirm Closure'}
                  </NfiButton>
                </div>
              </div>
            )}
          </>
        )}

        {isClosed && (
          <div className="flex items-center gap-3 rounded border border-green-200 bg-green-50 p-4">
            <CheckCircle size={20} className="text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Case Closed</p>
              <p className="text-sm text-green-700">{settlement?.closedAt && `Closed on ${new Date(settlement.closedAt).toLocaleDateString()}`}</p>
            </div>
          </div>
        )}
      </NfiCard>

      <NfiCard className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--nfi-text)]">Closure Documents</h3>
        <p className="mb-4 text-sm text-[var(--nfi-text-secondary)]">
          Keep the final closure pack aligned to the current baseline document set.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-[var(--nfi-bg-secondary)]">
            <Upload size={16} className="text-blue-600" />
            <span>Final Bill</span>
            <span className="ml-auto rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">Recommended</span>
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-[var(--nfi-bg-secondary)]">
            <Upload size={16} className="text-blue-600" />
            <span>Payment Requisition</span>
            <span className="ml-auto rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">Baseline</span>
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-[var(--nfi-bg-secondary)]">
            <Upload size={16} className="text-blue-600" />
            <span>Discharge Summary / Report</span>
            <span className="ml-auto rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">Baseline</span>
          </div>
        </div>
      </NfiCard>
    </div>
  );
}

function SettlementSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nfi-text-secondary)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--nfi-text)]">{value}</p>
    </div>
  );
}

function DonorInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nfi-text-secondary)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--nfi-text)]">{value}</p>
    </div>
  );
}

function fmtCurrency(value?: number) {
  return value !== undefined ? `Rs ${value.toLocaleString()}` : 'N/A';
}
