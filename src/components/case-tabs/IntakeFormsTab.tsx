import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { intakeService } from '../../services/intakeService';
import { IntakeFundApplication, IntakeInterimSummary, IntakeCompleteness } from '../../types';
import { FundApplicationForm } from '../intake/FundApplicationForm';
import { InterimSummaryForm } from '../intake/InterimSummaryForm';
import { useToast } from '../design-system/Toast';
import { getAuthState } from '../../utils/auth';
import { providerFactory } from '../../data/providers/ProviderFactory';
import { deriveMaternalFields, isEmptyDerivedValue, parseDateFlexible } from '../../utils/derivedFields';
import { formatBabyDisplayName } from '../../utils/casePresentation';
import { deriveInterimSeedFromFundApplication } from '../../utils/intakeSeedMapping';

interface IntakeFormsTabProps {
  caseId: string;
  variant?: 'detail' | 'wizard';
  section?: 'fund' | 'interim' | 'both';
}

function createEmptyFundApplication(): IntakeFundApplication {
  return {
    parentsFamilySection: {},
    occupationIncomeSection: {},
    birthDetailsSection: {},
    nicuFinancialSection: {},
    otherSupportSection: {},
    declarationsSection: {},
    hospitalApprovalSection: {},
  };
}

function createEmptyInterimSummary(): IntakeInterimSummary {
  return {
    birthSummarySection: {},
    maternalDetailsSection: {},
    antenatalRiskFactorsSection: {},
    diagnosisSection: {},
    treatmentGivenSection: {},
    currentStatusSection: {},
    feedingRespirationSection: {},
    dischargePlanInvestigationsSection: {},
    remarksSignatureSection: {},
  };
}

export function IntakeFormsTab({ caseId, variant = 'detail', section = 'both' }: IntakeFormsTabProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const authState = getAuthState();
  const [fundApplication, setFundApplication] = useState<IntakeFundApplication | undefined>();
  const [interimSummary, setInterimSummary] = useState<IntakeInterimSummary | undefined>();
  const [completeness, setCompleteness] = useState<IntakeCompleteness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const canEdit = authState.activeRole === 'verifier' || authState.activeRole === 'hospital_spoc' || authState.activeRole === 'admin' || authState.activeRole === 'leadership';

  const loadIntakeData = async () => {
    try {
      setIsLoading(true);
      const provider = providerFactory.getProvider();
      const [data, caseData, beneficiary, family] = await Promise.all([
        intakeService.loadIntakeForCase(caseId),
        provider.getCaseById(caseId),
        provider.getBeneficiary(caseId).catch(() => null),
        provider.getFamily(caseId).catch(() => null),
      ]);

      const resolvedFund = data.fundApplication || createEmptyFundApplication();
      const seededAddress = [
        family?.address,
        family?.city,
        family?.state,
        family?.pincode,
      ].filter(Boolean).join(', ');
      const patchedFund: IntakeFundApplication = {
        ...resolvedFund,
        parentsFamilySection: {
          ...(resolvedFund.parentsFamilySection || {}),
          fatherName: resolvedFund.parentsFamilySection?.fatherName || family?.fatherName || undefined,
          motherName: resolvedFund.parentsFamilySection?.motherName || family?.motherName || undefined,
          fatherContactNo: resolvedFund.parentsFamilySection?.fatherContactNo || family?.phone || undefined,
          motherContactNo: resolvedFund.parentsFamilySection?.motherContactNo || family?.phone || undefined,
          addressDetails: resolvedFund.parentsFamilySection?.addressDetails || seededAddress || undefined,
        },
        birthDetailsSection: {
          ...(resolvedFund.birthDetailsSection || {}),
          babyDateOfBirth: resolvedFund.birthDetailsSection?.babyDateOfBirth || beneficiary?.dob || undefined,
          babyGender: resolvedFund.birthDetailsSection?.babyGender || beneficiary?.gender || undefined,
        },
      };
      const resolvedInterim = data.interimSummary || createEmptyInterimSummary();
      const interimSeed = deriveInterimSeedFromFundApplication(patchedFund, resolvedInterim);
      const patchedBirthSummary = {
        ...resolvedInterim.birthSummarySection,
        babyName: resolvedInterim.birthSummarySection?.babyName || formatBabyDisplayName(family?.motherName, beneficiary?.beneficiaryName),
        ...(interimSeed.birthSummarySection || {}),
        dateOfBirth: resolvedInterim.birthSummarySection?.dateOfBirth || patchedFund.birthDetailsSection?.babyDateOfBirth || beneficiary?.dob || undefined,
        gender: resolvedInterim.birthSummarySection?.gender || patchedFund.birthDetailsSection?.babyGender || beneficiary?.gender || undefined,
      };
      const patchedInterim = {
        ...resolvedInterim,
        birthSummarySection: patchedBirthSummary,
        maternalDetailsSection: {
          ...(resolvedInterim.maternalDetailsSection || {}),
          ...(interimSeed.maternalDetailsSection || {}),
        },
      };

      setFundApplication(patchedFund);
      setInterimSummary(patchedInterim);
      const intakeAsOfDate = parseDateFlexible(caseData?.intakeDate) || new Date();
      setAsOfDate(intakeAsOfDate);

      if (
        patchedFund.parentsFamilySection?.fatherName !== resolvedFund.parentsFamilySection?.fatherName ||
        patchedFund.parentsFamilySection?.motherName !== resolvedFund.parentsFamilySection?.motherName ||
        patchedFund.parentsFamilySection?.fatherContactNo !== resolvedFund.parentsFamilySection?.fatherContactNo ||
        patchedFund.parentsFamilySection?.motherContactNo !== resolvedFund.parentsFamilySection?.motherContactNo ||
        patchedFund.parentsFamilySection?.addressDetails !== resolvedFund.parentsFamilySection?.addressDetails ||
        patchedFund.birthDetailsSection?.babyDateOfBirth !== resolvedFund.birthDetailsSection?.babyDateOfBirth ||
        patchedFund.birthDetailsSection?.babyGender !== resolvedFund.birthDetailsSection?.babyGender
      ) {
        await intakeService.saveIntakeSection(caseId, 'fundApp', patchedFund);
      }

      if (
        patchedInterim.birthSummarySection?.babyName !== resolvedInterim.birthSummarySection?.babyName ||
        patchedInterim.birthSummarySection?.dateOfBirth !== resolvedInterim.birthSummarySection?.dateOfBirth ||
        patchedInterim.birthSummarySection?.gender !== resolvedInterim.birthSummarySection?.gender ||
        patchedInterim.birthSummarySection?.babyBirthWeightKg !== resolvedInterim.birthSummarySection?.babyBirthWeightKg ||
        patchedInterim.birthSummarySection?.isInborn !== resolvedInterim.birthSummarySection?.isInborn ||
        patchedInterim.birthSummarySection?.outbornHospitalName !== resolvedInterim.birthSummarySection?.outbornHospitalName ||
        patchedInterim.birthSummarySection?.gestationalAgeWeeks !== resolvedInterim.birthSummarySection?.gestationalAgeWeeks ||
        patchedInterim.maternalDetailsSection?.gravida !== resolvedInterim.maternalDetailsSection?.gravida ||
        patchedInterim.maternalDetailsSection?.parity !== resolvedInterim.maternalDetailsSection?.parity ||
        patchedInterim.maternalDetailsSection?.conceptionMode !== resolvedInterim.maternalDetailsSection?.conceptionMode
      ) {
        await intakeService.saveIntakeSection(caseId, 'interimSummary', patchedInterim);
      }

      const completenessData = await intakeService.getCompleteness(caseId);
      setCompleteness(completenessData);
    } catch (error) {
      console.error('Failed to load intake data:', error);
      showToast(t('intake.loadFailed', { defaultValue: 'Failed to load intake data' }), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntakeData();
  }, [caseId]);

  const motherDob = fundApplication?.parentsFamilySection?.motherDob;
  const marriageDate = fundApplication?.parentsFamilySection?.marriageDate;

  const derivedMaternalFields = useMemo(
    () => deriveMaternalFields(motherDob, marriageDate, asOfDate),
    [motherDob, marriageDate, asOfDate]
  );

  useEffect(() => {
    if (!canEdit) return;
    if (!interimSummary) return;

    const maternalDetails = interimSummary.maternalDetailsSection || {};
    const canOverwriteDerived = maternalDetails._autoDerived === true;

    let hasChanges = false;
    const updatedMaternalDetails = { ...maternalDetails };

    const shouldSetMotherAge = canOverwriteDerived || isEmptyDerivedValue(maternalDetails.motherAge);
    if (shouldSetMotherAge && derivedMaternalFields.motherAge !== undefined && maternalDetails.motherAge !== derivedMaternalFields.motherAge) {
      updatedMaternalDetails.motherAge = derivedMaternalFields.motherAge;
      hasChanges = true;
    }

    const shouldSetYearsMarried = canOverwriteDerived || isEmptyDerivedValue(maternalDetails.yearsMarried);
    const shouldSetMaritalStatus = canOverwriteDerived || isEmptyDerivedValue(maternalDetails.maritalStatus);

    if (marriageDate && parseDateFlexible(marriageDate)) {
      if (shouldSetYearsMarried && derivedMaternalFields.yearsMarried !== undefined && maternalDetails.yearsMarried !== derivedMaternalFields.yearsMarried) {
        updatedMaternalDetails.yearsMarried = derivedMaternalFields.yearsMarried;
        hasChanges = true;
      }
      if (shouldSetMaritalStatus && maternalDetails.maritalStatus !== 'Married') {
        updatedMaternalDetails.maritalStatus = 'Married';
        hasChanges = true;
      }
    } else {
      if (shouldSetYearsMarried && maternalDetails.yearsMarried !== undefined) {
        updatedMaternalDetails.yearsMarried = undefined;
        hasChanges = true;
      }
      if (shouldSetMaritalStatus && maternalDetails.maritalStatus !== '') {
        updatedMaternalDetails.maritalStatus = '';
        hasChanges = true;
      }
    }

    if (!hasChanges) return;

    updatedMaternalDetails._autoDerived = true;

    const updatedInterimSummary: IntakeInterimSummary = {
      ...interimSummary,
      maternalDetailsSection: updatedMaternalDetails,
    };

    setInterimSummary(updatedInterimSummary);
    void intakeService.saveIntakeSection(caseId, 'interimSummary', updatedInterimSummary)
      .then(() => intakeService.getCompleteness(caseId))
      .then(setCompleteness)
      .catch(error => {
        console.error('Failed to persist derived maternal details:', error);
      });
  }, [canEdit, caseId, marriageDate, derivedMaternalFields, interimSummary]);

  useEffect(() => {
    if (!canEdit) return;
    if (!interimSummary) return;

    const interimSeed = deriveInterimSeedFromFundApplication(fundApplication, interimSummary);
    if (!interimSeed.birthSummarySection && !interimSeed.maternalDetailsSection) return;

    const updatedInterimSummary: IntakeInterimSummary = {
      ...interimSummary,
      birthSummarySection: {
        ...(interimSummary.birthSummarySection || {}),
        ...(interimSeed.birthSummarySection || {}),
      },
      maternalDetailsSection: {
        ...(interimSummary.maternalDetailsSection || {}),
        ...(interimSeed.maternalDetailsSection || {}),
      },
    };

    setInterimSummary(updatedInterimSummary);
    void intakeService.saveIntakeSection(caseId, 'interimSummary', updatedInterimSummary)
      .then(() => intakeService.getCompleteness(caseId))
      .then(setCompleteness)
      .catch(error => {
        console.error('Failed to persist linked interim summary defaults:', error);
      });
  }, [canEdit, caseId, fundApplication, interimSummary]);

  const handleFundAppSectionSave = async (sectionName: string, data: any) => {
    try {
      const updated: IntakeFundApplication = {
        ...(fundApplication || createEmptyFundApplication()),
        [sectionName]: data,
      };
      await intakeService.saveIntakeSection(caseId, 'fundApp', updated);
      setFundApplication(updated);

      const completenessData = await intakeService.getCompleteness(caseId);
      setCompleteness(completenessData);

      showToast(t('intake.fundSaved', { defaultValue: 'Fund Application section saved' }), 'success');
    } catch (error) {
      console.error('Failed to save section:', error);
      showToast(t('intake.saveFailed', { defaultValue: 'Failed to save section' }), 'error');
    }
  };

  const handleInterimSummarySectionSave = async (sectionName: string, data: any) => {
    try {
      const updated: IntakeInterimSummary = {
        ...(interimSummary || createEmptyInterimSummary()),
        [sectionName]: data,
      };
      await intakeService.saveIntakeSection(caseId, 'interimSummary', updated);
      setInterimSummary(updated);

      const completenessData = await intakeService.getCompleteness(caseId);
      setCompleteness(completenessData);

      showToast(t('intake.interimSaved', { defaultValue: 'Interim Summary section saved' }), 'success');
    } catch (error) {
      console.error('Failed to save section:', error);
      showToast(t('intake.saveFailed', { defaultValue: 'Failed to save section' }), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--nfi-text-light)]">{t('intake.loadingForms')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-700">{t('intake.readOnly')}</p>
          </div>
        </div>
      )}

      {completeness && (
        <div className="bg-white border border-[var(--nfi-border)] rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--nfi-text)] mb-2">{t('intake.overallProgress')}</h3>
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
                {t('intake.percentComplete', { defaultValue: '{{percent}}% complete', percent: completeness.overallPercent })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section !== 'interim' && (
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
                        {t('wizard.steps.fundApplication')}
                      </h4>
                      <p className="text-sm text-[var(--nfi-text-light)]">
                        {t('intake.percentComplete', { defaultValue: '{{percent}}% complete', percent: completeness.fundAppTotalPercent })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {section !== 'fund' && (
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
                        {t('wizard.steps.interimSummary')}
                      </h4>
                      <p className="text-sm text-[var(--nfi-text-light)]">
                        {t('intake.percentComplete', { defaultValue: '{{percent}}% complete', percent: completeness.interimSummaryTotalPercent })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {section !== 'interim' && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--nfi-text)] mb-4">{t('wizard.steps.fundApplication')}</h2>
            <FundApplicationForm
              caseId={caseId}
              initialData={fundApplication}
              onSectionSave={handleFundAppSectionSave}
              onFormDataChange={setFundApplication}
              isLoading={isLoading}
              readOnly={!canEdit}
            />
          </div>
        )}

        {section !== 'fund' && (
          <div className={section === 'both' ? 'border-t border-[var(--nfi-border)] pt-6' : ''}>
            <h2 className="text-2xl font-bold text-[var(--nfi-text)] mb-4">{t('wizard.steps.interimSummary')}</h2>
            <InterimSummaryForm
              caseId={caseId}
              initialData={interimSummary}
              onSectionSave={handleInterimSummarySectionSave}
              onFormDataChange={setInterimSummary}
              readOnly={!canEdit}
              isLoading={isLoading}
              parentDobContext={{
                motherDob: fundApplication?.parentsFamilySection?.motherDob,
                fatherDob: fundApplication?.parentsFamilySection?.fatherDob,
              }}
            />
          </div>
        )}
      </div>

      {variant === 'wizard' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              {t('intake.completeRequiredNow')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
