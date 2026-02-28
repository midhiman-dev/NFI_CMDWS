import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { NfiButton } from '../design-system/NfiButton';
import { NfiField } from '../design-system/NfiField';
import { NfiCard } from '../design-system/NfiCard';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import { caseService } from '../../services/caseService';
import type { SettlementRecord, Case, CaseStatus } from '../../types';

interface Props {
  caseId: string;
  caseData?: Case;
  onStatusChange?: (newStatus: CaseStatus) => void;
}

export function SettlementTab({ caseId, caseData, onStatusChange }: Props) {
  const { provider, user } = useAppContext();
  const { showToast } = useToast();

  const [settlement, setSettlement] = useState<SettlementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [showClosureConfirm, setShowClosureConfirm] = useState(false);

  const [referenceAmount, setReferenceAmount] = useState<number | undefined>();
  const [finalBillAmount, setFinalBillAmount] = useState<number | undefined>();
  const [nfiPaidAmount, setNfiPaidAmount] = useState<number | undefined>();
  const [otherPaidAmount, setOtherPaidAmount] = useState<number | undefined>();

  const [directorDecision, setDirectorDecision] = useState<'Approved' | 'Returned' | ''>('');
  const [directorComments, setDirectorComments] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const result = await provider.getSettlement(caseId);
      setSettlement(result);
      if (result) {
        setReferenceAmount(result.referenceAmount);
        setFinalBillAmount(result.finalBillAmount);
        setNfiPaidAmount(result.nfiPaidAmount);
        setOtherPaidAmount(result.otherPaidAmount);
      }
    } catch { /* safe fallback */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const canEditSettlement = ['hospital_spoc', 'verifier', 'admin', 'leadership'].includes(user?.roles[0] || '');
  const canDirectorReview = ['admin', 'leadership'].includes(user?.roles[0] || '');
  const canCloseCaseWithSettlement = ['admin', 'leadership'].includes(user?.roles[0] || '');

  const computeVariance = (final?: number, reference?: number): { pct: number | null; flag: boolean } => {
    if (!reference || reference === 0 || final === undefined) {
      return { pct: null, flag: false };
    }
    const pct = Math.abs((final - reference) / reference) * 100;
    return { pct: Math.round(pct * 10) / 10, flag: pct > 10 };
  };

  const variance = computeVariance(finalBillAmount, referenceAmount);
  const requiresDirectorReview = variance.flag;
  const directorReviewSubmitted = settlement?.directorReview?.decision;

  const handleSaveSettlement = async () => {
    if (!canEditSettlement) {
      showToast('You do not have permission to edit settlement', 'error');
      return;
    }

    setSaving(true);
    try {
      const data: Partial<SettlementRecord> = {
        referenceAmount,
        finalBillAmount,
        nfiPaidAmount,
        otherPaidAmount,
      };

      if (variance.pct !== null) {
        data.variancePct = variance.pct;
        data.varianceFlag = variance.flag;
      }

      await provider.saveSettlement(caseId, data);

      const auditNotes = `Settlement saved: Reference ₹${referenceAmount || 'N/A'}, Final Bill ₹${finalBillAmount || 'N/A'}, Variance ${variance.pct !== null ? variance.pct + '%' : 'N/A'}`;
      await caseService.addAuditEvent({
        caseId,
        userId: user?.userId || 'unknown',
        userRole: user?.roles[0] || '',
        action: 'Settlement saved',
        notes: auditNotes,
        timestamp: new Date().toISOString(),
      });

      if (variance.flag && !directorReviewSubmitted) {
        await caseService.addAuditEvent({
          caseId,
          userId: user?.userId || 'unknown',
          userRole: user?.roles[0] || '',
          action: 'Variance flagged (>10%)',
          notes: `Variance ${variance.pct}% exceeds 10% threshold`,
          timestamp: new Date().toISOString(),
        });
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

    if (!directorDecision) {
      showToast('Please select a decision', 'error');
      return;
    }

    if (directorDecision === 'Returned' && !directorComments.trim()) {
      showToast('Comments are required when returning settlement', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      await provider.submitDirectorReview(caseId, directorDecision as 'Approved' | 'Returned', directorComments, user?.fullName || 'Unknown');

      const auditNotes = `Director ${directorDecision} settlement. ${directorComments ? 'Comments: ' + directorComments : ''}`;
      await caseService.addAuditEvent({
        caseId,
        userId: user?.userId || 'unknown',
        userRole: user?.roles[0] || '',
        action: `Director ${directorDecision} settlement`,
        notes: auditNotes,
        timestamp: new Date().toISOString(),
      });

      showToast(`Settlement ${directorDecision === 'Approved' ? 'approved' : 'returned'} by director`, 'success');
      await load();
      setDirectorDecision('');
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
  const directorApproved = !requiresDirectorReview || (requiresDirectorReview && directorReviewSubmitted === 'Approved');
  const canCloseCaseNow = settlementComplete && directorApproved && !isClosed;

  const handleCloseCaseWithSettlement = async () => {
    if (!canCloseCaseWithSettlement) {
      showToast('You do not have permission to close cases', 'error');
      return;
    }

    if (!canCloseCaseNow) {
      showToast('Settlement requirements not met', 'error');
      return;
    }

    setClosingCase(true);
    try {
      await provider.closeCaseWithSettlement(caseId, user?.fullName || 'Unknown');

      await caseService.addAuditEvent({
        caseId,
        userId: user?.userId || 'unknown',
        userRole: user?.roles[0] || '',
        action: 'Case closed',
        notes: 'Case closed via settlement workflow',
        timestamp: new Date().toISOString(),
      });

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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Settlement Summary</h3>
          {isClosed && <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-green-600 rounded">
            <CheckCircle size={16} /> Case Closed
          </span>}
        </div>

        <div className="space-y-4">
          <NfiField label="Reference Amount (₹)">
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

          <NfiField label="Final Bill Amount (₹)">
            <input
              type="number"
              className="nfi-input"
              value={finalBillAmount ?? ''}
              onChange={e => setFinalBillAmount(e.target.value ? +e.target.value : undefined)}
              disabled={!canEditSettlement || isClosed}
            />
          </NfiField>

          <NfiField label="Amount Paid by NFI (₹)">
            <input
              type="number"
              className="nfi-input"
              value={nfiPaidAmount ?? ''}
              onChange={e => setNfiPaidAmount(e.target.value ? +e.target.value : undefined)}
              disabled={!canEditSettlement || isClosed}
            />
          </NfiField>

          <NfiField label="Amount Paid by Family/Other (₹)">
            <input
              type="number"
              className="nfi-input"
              value={otherPaidAmount ?? ''}
              onChange={e => setOtherPaidAmount(e.target.value ? +e.target.value : undefined)}
              disabled={!canEditSettlement || isClosed}
            />
          </NfiField>

          <div className="p-4 bg-[var(--nfi-bg-secondary)] rounded border border-[var(--nfi-border)]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--nfi-text)]">Variance</span>
              <span className="text-lg font-semibold">
                {variance.pct !== null ? `${variance.pct}%` : 'N/A'}
              </span>
            </div>
            {variance.flag && (
              <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-amber-700">Director review required (variance &gt;10%)</span>
              </div>
            )}
          </div>

          {canEditSettlement && !isClosed && (
            <NfiButton onClick={handleSaveSettlement} disabled={saving} className="w-full">
              <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Settlement'}
            </NfiButton>
          )}
        </div>
      </NfiCard>

      {requiresDirectorReview && (
        <NfiCard className="p-6 border-amber-200 bg-amber-50">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">Director Review Required</h3>

          <div className="space-y-4 mb-4 p-4 bg-white rounded border border-amber-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--nfi-text-secondary)]">Reference Amount</span>
                <p className="font-semibold text-[var(--nfi-text)]">₹{referenceAmount?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[var(--nfi-text-secondary)]">Final Bill Amount</span>
                <p className="font-semibold text-[var(--nfi-text)]">₹{finalBillAmount?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[var(--nfi-text-secondary)]">Variance</span>
                <p className="font-semibold text-amber-600">{variance.pct}%</p>
              </div>
            </div>
          </div>

          {directorReviewSubmitted ? (
            <div className="p-4 bg-white rounded border border-green-300">
              <div className="mb-3">
                <span className="inline-block px-3 py-1 text-sm font-medium text-white bg-green-600 rounded">
                  {settlement?.directorReview?.decision}
                </span>
              </div>
              {settlement?.directorReview?.comments && (
                <div className="mb-2">
                  <span className="text-sm text-[var(--nfi-text-secondary)]">Comments</span>
                  <p className="text-[var(--nfi-text)]">{settlement.directorReview.comments}</p>
                </div>
              )}
              <div className="text-xs text-[var(--nfi-text-secondary)]">
                By {settlement?.directorReview?.by} on {new Date(settlement?.directorReview?.at || '').toLocaleDateString()}
              </div>
              {canDirectorReview && (
                <NfiButton variant="secondary" size="sm" onClick={() => setDirectorDecision('')} className="mt-3">
                  Change Decision
                </NfiButton>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <NfiField label="Director Decision" required>
                <select
                  className="nfi-input"
                  value={directorDecision}
                  onChange={e => setDirectorDecision(e.target.value as 'Approved' | 'Returned' | '')}
                  disabled={!canDirectorReview}
                >
                  <option value="">Select decision...</option>
                  <option value="Approved">Approve</option>
                  <option value="Returned">Return</option>
                </select>
              </NfiField>

              {directorDecision === 'Returned' && (
                <NfiField label="Director Comments" required>
                  <textarea
                    className="nfi-input min-h-[100px]"
                    value={directorComments}
                    onChange={e => setDirectorComments(e.target.value)}
                    disabled={!canDirectorReview}
                    placeholder="Provide reason for returning settlement..."
                  />
                </NfiField>
              )}

              {canDirectorReview && (
                <NfiButton onClick={handleSubmitDirectorReview} disabled={submittingReview || !directorDecision} className="w-full">
                  <Save size={16} className="mr-2" /> {submittingReview ? 'Submitting...' : 'Submit Decision'}
                </NfiButton>
              )}
            </div>
          )}
        </NfiCard>
      )}

      <NfiCard className="p-6">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-4">Case Closure</h3>

        <div className="space-y-3 mb-6 p-4 bg-[var(--nfi-bg-secondary)] rounded">
          <div className="flex items-center gap-2">
            {settlementComplete ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <AlertCircle size={18} className="text-gray-400" />
            )}
            <span className={settlementComplete ? 'text-green-600 font-medium' : 'text-[var(--nfi-text-secondary)]'}>
              Settlement Summary complete
            </span>
          </div>

          <div className="flex items-center gap-2">
            {directorApproved ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <AlertCircle size={18} className="text-amber-500" />
            )}
            <span className={directorApproved ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
              {requiresDirectorReview ? 'Director approval' : 'No director review required'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-blue-500" />
            <span className="text-[var(--nfi-text-secondary)] text-sm">
              Final Bill document (recommended but optional)
            </span>
          </div>
        </div>

        {canCloseCaseNow && !isClosed && (
          <>
            {!showClosureConfirm ? (
              <NfiButton onClick={() => setShowClosureConfirm(true)} className="w-full bg-green-600 hover:bg-green-700">
                Mark Case Closed
              </NfiButton>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                  <p className="font-semibold text-amber-900 mb-2">Confirm Case Closure</p>
                  <p className="text-sm text-amber-800 mb-4">
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
          <div className="p-4 bg-green-50 border border-green-200 rounded flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Case Closed</p>
              <p className="text-sm text-green-700">{settlement?.closedAt && `Closed on ${new Date(settlement.closedAt).toLocaleDateString()}`}</p>
            </div>
          </div>
        )}
      </NfiCard>

      <NfiCard className="p-6">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)] mb-4">Final Documents</h3>
        <p className="text-[var(--nfi-text-secondary)] text-sm mb-4">
          Upload final case documents (optional, except Final Bill recommended for closure)
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 p-2 hover:bg-[var(--nfi-bg-secondary)] rounded cursor-pointer">
            <Upload size={16} className="text-blue-600" />
            <span>Final Bill</span>
            <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Recommended</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-[var(--nfi-bg-secondary)] rounded cursor-pointer">
            <Upload size={16} className="text-blue-600" />
            <span>Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-[var(--nfi-bg-secondary)] rounded cursor-pointer">
            <Upload size={16} className="text-blue-600" />
            <span>Discharge Certificate</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-[var(--nfi-bg-secondary)] rounded cursor-pointer">
            <Upload size={16} className="text-blue-600" />
            <span>Discharge Summary</span>
          </div>
        </div>
      </NfiCard>
    </div>
  );
}
