import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { intakeService } from '../../services/intakeService';
import { IntakeFundApplication, IntakeInterimSummary, IntakeCompleteness } from '../../types';
import { FundApplicationForm } from '../intake/FundApplicationForm';
import { InterimSummaryForm } from '../intake/InterimSummaryForm';
import { useToast } from '../design-system/Toast';
import { getAuthState } from '../../utils/auth';

interface IntakeFormsTabProps {
  caseId: string;
  variant?: 'detail' | 'wizard';
}

export function IntakeFormsTab({ caseId, variant = 'detail' }: IntakeFormsTabProps) {
  const { showToast } = useToast();
  const authState = getAuthState();
  const [fundApplication, setFundApplication] = useState<IntakeFundApplication | undefined>();
  const [interimSummary, setInterimSummary] = useState<IntakeInterimSummary | undefined>();
  const [completeness, setCompleteness] = useState<IntakeCompleteness | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = authState.activeRole === 'verifier' || authState.activeRole === 'hospital_spoc' || authState.activeRole === 'admin' || authState.activeRole === 'leadership';

  const loadIntakeData = async () => {
    try {
      setIsLoading(true);
      const data = await intakeService.loadIntakeForCase(caseId);
      setFundApplication(data.fundApplication);
      setInterimSummary(data.interimSummary);

      const completenessData = await intakeService.getCompleteness(caseId);
      setCompleteness(completenessData);
    } catch (error) {
      console.error('Failed to load intake data:', error);
      showToast('Failed to load intake data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntakeData();
  }, [caseId]);

  const handleFundAppSectionSave = async (section: string, data: any) => {
    try {
      const updated = { ...fundApplication, [section]: data };
      await intakeService.saveIntakeSection(caseId, 'fundApp', updated);
      setFundApplication(updated);

      const completenessData = await intakeService.getCompleteness(caseId);
      setCompleteness(completenessData);

      showToast('Fund Application section saved', 'success');
    } catch (error) {
      console.error('Failed to save section:', error);
      showToast('Failed to save section', 'error');
    }
  };

  const handleInterimSummarySectionSave = async (section: string, data: any) => {
    try {
      const updated = { ...interimSummary, [section]: data };
      await intakeService.saveIntakeSection(caseId, 'interimSummary', updated);
      setInterimSummary(updated);

      const completenessData = await intakeService.getCompleteness(caseId);
      setCompleteness(completenessData);

      showToast('Interim Summary section saved', 'success');
    } catch (error) {
      console.error('Failed to save section:', error);
      showToast('Failed to save section', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--nfi-text-light)]">Loading intake forms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-700">You are viewing intake forms in read-only mode.</p>
          </div>
        </div>
      )}

      {completeness && (
        <div className="bg-white border border-[var(--nfi-border)] rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--nfi-text)] mb-2">Overall Progress</h3>
              <div className="w-full bg-[var(--nfi-bg-light)] rounded-full h-3 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${completeness.overallPercent}%`,
                    backgroundColor: completeness.allRequiredFieldsComplete
                      ? 'var(--nfi-success)'
                      : 'var(--nfi-primary)',
                  }}
                />
              </div>
              <p className="text-sm text-[var(--nfi-text-light)] mt-2">
                {completeness.overallPercent}% complete
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${
                completeness.fundAppIsComplete
                  ? 'bg-[var(--nfi-success-bg)] border-[var(--nfi-success-border)]'
                  : 'bg-[var(--nfi-warning-bg)] border-[var(--nfi-warning-border)]'
              }`}>
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    size={20}
                    style={{
                      color: completeness.fundAppIsComplete ? 'var(--nfi-success)' : 'var(--nfi-warning)',
                    }}
                  />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      completeness.fundAppIsComplete
                        ? 'text-[var(--nfi-success)]'
                        : 'text-[var(--nfi-warning)]'
                    }`}>
                      Fund Application
                    </h4>
                    <p className="text-sm text-[var(--nfi-text-light)]">
                      {completeness.fundAppTotalPercent}% complete
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                completeness.interimSummaryIsComplete
                  ? 'bg-[var(--nfi-success-bg)] border-[var(--nfi-success-border)]'
                  : 'bg-[var(--nfi-warning-bg)] border-[var(--nfi-warning-border)]'
              }`}>
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    size={20}
                    style={{
                      color: completeness.interimSummaryIsComplete ? 'var(--nfi-success)' : 'var(--nfi-warning)',
                    }}
                  />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      completeness.interimSummaryIsComplete
                        ? 'text-[var(--nfi-success)]'
                        : 'text-[var(--nfi-warning)]'
                    }`}>
                      Interim Summary
                    </h4>
                    <p className="text-sm text-[var(--nfi-text-light)]">
                      {completeness.interimSummaryTotalPercent}% complete
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--nfi-text)] mb-4">Fund Application</h2>
          <FundApplicationForm
            caseId={caseId}
            initialData={fundApplication}
            onSectionSave={handleFundAppSectionSave}
            isLoading={isLoading}
            readOnly={!canEdit}
          />
        </div>

        <div className="border-t border-[var(--nfi-border)] pt-6">
          <h2 className="text-2xl font-bold text-[var(--nfi-text)] mb-4">Interim Summary</h2>
          <InterimSummaryForm
            caseId={caseId}
            initialData={interimSummary}
            onSectionSave={handleInterimSummarySectionSave}
            readOnly={!canEdit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {variant === 'wizard' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Intake forms are optional during case creation. You can complete them later from Case → Intake Forms. Intake will be required before submission to committee.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
