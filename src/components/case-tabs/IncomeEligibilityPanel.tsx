import { AlertCircle, BadgeAlert, CheckCircle2 } from 'lucide-react';
import { NfiBadge } from '../design-system/NfiBadge';
import type { IncomeThresholdEvaluation } from '../../utils/incomeEligibility';
import { buildFinancialReviewSummary, formatIncomeRuleOutcome } from '../../utils/incomeEligibility';

interface IncomeEligibilityPanelProps {
  evaluation: IncomeThresholdEvaluation;
  audience: 'hospital' | 'internal' | 'reviewer';
  title?: string;
  className?: string;
}

function getManualReviewLabel(evaluation: IncomeThresholdEvaluation, audience: IncomeEligibilityPanelProps['audience']): string {
  if (!evaluation.manualReviewRequired) {
    return audience === 'hospital' ? 'Review can continue' : 'Manual review not required';
  }

  return evaluation.exceptionReviewRecommended ? 'Exception review marker' : 'Manual review marker';
}

export function IncomeEligibilityPanel({
  evaluation,
  audience,
  title = 'Income & Eligibility Summary',
  className = '',
}: IncomeEligibilityPanelProps) {
  const summaryRows = buildFinancialReviewSummary(evaluation);

  return (
    <div className={`rounded-lg border border-[var(--nfi-border)] bg-white p-4 space-y-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">{title}</h3>
          <p className="text-sm text-[var(--nfi-text-secondary)]">{formatIncomeRuleOutcome(evaluation)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NfiBadge tone={evaluation.badgeTone}>{evaluation.badgeLabel}</NfiBadge>
          <NfiBadge tone={evaluation.manualReviewRequired ? 'warning' : 'success'}>
            {getManualReviewLabel(evaluation, audience)}
          </NfiBadge>
        </div>
      </div>

      {evaluation.warningBanner && (
        <div className={`rounded-lg border px-3 py-3 flex items-start gap-2 ${
          evaluation.badgeTone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-blue-200 bg-blue-50 text-blue-900'
        }`}>
          {evaluation.manualReviewRequired ? (
            <BadgeAlert size={18} className="mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{evaluation.warningBanner}</p>
        </div>
      )}

      {audience !== 'hospital' && evaluation.manualReviewRequired && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 flex items-start gap-2 text-blue-900">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{evaluation.financialReviewNote}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {summaryRows.map((row) => (
          <div key={row.label}>
            <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">{row.label}</p>
            <p className="text-sm font-medium text-[var(--nfi-text)]">{row.value}</p>
          </div>
        ))}
      </div>

      {evaluation.reviewNotes.length > 0 && (
        <div className="rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)] mb-2">Review Notes</p>
          <div className="space-y-1">
            {evaluation.reviewNotes.map((note) => (
              <p key={note} className="text-sm text-[var(--nfi-text)]">{note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
