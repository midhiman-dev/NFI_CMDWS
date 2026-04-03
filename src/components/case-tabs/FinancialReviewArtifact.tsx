import { AlertCircle, CheckCircle2, CircleDollarSign, FileWarning } from 'lucide-react';
import { NfiBadge } from '../design-system/NfiBadge';
import type { FinancialReviewContext } from '../../utils/financialReview';
import { toCurrency } from '../../utils/fundingConfig';
import {
  formatVarianceCurrency,
  formatVariancePercent,
  getVarianceDirectionLabel,
  getVarianceStatusTone,
} from '../../utils/varianceGovernance';

function getCueTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'available') return 'success';
  if (status === 'missing') return 'warning';
  return 'neutral';
}

function ArtifactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">{label}</p>
      <p className="text-sm leading-5 text-[var(--nfi-text)] break-words whitespace-normal">{value}</p>
    </div>
  );
}

export function FinancialReviewArtifactCard({ context }: { context: FinancialReviewContext }) {
  const { artifact, readiness } = context;

  return (
    <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] p-4 space-y-4 min-w-0 h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--nfi-text)]">Financial reviewer artifact</p>
          <p className="text-xs text-[var(--nfi-text-secondary)]">
            Internal finance summary across H2 income, financial artifacts, settlement, and donor mapping context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NfiBadge tone={artifact.manualReviewRequired ? 'warning' : 'success'}>
            {artifact.manualReviewRequired ? 'Manual review required' : 'Eligibility summary ready'}
          </NfiBadge>
          <NfiBadge tone={readiness.primaryFinancialProofAvailable ? 'success' : 'warning'}>
            {artifact.proofReadinessLabel}
          </NfiBadge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ArtifactItem label="Income basis" value={artifact.captureBasisLabel} />
        <ArtifactItem label="Father value" value={artifact.fatherValue} />
        <ArtifactItem label="Mother value" value={artifact.motherValue} />
        <ArtifactItem label="Combined income" value={artifact.combinedIncome} />
        <ArtifactItem label="Threshold outcome" value={artifact.thresholdOutcome} />
        <ArtifactItem label="Requested amount" value={toCurrency(artifact.requestedAmount)} />
        <ArtifactItem label="Reference amount" value={toCurrency(artifact.referenceAmount)} />
        <ArtifactItem label="Estimated bill" value={toCurrency(artifact.estimatedBill)} />
        <ArtifactItem label="Approved amount" value={toCurrency(artifact.approvedAmount)} />
        <ArtifactItem label="Paid amount" value={toCurrency(artifact.paidAmount)} />
        <ArtifactItem label="Outstanding" value={toCurrency(artifact.outstandingAmount)} />
        <ArtifactItem label="Funding source" value={artifact.fundingSource} />
        <ArtifactItem label="Donor / sponsor" value={artifact.donorOrSponsor} />
        <ArtifactItem label="Donor allocation" value={artifact.donorAllocation} />
        <ArtifactItem label="Supported by" value={artifact.supportedBy} />
      </div>

      <div className="rounded-lg border border-[var(--nfi-border)] bg-white px-3 py-3 text-sm text-[var(--nfi-text)]">
        <span className="font-medium">Financial review note:</span> {artifact.financialReviewNote}
      </div>
    </div>
  );
}

export function FinancialArtifactReadinessCard({ context }: { context: FinancialReviewContext }) {
  const { readiness } = context;

  return (
    <div className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-3 min-w-0 h-full">
      <div className="flex items-center gap-2">
        <FileWarning size={16} className="text-[var(--nfi-text-secondary)]" />
        <p className="font-semibold text-[var(--nfi-text)]">Financial artifact readiness</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {readiness.cues.map((cue) => (
          <div key={cue.key} className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-[var(--nfi-text)] break-words">{cue.label}</p>
              <NfiBadge tone={getCueTone(cue.status)}>
                {cue.status === 'available' ? 'Available' : cue.status === 'missing' ? 'Missing' : cue.status === 'context' ? 'Context available' : 'Partial'}
              </NfiBadge>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--nfi-text-secondary)] break-words">{cue.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SponsorIntelligenceCard({ context }: { context: FinancialReviewContext }) {
  const { sponsorIntelligence, reviewerNotes } = context;

  return (
    <div className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-3 min-w-0 h-full">
      <div className="flex items-center gap-2">
        <CircleDollarSign size={16} className="text-[var(--nfi-text-secondary)]" />
        <p className="font-semibold text-[var(--nfi-text)]">Sponsor intelligence</p>
      </div>
      <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3 space-y-3 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--nfi-text)] break-words">{sponsorIntelligence.state.label}</p>
            <p className="text-xs leading-5 text-[var(--nfi-text-secondary)] break-words">{sponsorIntelligence.state.detail}</p>
          </div>
          <NfiBadge tone={sponsorIntelligence.state.tone}>{sponsorIntelligence.state.label}</NfiBadge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <ArtifactItem label="Suggested program" value={sponsorIntelligence.suggestedProgram || 'Awaiting reviewer input'} />
          <ArtifactItem label="Suggested campaign" value={sponsorIntelligence.suggestedCampaign || 'No strong recommendation yet'} />
          <ArtifactItem label="Suggested amount" value={toCurrency(sponsorIntelligence.proposedSponsorAmount)} />
          <ArtifactItem label="Top-up indication" value={sponsorIntelligence.topUpIndicated ? 'Yes' : 'No'} />
        </div>
      </div>

      <div className="space-y-2">
        {sponsorIntelligence.rationale.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-[var(--nfi-text)] min-w-0">
            <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 shrink-0" />
            <span className="break-words">{item}</span>
          </div>
        ))}
        {reviewerNotes.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 text-amber-600 shrink-0" />
              <div className="space-y-1 text-sm text-amber-900">
                {reviewerNotes.slice(0, 3).map((note, index) => (
                  <p key={`${note}-${index}`} className="break-words">{note}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VarianceGovernanceCard({ context }: { context: FinancialReviewContext }) {
  const { varianceGovernance } = context;

  return (
    <div className="rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--nfi-text)]">Variance Governance</p>
          <p className="text-xs text-[var(--nfi-text-secondary)] break-words">
            Finance governance visibility for final bill versus estimate/reference baseline.
          </p>
        </div>
        <NfiBadge tone={getVarianceStatusTone(varianceGovernance.status)}>
          {varianceGovernance.governanceBadge}
        </NfiBadge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <ArtifactItem label="Baseline amount" value={toCurrency(varianceGovernance.baselineAmount ?? undefined)} />
        <ArtifactItem label="Final bill amount" value={toCurrency(varianceGovernance.finalBillAmount ?? undefined)} />
        <ArtifactItem label="Variance amount" value={formatVarianceCurrency(varianceGovernance.varianceAmount)} />
        <ArtifactItem label="Variance %" value={formatVariancePercent(varianceGovernance.variancePercent)} />
        <ArtifactItem
          label="Director review"
          value={
            varianceGovernance.status === 'director_review_completed'
              ? 'Completed'
              : varianceGovernance.directorReviewRequired
              ? 'Required'
              : varianceGovernance.status === 'pending_data'
              ? 'Pending'
              : 'Not required'
          }
        />
      </div>

      <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3 text-sm text-[var(--nfi-text)] space-y-1">
        <p><span className="font-medium">Direction:</span> {getVarianceDirectionLabel(varianceGovernance.varianceDirection)}</p>
        <p><span className="font-medium">Tolerance rule:</span> {varianceGovernance.tolerancePercent}%</p>
        <p><span className="font-medium">Governance note:</span> {varianceGovernance.governanceMessage}</p>
      </div>
    </div>
  );
}
