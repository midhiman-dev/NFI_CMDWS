import { useState } from 'react';
import { IntakeInterimSummary } from '../../types';
import { NfiField } from '../design-system/NfiField';
import { IntakeSectionAccordion } from './IntakeSectionAccordion';
import { validateInterimSummarySection } from '../../utils/intakeValidation';

interface InterimSummaryFormProps {
  caseId: string;
  initialData?: IntakeInterimSummary;
  onSectionSave: (section: string, data: any) => Promise<void>;
  isLoading?: boolean;
}

export function InterimSummaryForm({
  caseId,
  initialData,
  onSectionSave,
  isLoading = false,
}: InterimSummaryFormProps) {
  const [formData, setFormData] = useState<IntakeInterimSummary>(
    initialData || {
      birthSummarySection: {},
      maternalDetailsSection: {},
      antenatalRiskFactorsSection: {},
      diagnosisSection: {},
      treatmentGivenSection: {},
      currentStatusSection: {},
      feedingRespirationSection: {},
      dischargePlanInvestigationsSection: {},
      remarksSignatureSection: {},
    }
  );

  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [sectionErrors, setSectionErrors] = useState<Record<string, Record<string, string>>>({});

  const handleFieldChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof IntakeInterimSummary],
        [field]: value,
      },
    }));
    setDirtyFields(prev => new Set([...prev, section]));
  };

  const handleSectionSave = async (section: string) => {
    const sectionData = formData[section as keyof IntakeInterimSummary];
    const validation = validateInterimSummarySection(section, sectionData);

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
        title="Birth Summary"
        sectionId="birthSummarySection"
        isComplete={isSectionComplete(formData.birthSummarySection)}
        completionPercent={calculateSectionCompletion(formData.birthSummarySection)}
        onSave={() => handleSectionSave('birthSummarySection')}
        errors={sectionErrors['birthSummarySection'] || {}}
        isDirty={dirtyFields.has('birthSummarySection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="APGAR Score"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.birthSummarySection?.apgarScore || '',
              onChange: e => handleFieldChange('birthSummarySection', 'apgarScore', parseInt(e.target.value) || undefined),
            }}
            hint="Out of 10"
          />
          <NfiField
            label="Time of Birth"
            type="input"
            inputProps={{
              type: 'time',
              value: formData.birthSummarySection?.timeOfBirth || '',
              onChange: e => handleFieldChange('birthSummarySection', 'timeOfBirth', e.target.value),
            }}
          />
          <NfiField
            label="Place of Birth"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.birthSummarySection?.placeOfBirth || '',
              onChange: e => handleFieldChange('birthSummarySection', 'placeOfBirth', e.target.value),
            }}
          />
          <NfiField
            label="Gestational Age (weeks)"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.birthSummarySection?.gestationalAgeWeeks || '',
              onChange: e => handleFieldChange('birthSummarySection', 'gestationalAgeWeeks', parseInt(e.target.value) || undefined),
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Maternal Details"
        sectionId="maternalDetailsSection"
        isComplete={isSectionComplete(formData.maternalDetailsSection)}
        completionPercent={calculateSectionCompletion(formData.maternalDetailsSection)}
        onSave={() => handleSectionSave('maternalDetailsSection')}
        errors={sectionErrors['maternalDetailsSection'] || {}}
        isDirty={dirtyFields.has('maternalDetailsSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Marital Status"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.maternalDetailsSection?.maritalStatus || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'maritalStatus', e.target.value),
            }}
          />
          <NfiField
            label="Years Married"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.yearsMarried || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'yearsMarried', parseInt(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Mother's Age"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.motherAge || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'motherAge', parseInt(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Gravida (G)"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.gravida || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'gravida', parseInt(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Parity (P)"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.parity || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'parity', parseInt(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Abortions (A)"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.abortions || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'abortions', parseInt(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Live Children Before"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.liveChildrenBefore || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'liveChildrenBefore', parseInt(e.target.value) || undefined),
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Antenatal Risk Factors"
        sectionId="antenatalRiskFactorsSection"
        isComplete={isSectionComplete(formData.antenatalRiskFactorsSection)}
        completionPercent={calculateSectionCompletion(formData.antenatalRiskFactorsSection)}
        onSave={() => handleSectionSave('antenatalRiskFactorsSection')}
        errors={sectionErrors['antenatalRiskFactorsSection'] || {}}
        isDirty={dirtyFields.has('antenatalRiskFactorsSection')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Risk Factors</label>
            <textarea
              value={(formData.antenatalRiskFactorsSection?.riskFactors || []).join('\n')}
              onChange={e => handleFieldChange('antenatalRiskFactorsSection', 'riskFactors', e.target.value.split('\n').filter(s => s.trim()))}
              placeholder="One per line (e.g., Hypertension, Diabetes, Previous Cesarean, etc.)"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)] min-h-24"
            />
          </div>
          <NfiField
            label="Risk Notes (if any)"
            type="textarea"
            value={formData.antenatalRiskFactorsSection?.riskNotesIfAny || ''}
            onChange={e => handleFieldChange('antenatalRiskFactorsSection', 'riskNotesIfAny', e.target.value)}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Diagnosis"
        sectionId="diagnosisSection"
        isComplete={isSectionComplete(formData.diagnosisSection)}
        completionPercent={calculateSectionCompletion(formData.diagnosisSection)}
        onSave={() => handleSectionSave('diagnosisSection')}
        errors={sectionErrors['diagnosisSection'] || {}}
        isDirty={dirtyFields.has('diagnosisSection')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Diagnoses</label>
            <textarea
              value={(formData.diagnosisSection?.diagnoses || []).join('\n')}
              onChange={e => handleFieldChange('diagnosisSection', 'diagnoses', e.target.value.split('\n').filter(s => s.trim()))}
              placeholder="One per line (e.g., Respiratory Distress Syndrome, Hyperbilirubinemia, etc.)"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)] min-h-24"
            />
          </div>
          <NfiField
            label="Other Diagnosis"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.diagnosisSection?.otherDiagnosis || '',
              onChange: e => handleFieldChange('diagnosisSection', 'otherDiagnosis', e.target.value),
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Treatment Given"
        sectionId="treatmentGivenSection"
        isComplete={isSectionComplete(formData.treatmentGivenSection)}
        completionPercent={calculateSectionCompletion(formData.treatmentGivenSection)}
        onSave={() => handleSectionSave('treatmentGivenSection')}
        errors={sectionErrors['treatmentGivenSection'] || {}}
        isDirty={dirtyFields.has('treatmentGivenSection')}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.treatmentGivenSection?.respiratorySupportRequired || false}
              onChange={e => handleFieldChange('treatmentGivenSection', 'respiratorySupportRequired', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[var(--nfi-text)]">Respiratory Support Required</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.treatmentGivenSection?.phototherapyRequired || false}
              onChange={e => handleFieldChange('treatmentGivenSection', 'phototherapyRequired', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[var(--nfi-text)]">Phototherapy Required</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.treatmentGivenSection?.antibioticsRequired || false}
              onChange={e => handleFieldChange('treatmentGivenSection', 'antibioticsRequired', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[var(--nfi-text)]">Antibiotics Required</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.treatmentGivenSection?.nutritionalSupportRequired || false}
              onChange={e => handleFieldChange('treatmentGivenSection', 'nutritionalSupportRequired', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[var(--nfi-text)]">Nutritional Support Required</span>
          </label>
          <NfiField
            label="Treatment Notes"
            type="textarea"
            textareaProps={{
              value: formData.treatmentGivenSection?.treatmentNotes || '',
              onChange: e => handleFieldChange('treatmentGivenSection', 'treatmentNotes', e.target.value),
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Current Status"
        sectionId="currentStatusSection"
        isComplete={isSectionComplete(formData.currentStatusSection)}
        completionPercent={calculateSectionCompletion(formData.currentStatusSection)}
        onSave={() => handleSectionSave('currentStatusSection')}
        errors={sectionErrors['currentStatusSection'] || {}}
        isDirty={dirtyFields.has('currentStatusSection')}
      >
        <div className="grid grid-cols-3 gap-4">
          <NfiField
            label="Day of Life"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.currentStatusSection?.dayOfLife || '',
              onChange: e => handleFieldChange('currentStatusSection', 'dayOfLife', parseInt(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Current Weight (kg)"
            type="input"
            inputProps={{
              type: 'number',
              step: '0.1',
              value: formData.currentStatusSection?.currentWeight || '',
              onChange: e => handleFieldChange('currentStatusSection', 'currentWeight', parseFloat(e.target.value) || undefined),
            }}
          />
          <NfiField
            label="Corrected GA (weeks)"
            type="input"
            inputProps={{
              type: 'number',
              value: formData.currentStatusSection?.correctedGestationalAge || '',
              onChange: e => handleFieldChange('currentStatusSection', 'correctedGestationalAge', parseInt(e.target.value) || undefined),
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Feeding & Respiration"
        sectionId="feedingRespirationSection"
        isComplete={isSectionComplete(formData.feedingRespirationSection)}
        completionPercent={calculateSectionCompletion(formData.feedingRespirationSection)}
        onSave={() => handleSectionSave('feedingRespirationSection')}
        errors={sectionErrors['feedingRespirationSection'] || {}}
        isDirty={dirtyFields.has('feedingRespirationSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Feeding Mode"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.feedingRespirationSection?.feedingMode || '',
              onChange: e => handleFieldChange('feedingRespirationSection', 'feedingMode', e.target.value),
            }}
            hint="e.g., Breast, Bottle, Tube Feed"
          />
          <NfiField
            label="Respiration Status"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.feedingRespirationSection?.respirationStatus || '',
              onChange: e => handleFieldChange('feedingRespirationSection', 'respirationStatus', e.target.value),
            }}
            hint="e.g., Room Air, Oxygen, Ventilator"
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Discharge Plan & Investigations"
        sectionId="dischargePlanInvestigationsSection"
        isComplete={isSectionComplete(formData.dischargePlanInvestigationsSection)}
        completionPercent={calculateSectionCompletion(formData.dischargePlanInvestigationsSection)}
        onSave={() => handleSectionSave('dischargePlanInvestigationsSection')}
        errors={sectionErrors['dischargePlanInvestigationsSection'] || {}}
        isDirty={dirtyFields.has('dischargePlanInvestigationsSection')}
      >
        <div className="space-y-4">
          <NfiField
            label="Discharge Date"
            type="input"
            inputProps={{
              type: 'date',
              value: formData.dischargePlanInvestigationsSection?.dischargeDate || '',
              onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'dischargeDate', e.target.value),
            }}
          />
          <NfiField
            label="Investigations Planned"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.dischargePlanInvestigationsSection?.investigationsPlanned || '',
              onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsPlanned', e.target.value),
            }}
            hint="e.g., Follow-up ultrasound, Hearing test, etc."
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.dischargePlanInvestigationsSection?.investigationsDone || false}
              onChange={e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsDone', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[var(--nfi-text)]">Investigations Done</span>
          </label>
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Remarks & Signature"
        sectionId="remarksSignatureSection"
        isComplete={isSectionComplete(formData.remarksSignatureSection)}
        completionPercent={calculateSectionCompletion(formData.remarksSignatureSection)}
        onSave={() => handleSectionSave('remarksSignatureSection')}
        errors={sectionErrors['remarksSignatureSection'] || {}}
        isDirty={dirtyFields.has('remarksSignatureSection')}
      >
        <div className="space-y-4">
          <NfiField
            label="Remarks"
            type="textarea"
            textareaProps={{
              value: formData.remarksSignatureSection?.remarks || '',
              onChange: e => handleFieldChange('remarksSignatureSection', 'remarks', e.target.value),
            }}
          />
          <NfiField
            label="Doctor Name"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.remarksSignatureSection?.doctorName || '',
              onChange: e => handleFieldChange('remarksSignatureSection', 'doctorName', e.target.value),
            }}
          />
          <NfiField
            label="Signed At"
            type="input"
            inputProps={{
              type: 'date',
              value: formData.remarksSignatureSection?.signedAt || '',
              onChange: e => handleFieldChange('remarksSignatureSection', 'signedAt', e.target.value),
            }}
          />
        </div>
      </IntakeSectionAccordion>
    </div>
  );
}
