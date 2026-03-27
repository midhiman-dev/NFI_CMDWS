import { useEffect, useMemo, useState } from 'react';
import { IntakeFundApplication } from '../../types';
import { NfiField } from '../design-system/NfiField';
import { IntakeSectionAccordion } from './IntakeSectionAccordion';
import { formatDateDMY } from '../../utils/dateFormat';
import { textareaBase, selectBase } from '../ui/formStyles';
import {
  validateFundApplicationSection,
  FUND_APPLICATION_FIELDS,
  getFundApplicationSectionProgress,
  getSectionStatus,
  type ValidationResult,
} from '../../utils/intakeValidation';
import {
  parseBirthWeightInput,
  parseCurrencyInput,
  parseIntegerInput,
  fromInbornOutbornValue,
  toInbornOutbornValue,
} from '../../utils/intakeFormHelpers';
import { getIncomeCaptureModeByOccupation, evaluateIncomeThreshold } from '../../utils/incomeEligibility';
import { IncomeEligibilityPanel } from '../case-tabs/IncomeEligibilityPanel';

interface FundApplicationFormProps {
  caseId: string;
  initialData?: IntakeFundApplication;
  onSectionSave: (section: string, data: any) => Promise<void>;
  onValidationBlocked?: (section: string, validation: ValidationResult) => void;
  onFormDataChange?: (data: IntakeFundApplication) => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function FundApplicationForm({
  initialData,
  onSectionSave,
  onValidationBlocked,
  onFormDataChange,
  readOnly = false,
}: FundApplicationFormProps) {
  const [formData, setFormData] = useState<IntakeFundApplication>(
    initialData || {
      parentsFamilySection: {},
      occupationIncomeSection: {},
      birthDetailsSection: {},
      nicuFinancialSection: {},
      otherSupportSection: {},
      declarationsSection: {},
      hospitalApprovalSection: {},
    }
  );

  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [sectionErrors, setSectionErrors] = useState<Record<string, Record<string, string>>>({});
  const incomeEvaluation = useMemo(
    () => evaluateIncomeThreshold(formData.occupationIncomeSection),
    [formData.occupationIncomeSection]
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleFieldChange = (section: string, field: string, value: any) => {
    if (readOnly) return;

    setFormData(prev => {
      const nextSection = {
        ...prev[section as keyof IntakeFundApplication],
        [field]: value,
      } as Record<string, unknown>;

      if (section === 'declarationsSection' && field === 'declarationTruthfulnessAccepted') {
        nextSection.declarationsAccepted = value;
      }

      const nextData = {
        ...prev,
        [section]: nextSection,
      } as IntakeFundApplication;

      onFormDataChange?.(nextData);
      return nextData;
    });
    setDirtyFields(prev => new Set([...prev, section]));
  };

  const handleSectionSave = async (section: string) => {
    if (readOnly) return;

    const sectionData = formData[section as keyof IntakeFundApplication];
    const validation = validateFundApplicationSection(section, sectionData, formData);

    if (!validation.isValid) {
      setSectionErrors(prev => ({
        ...prev,
        [section]: validation.errors,
      }));
      onValidationBlocked?.(section, validation);
      return;
    }

    setSectionErrors(prev => {
      const updated = { ...prev };
      delete updated[section];
      return updated;
    });

    await onSectionSave(section, sectionData);
    setDirtyFields(prev => {
      const updated = new Set(prev);
      updated.delete(section);
      return updated;
    });
  };

  const getSectionMetrics = (sectionKey: keyof typeof FUND_APPLICATION_FIELDS) => {
    const section = formData[sectionKey];
    const progress = getFundApplicationSectionProgress(sectionKey, section);
    const status = getSectionStatus(progress);
    return { progress, status };
  };

  const fatherIncomeMode = getIncomeCaptureModeByOccupation(formData.occupationIncomeSection?.fatherOccupation);
  const motherIncomeMode = getIncomeCaptureModeByOccupation(formData.occupationIncomeSection?.motherOccupation);

  return (
    <div className="space-y-4">
      {(() => {
        const { progress, status } = getSectionMetrics('parentsFamilySection');
        return (
          <IntakeSectionAccordion
            title="Parents & Family"
            sectionId="parentsFamilySection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('parentsFamilySection')}
            errors={sectionErrors.parentsFamilySection || {}}
            isDirty={!readOnly && dirtyFields.has('parentsFamilySection')}
          >
            <div className="grid grid-cols-2 gap-4">
              <NfiField label="Father Name" required type="input" inputProps={{ type: 'text', value: formData.parentsFamilySection?.fatherName || '', onChange: e => handleFieldChange('parentsFamilySection', 'fatherName', e.target.value), disabled: readOnly }} />
              <NfiField label="Mother Name" required type="input" inputProps={{ type: 'text', value: formData.parentsFamilySection?.motherName || '', onChange: e => handleFieldChange('parentsFamilySection', 'motherName', e.target.value), disabled: readOnly }} />
              <NfiField label="Father Contact No" required type="input" inputProps={{ type: 'tel', value: formData.parentsFamilySection?.fatherContactNo || '', onChange: e => handleFieldChange('parentsFamilySection', 'fatherContactNo', e.target.value), disabled: readOnly }} />
              <NfiField label="Mother Contact No" required type="input" inputProps={{ type: 'tel', value: formData.parentsFamilySection?.motherContactNo || '', onChange: e => handleFieldChange('parentsFamilySection', 'motherContactNo', e.target.value), disabled: readOnly }} />
              <div className="col-span-2">
                <NfiField
                  label="Address Details"
                  required
                  type="textarea"
                  textareaProps={{
                    value: formData.parentsFamilySection?.addressDetails || '',
                    onChange: e => handleFieldChange('parentsFamilySection', 'addressDetails', e.target.value),
                    disabled: readOnly,
                  }}
                />
              </div>
              <NfiField label="Father DOB" required error={sectionErrors.parentsFamilySection?.fatherDob} type="input" inputProps={{ type: 'date', value: formData.parentsFamilySection?.fatherDob || '', onChange: e => handleFieldChange('parentsFamilySection', 'fatherDob', e.target.value), disabled: readOnly }} />
              <NfiField label="Mother DOB" required error={sectionErrors.parentsFamilySection?.motherDob} type="input" inputProps={{ type: 'date', value: formData.parentsFamilySection?.motherDob || '', onChange: e => handleFieldChange('parentsFamilySection', 'motherDob', e.target.value), disabled: readOnly }} />
              <NfiField label="Father Education" required type="input" inputProps={{ type: 'text', value: formData.parentsFamilySection?.fatherEducation || '', onChange: e => handleFieldChange('parentsFamilySection', 'fatherEducation', e.target.value), disabled: readOnly }} />
              <NfiField label="Mother Education" required type="input" inputProps={{ type: 'text', value: formData.parentsFamilySection?.motherEducation || '', onChange: e => handleFieldChange('parentsFamilySection', 'motherEducation', e.target.value), disabled: readOnly }} />
              <NfiField label="Date of Marriage" required type="input" inputProps={{ type: 'date', value: formData.parentsFamilySection?.marriageDate || '', onChange: e => handleFieldChange('parentsFamilySection', 'marriageDate', e.target.value), disabled: readOnly }} />
              <NfiField label="Number of Family Members" required type="input" inputProps={{ type: 'number', min: 1, value: formData.parentsFamilySection?.numberOfFamilyMembers ?? '', onChange: e => handleFieldChange('parentsFamilySection', 'numberOfFamilyMembers', parseIntegerInput(e.target.value)), disabled: readOnly }} />
            </div>
          </IntakeSectionAccordion>
        );
      })()}

      {(() => {
        const { progress, status } = getSectionMetrics('occupationIncomeSection');
        return (
          <IntakeSectionAccordion
            title="Occupation, Income & Proof"
            sectionId="occupationIncomeSection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('occupationIncomeSection')}
            errors={sectionErrors.occupationIncomeSection || {}}
            isDirty={!readOnly && dirtyFields.has('occupationIncomeSection')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className={`rounded-lg border p-4 space-y-4 ${fatherIncomeMode === 'monthly_primary' ? 'border-teal-300 bg-teal-50/60' : fatherIncomeMode === 'daily_primary' ? 'border-amber-300 bg-amber-50/60' : 'border-[var(--nfi-border)] bg-white'}`}>
                  <div>
                    <p className="text-sm font-semibold text-[var(--nfi-text)]">Father income capture</p>
                    <p className="text-xs text-[var(--nfi-text-secondary)]">
                      {fatherIncomeMode === 'monthly_primary'
                        ? 'Monthly income is the primary field for this occupation. Daily wage stays visible for reference if needed.'
                        : fatherIncomeMode === 'daily_primary'
                        ? 'Daily wage is the primary field for this occupation. Monthly income stays visible for reference if needed.'
                        : 'Keep both fields visible and fill the one that best matches the occupation.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NfiField label="Father Occupation" required type="input" inputProps={{ type: 'text', value: formData.occupationIncomeSection?.fatherOccupation || '', onChange: e => handleFieldChange('occupationIncomeSection', 'fatherOccupation', e.target.value), disabled: readOnly }} />
                    <NfiField label="Father Employer / Company Name" required type="input" inputProps={{ type: 'text', value: formData.occupationIncomeSection?.fatherEmployer || '', onChange: e => handleFieldChange('occupationIncomeSection', 'fatherEmployer', e.target.value), disabled: readOnly }} />
                    <NfiField label="Father Monthly Income (INR)" required={fatherIncomeMode === 'monthly_primary'} error={sectionErrors.occupationIncomeSection?.fatherMonthlyIncome} hint={fatherIncomeMode === 'monthly_primary' ? 'Preferred for salaried or fixed-income occupations.' : 'Optional if daily wage is the active income basis.'} type="input" inputProps={{ type: 'number', value: formData.occupationIncomeSection?.fatherMonthlyIncome ?? '', onChange: e => handleFieldChange('occupationIncomeSection', 'fatherMonthlyIncome', parseCurrencyInput(e.target.value)), disabled: readOnly, className: fatherIncomeMode === 'monthly_primary' ? 'border-teal-400 bg-white' : undefined }} />
                    <NfiField label="Father Daily Wages (INR)" required={fatherIncomeMode === 'daily_primary'} error={sectionErrors.occupationIncomeSection?.fatherDailyIncome} hint={fatherIncomeMode === 'daily_primary' ? 'Preferred for daily wage or casual work.' : 'Optional if monthly income is the active income basis.'} type="input" inputProps={{ type: 'number', value: formData.occupationIncomeSection?.fatherDailyIncome ?? '', onChange: e => handleFieldChange('occupationIncomeSection', 'fatherDailyIncome', parseCurrencyInput(e.target.value)), disabled: readOnly, className: fatherIncomeMode === 'daily_primary' ? 'border-amber-400 bg-white' : undefined }} />
                  </div>
                </div>

                <div className={`rounded-lg border p-4 space-y-4 ${motherIncomeMode === 'monthly_primary' ? 'border-teal-300 bg-teal-50/60' : motherIncomeMode === 'daily_primary' ? 'border-amber-300 bg-amber-50/60' : 'border-[var(--nfi-border)] bg-white'}`}>
                  <div>
                    <p className="text-sm font-semibold text-[var(--nfi-text)]">Mother income capture</p>
                    <p className="text-xs text-[var(--nfi-text-secondary)]">
                      {motherIncomeMode === 'monthly_primary'
                        ? 'Monthly income is the primary field for this occupation. Daily wage stays visible for reference if needed.'
                        : motherIncomeMode === 'daily_primary'
                        ? 'Daily wage is the primary field for this occupation. Monthly income stays visible for reference if needed.'
                        : 'Keep both fields visible and fill the one that best matches the occupation.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NfiField label="Mother Occupation" required type="input" inputProps={{ type: 'text', value: formData.occupationIncomeSection?.motherOccupation || '', onChange: e => handleFieldChange('occupationIncomeSection', 'motherOccupation', e.target.value), disabled: readOnly }} />
                    <NfiField label="Mother Employer / Company Name" required type="input" inputProps={{ type: 'text', value: formData.occupationIncomeSection?.motherEmployer || '', onChange: e => handleFieldChange('occupationIncomeSection', 'motherEmployer', e.target.value), disabled: readOnly }} />
                    <NfiField label="Mother Monthly Income (INR)" required={motherIncomeMode === 'monthly_primary'} error={sectionErrors.occupationIncomeSection?.motherMonthlyIncome} hint={motherIncomeMode === 'monthly_primary' ? 'Preferred for salaried or fixed-income occupations.' : 'Optional if daily wage is the active income basis.'} type="input" inputProps={{ type: 'number', value: formData.occupationIncomeSection?.motherMonthlyIncome ?? '', onChange: e => handleFieldChange('occupationIncomeSection', 'motherMonthlyIncome', parseCurrencyInput(e.target.value)), disabled: readOnly, className: motherIncomeMode === 'monthly_primary' ? 'border-teal-400 bg-white' : undefined }} />
                    <NfiField label="Mother Daily Wages (INR)" required={motherIncomeMode === 'daily_primary'} error={sectionErrors.occupationIncomeSection?.motherDailyIncome} hint={motherIncomeMode === 'daily_primary' ? 'Preferred for daily wage or casual work.' : 'Optional if monthly income is the active income basis.'} type="input" inputProps={{ type: 'number', value: formData.occupationIncomeSection?.motherDailyIncome ?? '', onChange: e => handleFieldChange('occupationIncomeSection', 'motherDailyIncome', parseCurrencyInput(e.target.value)), disabled: readOnly, className: motherIncomeMode === 'daily_primary' ? 'border-amber-400 bg-white' : undefined }} />
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <NfiField
                  label="Assets / Own Land-House"
                  required
                  type="textarea"
                  textareaProps={{
                    value: formData.occupationIncomeSection?.assetsLandHouse || '',
                    onChange: e => handleFieldChange('occupationIncomeSection', 'assetsLandHouse', e.target.value),
                    disabled: readOnly,
                  }}
                  hint="Enter asset details or write 'None'."
                />
              </div>

              <div className="col-span-2 rounded-lg border border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] p-3 space-y-2">
                <p className="text-sm font-medium text-[var(--nfi-text)]">Income Proof (Required)</p>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={formData.occupationIncomeSection?.incomeProofTahsildarCertificate || false} onChange={e => handleFieldChange('occupationIncomeSection', 'incomeProofTahsildarCertificate', e.target.checked)} className="mt-1 w-4 h-4 accent-teal-600" disabled={readOnly} />
                  <span className="text-sm text-[var(--nfi-text)]">Tahsildar Income Certificate</span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={formData.occupationIncomeSection?.incomeProofBankStatement6Months || false} onChange={e => handleFieldChange('occupationIncomeSection', 'incomeProofBankStatement6Months', e.target.checked)} className="mt-1 w-4 h-4 accent-teal-600" disabled={readOnly} />
                  <span className="text-sm text-[var(--nfi-text)]">Bank Statement (Last 6 months), if no Income Certificate</span>
                </label>
              </div>

              <IncomeEligibilityPanel
                evaluation={incomeEvaluation}
                audience="hospital"
                title="Income rule outcome"
              />
            </div>
          </IntakeSectionAccordion>
        );
      })()}

      {(() => {
        const { progress, status } = getSectionMetrics('birthDetailsSection');
        return (
          <IntakeSectionAccordion
            title="Birth / Medical Details"
            sectionId="birthDetailsSection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('birthDetailsSection')}
            errors={sectionErrors.birthDetailsSection || {}}
            isDirty={!readOnly && dirtyFields.has('birthDetailsSection')}
          >
            <div className="grid grid-cols-2 gap-4">
              <NfiField label="Baby Date of Birth" required error={sectionErrors.birthDetailsSection?.babyDateOfBirth} type="input" inputProps={{ type: 'date', value: formData.birthDetailsSection?.babyDateOfBirth || '', onChange: e => handleFieldChange('birthDetailsSection', 'babyDateOfBirth', e.target.value), disabled: readOnly }} />
              <NfiField
                label="Gender"
                required
                type="select"
                selectProps={{
                  value: formData.birthDetailsSection?.babyGender || '',
                  onChange: e => handleFieldChange('birthDetailsSection', 'babyGender', e.currentTarget.value),
                  disabled: readOnly,
                  children: (
                    <>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </>
                  ),
                }}
              />
              <NfiField label="Baby Birth Weight (kg)" required type="input" inputProps={{ type: 'number', step: '0.01', min: 0, value: formData.birthDetailsSection?.babyBirthWeightKg ?? '', onChange: e => handleFieldChange('birthDetailsSection', 'babyBirthWeightKg', parseBirthWeightInput(e.target.value)), disabled: readOnly }} />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Inborn / Outborn
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={toInbornOutbornValue(formData.birthDetailsSection?.isInborn)}
                  onChange={e => handleFieldChange('birthDetailsSection', 'isInborn', fromInbornOutbornValue(e.target.value))}
                  className={selectBase}
                  disabled={readOnly}
                >
                  <option value="">Select...</option>
                  <option value="inborn">Inborn</option>
                  <option value="outborn">Outborn</option>
                </select>
              </div>
              {formData.birthDetailsSection?.isInborn === false && (
                <NfiField label="If Outborn, Hospital Name" required type="input" inputProps={{ type: 'text', value: formData.birthDetailsSection?.outbornHospitalName || '', onChange: e => handleFieldChange('birthDetailsSection', 'outbornHospitalName', e.target.value), disabled: readOnly }} />
              )}
              <div className={formData.birthDetailsSection?.isInborn === false ? '' : 'col-start-1'}>
                <NfiField
                  label="Type of Conception"
                  required
                  type="select"
                  selectProps={{
                    value: formData.birthDetailsSection?.conceptionType || '',
                    onChange: e => handleFieldChange('birthDetailsSection', 'conceptionType', e.currentTarget.value),
                    disabled: readOnly,
                    children: (
                      <>
                        <option value="">Select...</option>
                        <option value="Natural">Natural</option>
                        <option value="IUI">IUI</option>
                        <option value="IVF">IVF</option>
                      </>
                    ),
                  }}
                />
              </div>
              <NfiField label="Gestational Age (weeks)" required type="input" inputProps={{ type: 'number', min: 0, value: formData.birthDetailsSection?.gestationalAgeWeeks ?? '', onChange: e => handleFieldChange('birthDetailsSection', 'gestationalAgeWeeks', parseIntegerInput(e.target.value)), disabled: readOnly }} />
              <NfiField
                label="Type of Delivery"
                required
                type="select"
                selectProps={{
                  value: formData.birthDetailsSection?.deliveryType || '',
                  onChange: e => handleFieldChange('birthDetailsSection', 'deliveryType', e.currentTarget.value),
                  disabled: readOnly,
                  children: (
                    <>
                      <option value="">Select...</option>
                      <option value="Normal Vaginal Delivery">Normal Vaginal Delivery</option>
                      <option value="Cesarean Section">Cesarean Section</option>
                      <option value="Assisted Delivery">Assisted Delivery</option>
                    </>
                  ),
                }}
              />
              <NfiField label="Delivery Charges (INR)" required type="input" inputProps={{ type: 'number', value: formData.birthDetailsSection?.deliveryCharges ?? '', onChange: e => handleFieldChange('birthDetailsSection', 'deliveryCharges', parseCurrencyInput(e.target.value)), disabled: readOnly }} />
              <NfiField label="Gravida" required type="input" inputProps={{ type: 'number', min: 0, value: formData.birthDetailsSection?.gravida ?? '', onChange: e => handleFieldChange('birthDetailsSection', 'gravida', parseIntegerInput(e.target.value)), disabled: readOnly }} />
              <NfiField label="Parity" type="input" inputProps={{ type: 'number', min: 0, value: formData.birthDetailsSection?.parity ?? '', onChange: e => handleFieldChange('birthDetailsSection', 'parity', parseIntegerInput(e.target.value)), disabled: readOnly }} />
            </div>
          </IntakeSectionAccordion>
        );
      })()}

      {(() => {
        const { progress, status } = getSectionMetrics('nicuFinancialSection');
        return (
          <IntakeSectionAccordion
            title="NICU & Financial"
            sectionId="nicuFinancialSection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('nicuFinancialSection')}
            errors={sectionErrors.nicuFinancialSection || {}}
            isDirty={!readOnly && dirtyFields.has('nicuFinancialSection')}
          >
            <div className="grid grid-cols-2 gap-4">
              <NfiField label="NICU Admission Date" required type="input" inputProps={{ type: 'date', value: formData.nicuFinancialSection?.nicuAdmissionDate || '', onChange: e => handleFieldChange('nicuFinancialSection', 'nicuAdmissionDate', e.target.value), disabled: readOnly }} />
              <NfiField label="Estimated Number of NICU Days" required type="input" inputProps={{ type: 'number', min: 0, value: formData.nicuFinancialSection?.estimatedNicuDays ?? '', onChange: e => handleFieldChange('nicuFinancialSection', 'estimatedNicuDays', parseIntegerInput(e.target.value)), disabled: readOnly }} />
              <NfiField label="Total Estimated Hospital Bill (INR)" required type="input" inputProps={{ type: 'number', min: 0, value: formData.nicuFinancialSection?.totalEstimatedHospitalBill ?? '', onChange: e => handleFieldChange('nicuFinancialSection', 'totalEstimatedHospitalBill', parseCurrencyInput(e.target.value)), disabled: readOnly }} />
              <NfiField label="Advance Paid by Family (INR)" required type="input" inputProps={{ type: 'number', min: 0, value: formData.nicuFinancialSection?.advancePaidByFamily ?? '', onChange: e => handleFieldChange('nicuFinancialSection', 'advancePaidByFamily', parseCurrencyInput(e.target.value)), disabled: readOnly }} />
              <NfiField label="Current Outstanding / Running Bill (INR)" required type="input" inputProps={{ type: 'number', min: 0, value: formData.nicuFinancialSection?.currentOutstandingBillAmount ?? '', onChange: e => handleFieldChange('nicuFinancialSection', 'currentOutstandingBillAmount', parseCurrencyInput(e.target.value)), disabled: readOnly }} />
            </div>
          </IntakeSectionAccordion>
        );
      })()}

      {(() => {
        const { progress, status } = getSectionMetrics('otherSupportSection');
        return (
          <IntakeSectionAccordion
            title="Other Support"
            sectionId="otherSupportSection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('otherSupportSection')}
            errors={sectionErrors.otherSupportSection || {}}
            isDirty={!readOnly && dirtyFields.has('otherSupportSection')}
          >
            <div className="space-y-4">
              <NfiField
                label="Any Other Support Received (Govt / NGO / Private)"
                required
                type="textarea"
                textareaProps={{
                  value: formData.otherSupportSection?.anyOtherSupportReceived || '',
                  onChange: e => handleFieldChange('otherSupportSection', 'anyOtherSupportReceived', e.target.value),
                  disabled: readOnly,
                }}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Support Types (Optional)</label>
                <textarea
                  value={(formData.otherSupportSection?.otherSupportTypes || []).join('\n')}
                  onChange={e => handleFieldChange('otherSupportSection', 'otherSupportTypes', e.target.value.split('\n').filter(s => s.trim()))}
                  placeholder="One per line"
                  className={textareaBase}
                  disabled={readOnly}
                />
              </div>
              <NfiField
                label="Notes"
                type="textarea"
                textareaProps={{
                  value: formData.otherSupportSection?.otherSupportNotes || '',
                  onChange: e => handleFieldChange('otherSupportSection', 'otherSupportNotes', e.target.value),
                  disabled: readOnly,
                }}
              />
            </div>
          </IntakeSectionAccordion>
        );
      })()}

      {(() => {
        const { progress, status } = getSectionMetrics('declarationsSection');
        return (
          <IntakeSectionAccordion
            title="Declarations"
            sectionId="declarationsSection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('declarationsSection')}
            errors={sectionErrors.declarationsSection || {}}
            isDirty={!readOnly && dirtyFields.has('declarationsSection')}
          >
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.declarationsSection?.declarationTruthfulnessAccepted || false} onChange={e => handleFieldChange('declarationsSection', 'declarationTruthfulnessAccepted', e.target.checked)} className="mt-1 w-4 h-4 accent-teal-600 cursor-pointer" disabled={readOnly} />
                <span className="text-sm text-slate-700">I hereby confirm that the information provided is true and correct to the best of my knowledge.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.declarationsSection?.declarationDocumentationConsentAccepted || false} onChange={e => handleFieldChange('declarationsSection', 'declarationDocumentationConsentAccepted', e.target.checked)} className="mt-1 w-4 h-4 accent-teal-600 cursor-pointer" disabled={readOnly} />
                <span className="text-sm text-slate-700">I agree to provide additional documentation (including 6 months bank statement if required) and to attend a detailed e-meeting with the Foundation and Hospital SPOC.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.declarationsSection?.declarationPhotoVideoConsentAccepted || false} onChange={e => handleFieldChange('declarationsSection', 'declarationPhotoVideoConsentAccepted', e.target.checked)} className="mt-1 w-4 h-4 accent-teal-600 cursor-pointer" disabled={readOnly} />
                <span className="text-sm text-slate-700">I agree to provide a signed consent form for any approved testimonial transcript or supporting document use.</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <NfiField label="Declaration Date" required type="input" inputProps={{ type: 'date', value: formData.declarationsSection?.declarationDate || '', onChange: e => handleFieldChange('declarationsSection', 'declarationDate', e.target.value), disabled: readOnly }} />
                <NfiField label="Parent Signature (File/Image Reference)" required type="input" inputProps={{ type: 'text', placeholder: 'e.g., parent_sign.jpg', value: formData.declarationsSection?.parentSignatureRef || '', onChange: e => handleFieldChange('declarationsSection', 'parentSignatureRef', e.target.value), disabled: readOnly }} />
              </div>
              {formData.declarationsSection?.declarationTruthfulnessAccepted && (
                <p className="text-sm text-[var(--nfi-text-light)]">Statement 1 accepted on {formatDateDMY(new Date())}</p>
              )}
            </div>
          </IntakeSectionAccordion>
        );
      })()}

      {(() => {
        const { progress, status } = getSectionMetrics('hospitalApprovalSection');
        return (
          <IntakeSectionAccordion
            title="Hospital Approval"
            sectionId="hospitalApprovalSection"
            status={status}
            completionPercent={progress.pct}
            onSave={() => handleSectionSave('hospitalApprovalSection')}
            errors={sectionErrors.hospitalApprovalSection || {}}
            isDirty={!readOnly && dirtyFields.has('hospitalApprovalSection')}
          >
            <div className="grid grid-cols-2 gap-4">
              <NfiField label="Name" required type="input" inputProps={{ type: 'text', value: formData.hospitalApprovalSection?.approvedByName || '', onChange: e => handleFieldChange('hospitalApprovalSection', 'approvedByName', e.target.value), disabled: readOnly }} />
              <NfiField label="Designation" required type="input" inputProps={{ type: 'text', value: formData.hospitalApprovalSection?.approvalDesignation || '', onChange: e => handleFieldChange('hospitalApprovalSection', 'approvalDesignation', e.target.value), disabled: readOnly }} />
              <NfiField label="Signature & Stamp (File/Image Reference)" required type="input" inputProps={{ type: 'text', placeholder: 'e.g., sign_stamp.png', value: formData.hospitalApprovalSection?.approvalSignatureStampRef || '', onChange: e => handleFieldChange('hospitalApprovalSection', 'approvalSignatureStampRef', e.target.value), disabled: readOnly }} />
              <NfiField label="Approval Date" type="input" inputProps={{ type: 'date', value: formData.hospitalApprovalSection?.approvalDate || '', onChange: e => handleFieldChange('hospitalApprovalSection', 'approvalDate', e.target.value), disabled: readOnly }} />
              <div className="col-span-2">
                <NfiField
                  label="Approval Remarks"
                  type="textarea"
                  textareaProps={{
                    value: formData.hospitalApprovalSection?.approvalRemarks || '',
                    onChange: e => handleFieldChange('hospitalApprovalSection', 'approvalRemarks', e.target.value),
                    disabled: readOnly,
                  }}
                />
              </div>
            </div>
          </IntakeSectionAccordion>
        );
      })()}
    </div>
  );
}
