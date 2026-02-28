import { useState, useEffect } from 'react';
import { IntakeFundApplication } from '../../types';
import { NfiField } from '../design-system/NfiField';
import { IntakeSectionAccordion } from './IntakeSectionAccordion';
import { validateFundApplicationSection, FUND_APPLICATION_FIELDS } from '../../utils/intakeValidation';

interface FundApplicationFormProps {
  caseId: string;
  initialData?: IntakeFundApplication;
  onSectionSave: (section: string, data: any) => Promise<void>;
  isLoading?: boolean;
}

export function FundApplicationForm({
  caseId,
  initialData,
  onSectionSave,
  isLoading = false,
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

  const handleFieldChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof IntakeFundApplication],
        [field]: value,
      },
    }));
    setDirtyFields(prev => new Set([...prev, section]));
  };

  const handleSectionSave = async (section: string) => {
    const sectionData = formData[section as keyof IntakeFundApplication];
    const validation = validateFundApplicationSection(section, sectionData);

    if (!validation.isValid) {
      setSectionErrors(prev => ({
        ...prev,
        [section]: validation.errors,
      }));
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

  const calculateSectionCompletion = (section: any): number => {
    if (!section) return 0;
    const values = Object.values(section);
    const filled = values.filter(v => v !== undefined && v !== null && v !== '').length;
    return Math.round((filled / Math.max(values.length, 1)) * 100);
  };

  const isSectionComplete = (section: any): boolean => {
    if (!section) return false;
    return Object.values(section).every(v => v !== undefined && v !== null && v !== '');
  };

  return (
    <div className="space-y-4">
      <IntakeSectionAccordion
        title="Parents & Family"
        sectionId="parentsFamilySection"
        isComplete={isSectionComplete(formData.parentsFamilySection)}
        completionPercent={calculateSectionCompletion(formData.parentsFamilySection)}
        onSave={() => handleSectionSave('parentsFamilySection')}
        errors={sectionErrors['parentsFamilySection'] || {}}
        isDirty={dirtyFields.has('parentsFamilySection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Father's Date of Birth"
            type="date"
            value={formData.parentsFamilySection?.fatherDob || ''}
            onChange={e => handleFieldChange('parentsFamilySection', 'fatherDob', e.target.value)}
          />
          <NfiField
            label="Father's Education"
            type="text"
            value={formData.parentsFamilySection?.fatherEducation || ''}
            onChange={e => handleFieldChange('parentsFamilySection', 'fatherEducation', e.target.value)}
          />
          <NfiField
            label="Mother's Date of Birth"
            type="date"
            value={formData.parentsFamilySection?.motherDob || ''}
            onChange={e => handleFieldChange('parentsFamilySection', 'motherDob', e.target.value)}
          />
          <NfiField
            label="Mother's Education"
            type="text"
            value={formData.parentsFamilySection?.motherEducation || ''}
            onChange={e => handleFieldChange('parentsFamilySection', 'motherEducation', e.target.value)}
          />
          <NfiField
            label="Marriage Date"
            type="date"
            value={formData.parentsFamilySection?.marriageDate || ''}
            onChange={e => handleFieldChange('parentsFamilySection', 'marriageDate', e.target.value)}
          />
          <NfiField
            label="Number of Dependents"
            type="number"
            value={formData.parentsFamilySection?.dependents || ''}
            onChange={e => handleFieldChange('parentsFamilySection', 'dependents', e.target.value)}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Occupation & Income"
        sectionId="occupationIncomeSection"
        isComplete={isSectionComplete(formData.occupationIncomeSection)}
        completionPercent={calculateSectionCompletion(formData.occupationIncomeSection)}
        onSave={() => handleSectionSave('occupationIncomeSection')}
        errors={sectionErrors['occupationIncomeSection'] || {}}
        isDirty={dirtyFields.has('occupationIncomeSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Father's Occupation"
            type="text"
            value={formData.occupationIncomeSection?.fatherOccupation || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'fatherOccupation', e.target.value)}
          />
          <NfiField
            label="Father's Employer"
            type="text"
            value={formData.occupationIncomeSection?.fatherEmployer || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'fatherEmployer', e.target.value)}
          />
          <NfiField
            label="Father's Monthly Income (₹)"
            type="number"
            value={formData.occupationIncomeSection?.fatherMonthlyIncome || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'fatherMonthlyIncome', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="Mother's Occupation"
            type="text"
            value={formData.occupationIncomeSection?.motherOccupation || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'motherOccupation', e.target.value)}
          />
          <NfiField
            label="Mother's Employer"
            type="text"
            value={formData.occupationIncomeSection?.motherEmployer || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'motherEmployer', e.target.value)}
          />
          <NfiField
            label="Mother's Monthly Income (₹)"
            type="number"
            value={formData.occupationIncomeSection?.motherMonthlyIncome || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'motherMonthlyIncome', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="Income Proof Type"
            type="text"
            value={formData.occupationIncomeSection?.incomeProofType || ''}
            onChange={e => handleFieldChange('occupationIncomeSection', 'incomeProofType', e.target.value)}
            hint="e.g., ITR, Salary Slip, Bank Statement"
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Birth Details"
        sectionId="birthDetailsSection"
        isComplete={isSectionComplete(formData.birthDetailsSection)}
        completionPercent={calculateSectionCompletion(formData.birthDetailsSection)}
        onSave={() => handleSectionSave('birthDetailsSection')}
        errors={sectionErrors['birthDetailsSection'] || {}}
        isDirty={dirtyFields.has('birthDetailsSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Inborn/Outborn</label>
            <select
              value={formData.birthDetailsSection?.isInborn === true ? 'inborn' : formData.birthDetailsSection?.isInborn === false ? 'outborn' : ''}
              onChange={e => {
                const val = e.target.value === 'inborn' ? true : e.target.value === 'outborn' ? false : undefined;
                handleFieldChange('birthDetailsSection', 'isInborn', val);
              }}
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
            >
              <option value="">Select...</option>
              <option value="inborn">Inborn</option>
              <option value="outborn">Outborn</option>
            </select>
          </div>
          <NfiField
            label="Conception Type"
            type="text"
            value={formData.birthDetailsSection?.conceptionType || ''}
            onChange={e => handleFieldChange('birthDetailsSection', 'conceptionType', e.target.value)}
            hint="e.g., Natural, IVF"
          />
          <NfiField
            label="Gestational Age (weeks)"
            type="number"
            value={formData.birthDetailsSection?.gestationalAgeWeeks || ''}
            onChange={e => handleFieldChange('birthDetailsSection', 'gestationalAgeWeeks', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="Delivery Type"
            type="text"
            value={formData.birthDetailsSection?.deliveryType || ''}
            onChange={e => handleFieldChange('birthDetailsSection', 'deliveryType', e.target.value)}
            hint="e.g., Vaginal, Cesarean"
          />
          <NfiField
            label="Gravida"
            type="number"
            value={formData.birthDetailsSection?.gravida || ''}
            onChange={e => handleFieldChange('birthDetailsSection', 'gravida', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="Parity"
            type="number"
            value={formData.birthDetailsSection?.parity || ''}
            onChange={e => handleFieldChange('birthDetailsSection', 'parity', parseInt(e.target.value) || undefined)}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="NICU & Financial"
        sectionId="nicuFinancialSection"
        isComplete={isSectionComplete(formData.nicuFinancialSection)}
        completionPercent={calculateSectionCompletion(formData.nicuFinancialSection)}
        onSave={() => handleSectionSave('nicuFinancialSection')}
        errors={sectionErrors['nicuFinancialSection'] || {}}
        isDirty={dirtyFields.has('nicuFinancialSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="NICU Admission Date"
            type="date"
            value={formData.nicuFinancialSection?.nicuAdmissionDate || ''}
            onChange={e => handleFieldChange('nicuFinancialSection', 'nicuAdmissionDate', e.target.value)}
          />
          <NfiField
            label="Estimated NICU Days"
            type="number"
            value={formData.nicuFinancialSection?.estimatedNicuDays || ''}
            onChange={e => handleFieldChange('nicuFinancialSection', 'estimatedNicuDays', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="NFI Requested Amount (₹)"
            type="number"
            value={formData.nicuFinancialSection?.nfiRequestedAmount || ''}
            onChange={e => handleFieldChange('nicuFinancialSection', 'nfiRequestedAmount', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="Estimate Billed Amount (₹)"
            type="number"
            value={formData.nicuFinancialSection?.estimateBilled || ''}
            onChange={e => handleFieldChange('nicuFinancialSection', 'estimateBilled', parseInt(e.target.value) || undefined)}
          />
          <NfiField
            label="Estimate After Discount (₹)"
            type="number"
            value={formData.nicuFinancialSection?.estimateAfterDiscount || ''}
            onChange={e => handleFieldChange('nicuFinancialSection', 'estimateAfterDiscount', parseInt(e.target.value) || undefined)}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Other Support"
        sectionId="otherSupportSection"
        isComplete={isSectionComplete(formData.otherSupportSection)}
        completionPercent={calculateSectionCompletion(formData.otherSupportSection)}
        onSave={() => handleSectionSave('otherSupportSection')}
        errors={sectionErrors['otherSupportSection'] || {}}
        isDirty={dirtyFields.has('otherSupportSection')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Other Support Types</label>
            <textarea
              value={(formData.otherSupportSection?.otherSupportTypes || []).join('\n')}
              onChange={e => handleFieldChange('otherSupportSection', 'otherSupportTypes', e.target.value.split('\n').filter(s => s.trim()))}
              placeholder="One per line (e.g., Government Scheme, NGO Support, Family Contribution)"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)] min-h-24"
            />
          </div>
          <NfiField
            label="Notes"
            type="textarea"
            value={formData.otherSupportSection?.otherSupportNotes || ''}
            onChange={e => handleFieldChange('otherSupportSection', 'otherSupportNotes', e.target.value)}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Declarations"
        sectionId="declarationsSection"
        isComplete={isSectionComplete(formData.declarationsSection)}
        completionPercent={calculateSectionCompletion(formData.declarationsSection)}
        onSave={() => handleSectionSave('declarationsSection')}
        errors={sectionErrors['declarationsSection'] || {}}
        isDirty={dirtyFields.has('declarationsSection')}
      >
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.declarationsSection?.declarationsAccepted || false}
              onChange={e => handleFieldChange('declarationsSection', 'declarationsAccepted', e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-sm text-[var(--nfi-text)]">
              I hereby declare that the information provided is true and correct to the best of my knowledge.
            </span>
          </label>
          {formData.declarationsSection?.declarationsAccepted && (
            <p className="text-sm text-[var(--nfi-text-light)]">
              Accepted on {new Date().toLocaleDateString()}
            </p>
          )}
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Hospital Approval"
        sectionId="hospitalApprovalSection"
        isComplete={isSectionComplete(formData.hospitalApprovalSection)}
        completionPercent={calculateSectionCompletion(formData.hospitalApprovalSection)}
        onSave={() => handleSectionSave('hospitalApprovalSection')}
        errors={sectionErrors['hospitalApprovalSection'] || {}}
        isDirty={dirtyFields.has('hospitalApprovalSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Approved By (Name)"
            type="text"
            value={formData.hospitalApprovalSection?.approvedByName || ''}
            onChange={e => handleFieldChange('hospitalApprovalSection', 'approvedByName', e.target.value)}
          />
          <NfiField
            label="Approval Date"
            type="date"
            value={formData.hospitalApprovalSection?.approvalDate || ''}
            onChange={e => handleFieldChange('hospitalApprovalSection', 'approvalDate', e.target.value)}
          />
          <div className="col-span-2">
            <NfiField
              label="Approval Remarks"
              type="textarea"
              value={formData.hospitalApprovalSection?.approvalRemarks || ''}
              onChange={e => handleFieldChange('hospitalApprovalSection', 'approvalRemarks', e.target.value)}
            />
          </div>
        </div>
      </IntakeSectionAccordion>
    </div>
  );
}
