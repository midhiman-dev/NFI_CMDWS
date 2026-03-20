import { useEffect, useState } from 'react';
import { IntakeInterimSummary } from '../../types';
import { NfiField } from '../design-system/NfiField';
import { IntakeSectionAccordion } from './IntakeSectionAccordion';
import { textareaBase, selectBase } from '../ui/formStyles';
import {
  INTERIM_SUMMARY_FIELDS,
  getInterimSummarySectionProgress,
  getSectionStatus,
  validateInterimSummarySection,
} from '../../utils/intakeValidation';
import {
  parseApgarInput,
  parseBirthWeightInput,
  parseIntegerInput,
  fromInbornOutbornValue,
  toInbornOutbornValue,
  fromYesNoValue,
  toYesNoValue,
} from '../../utils/intakeFormHelpers';

interface InterimSummaryFormProps {
  caseId: string;
  initialData?: IntakeInterimSummary;
  onSectionSave: (section: string, data: any) => Promise<void>;
  onFormDataChange?: (data: IntakeInterimSummary) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  parentDobContext?: {
    motherDob?: string;
    fatherDob?: string;
  };
}

export function InterimSummaryForm({
  initialData,
  onSectionSave,
  onFormDataChange,
  readOnly = false,
  parentDobContext,
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

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleFieldChange = (section: string, field: string, value: any) => {
    if (readOnly) return;

    setFormData(prev => {
      const currentSection = prev[section as keyof IntakeInterimSummary] as Record<string, unknown> | undefined;
      const nextSection = {
        ...(currentSection || {}),
        [field]: value,
      } as Record<string, unknown>;

      if (
        section === 'maternalDetailsSection' &&
        (field === 'maritalStatus' || field === 'motherAge' || field === 'yearsMarried')
      ) {
        nextSection._autoDerived = false;
      }

      const nextData = {
        ...prev,
        [section]: nextSection,
      } as IntakeInterimSummary;

      onFormDataChange?.(nextData);
      return nextData;
    });
    setDirtyFields(prev => new Set([...prev, section]));
  };

  const handleSectionSave = async (section: string) => {
    if (readOnly) return;

    const sectionData = formData[section as keyof IntakeInterimSummary];
    const validation = validateInterimSummarySection(section, sectionData, {
      formData,
      parentDobContext,
    });

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

  const getSectionMetrics = (sectionKey: keyof typeof INTERIM_SUMMARY_FIELDS) => {
    const section = formData[sectionKey];
    const progress = getInterimSummarySectionProgress(sectionKey, section);
    const status = getSectionStatus(progress);
    return { progress, status };
  };

  const yesNoOptions = (
    <>
      <option value="">Select...</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </>
  );

  const treatmentHasCombinedHhfncO2 =
    formData.treatmentGivenSection?.hhfnc === true && formData.treatmentGivenSection?.o2 === true;
  const ongoingHasCombinedHhfncO2 =
    formData.feedingRespirationSection?.ongoingHhfnc === true && formData.feedingRespirationSection?.ongoingO2 === true;

  return (
    <div className="space-y-4">
      <IntakeSectionAccordion
        title="Birth Summary"
        sectionId="birthSummarySection"
        status={getSectionMetrics('birthSummarySection').status}
        completionPercent={getSectionMetrics('birthSummarySection').progress.pct}
        onSave={() => handleSectionSave('birthSummarySection')}
        errors={sectionErrors.birthSummarySection || {}}
        isDirty={!readOnly && dirtyFields.has('birthSummarySection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Baby Birth Weight (kg)"
            required
            type="input"
            inputProps={{
              type: 'number',
              step: '0.01',
              min: 0,
              value: formData.birthSummarySection?.babyBirthWeightKg ?? '',
              onChange: e => handleFieldChange('birthSummarySection', 'babyBirthWeightKg', parseBirthWeightInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Gender"
            required
            type="select"
            selectProps={{
              value: formData.birthSummarySection?.gender || '',
              onChange: e => handleFieldChange('birthSummarySection', 'gender', e.currentTarget.value),
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
          <NfiField
            label="Date of Birth"
            required
            error={sectionErrors.birthSummarySection?.dateOfBirth}
            type="input"
            inputProps={{
              type: 'date',
              value: formData.birthSummarySection?.dateOfBirth || '',
              onChange: e => handleFieldChange('birthSummarySection', 'dateOfBirth', e.target.value),
              disabled: readOnly,
            }}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Inborn / Outborn
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={toInbornOutbornValue(formData.birthSummarySection?.isInborn)}
              onChange={e => handleFieldChange('birthSummarySection', 'isInborn', fromInbornOutbornValue(e.target.value))}
              className={selectBase}
              disabled={readOnly}
            >
              <option value="">Select...</option>
              <option value="inborn">Inborn</option>
              <option value="outborn">Outborn</option>
            </select>
          </div>
          {formData.birthSummarySection?.isInborn === false && (
            <NfiField
              label="If Outborn, Hospital Name"
              required
              type="input"
              inputProps={{
                type: 'text',
                value: formData.birthSummarySection?.outbornHospitalName || '',
                onChange: e => handleFieldChange('birthSummarySection', 'outbornHospitalName', e.target.value),
                disabled: readOnly,
              }}
            />
          )}
          <div className={formData.birthSummarySection?.isInborn === false ? '' : 'col-start-1'}>
            <NfiField
              label="APGAR at 1 minute"
              required
              type="input"
              inputProps={{
                type: 'number',
                min: 0,
                max: 10,
                value: formData.birthSummarySection?.apgarAt1Min ?? '',
                onChange: e => handleFieldChange('birthSummarySection', 'apgarAt1Min', parseApgarInput(e.target.value)),
                disabled: readOnly,
              }}
            />
          </div>
          <NfiField
            label="APGAR at 5 minutes"
            required
            type="input"
            inputProps={{
              type: 'number',
              min: 0,
              max: 10,
              value: formData.birthSummarySection?.apgarAt5Min ?? '',
              onChange: e => handleFieldChange('birthSummarySection', 'apgarAt5Min', parseApgarInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Time of Birth"
            required
            type="input"
            inputProps={{
              type: 'time',
              value: formData.birthSummarySection?.timeOfBirth || '',
              onChange: e => handleFieldChange('birthSummarySection', 'timeOfBirth', e.target.value),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Place of Birth"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.birthSummarySection?.placeOfBirth || '',
              onChange: e => handleFieldChange('birthSummarySection', 'placeOfBirth', e.target.value),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Gestational Age (weeks)"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.birthSummarySection?.gestationalAgeWeeks ?? '',
              onChange: e => handleFieldChange('birthSummarySection', 'gestationalAgeWeeks', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Maternal Details"
        sectionId="maternalDetailsSection"
        status={getSectionMetrics('maternalDetailsSection').status}
        completionPercent={getSectionMetrics('maternalDetailsSection').progress.pct}
        onSave={() => handleSectionSave('maternalDetailsSection')}
        errors={sectionErrors.maternalDetailsSection || {}}
        isDirty={!readOnly && dirtyFields.has('maternalDetailsSection')}
      >
        <div className="grid grid-cols-2 gap-4">
          <NfiField
            label="Marital Status"
            required
            type="input"
            inputProps={{
              type: 'text',
              value: formData.maternalDetailsSection?.maritalStatus || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'maritalStatus', e.target.value),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Married Life / Years Married"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.yearsMarried ?? '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'yearsMarried', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Mother Age"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.motherAge ?? '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'motherAge', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Gravida (G)"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.gravida ?? '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'gravida', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Parity (P)"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.parity ?? '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'parity', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Abortions (A)"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.abortions ?? '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'abortions', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Live Children Before (L)"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.maternalDetailsSection?.liveChildrenBefore ?? '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'liveChildrenBefore', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Mode of Conception"
            required
            type="select"
            selectProps={{
              value: formData.maternalDetailsSection?.conceptionMode || '',
              onChange: e => handleFieldChange('maternalDetailsSection', 'conceptionMode', e.currentTarget.value),
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
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Antenatal Risk Factors"
        sectionId="antenatalRiskFactorsSection"
        status={getSectionMetrics('antenatalRiskFactorsSection').status}
        completionPercent={getSectionMetrics('antenatalRiskFactorsSection').progress.pct}
        onSave={() => handleSectionSave('antenatalRiskFactorsSection')}
        errors={sectionErrors.antenatalRiskFactorsSection || {}}
        isDirty={!readOnly && dirtyFields.has('antenatalRiskFactorsSection')}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Risk Factors</label>
            <textarea
              value={(formData.antenatalRiskFactorsSection?.riskFactors || []).join('\n')}
              onChange={e => handleFieldChange('antenatalRiskFactorsSection', 'riskFactors', e.target.value.split('\n').filter(s => s.trim()))}
              placeholder="One per line"
              className={textareaBase}
              disabled={readOnly}
            />
          </div>
          <NfiField
            label="Risk Notes (if any)"
            type="textarea"
            textareaProps={{
              value: formData.antenatalRiskFactorsSection?.riskNotesIfAny || '',
              onChange: e => handleFieldChange('antenatalRiskFactorsSection', 'riskNotesIfAny', e.target.value),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Diagnosis"
        sectionId="diagnosisSection"
        status={getSectionMetrics('diagnosisSection').status}
        completionPercent={getSectionMetrics('diagnosisSection').progress.pct}
        onSave={() => handleSectionSave('diagnosisSection')}
        errors={sectionErrors.diagnosisSection || {}}
        isDirty={!readOnly && dirtyFields.has('diagnosisSection')}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Diagnoses</label>
            <textarea
              value={(formData.diagnosisSection?.diagnoses || []).join('\n')}
              onChange={e => handleFieldChange('diagnosisSection', 'diagnoses', e.target.value.split('\n').filter(s => s.trim()))}
              placeholder="One per line"
              className={textareaBase}
              disabled={readOnly}
            />
          </div>
          <NfiField
            label="Other Diagnosis"
            type="input"
            inputProps={{
              type: 'text',
              value: formData.diagnosisSection?.otherDiagnosis || '',
              onChange: e => handleFieldChange('diagnosisSection', 'otherDiagnosis', e.target.value),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Treatment Given"
        sectionId="treatmentGivenSection"
        status={getSectionMetrics('treatmentGivenSection').status}
        completionPercent={getSectionMetrics('treatmentGivenSection').progress.pct}
        onSave={() => handleSectionSave('treatmentGivenSection')}
        errors={sectionErrors.treatmentGivenSection || {}}
        isDirty={!readOnly && dirtyFields.has('treatmentGivenSection')}
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-[var(--nfi-text)]">Respiration Support</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.treatmentGivenSection?.mechanicalVentilation || false} onChange={e => handleFieldChange('treatmentGivenSection', 'mechanicalVentilation', e.target.checked)} className="w-4 h-4 accent-teal-600" disabled={readOnly} />
              <span className="text-sm text-[var(--nfi-text)]">Mechanical Ventilation</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.treatmentGivenSection?.cpap || false} onChange={e => handleFieldChange('treatmentGivenSection', 'cpap', e.target.checked)} className="w-4 h-4 accent-teal-600" disabled={readOnly} />
              <span className="text-sm text-[var(--nfi-text)]">CPAP</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.treatmentGivenSection?.hhfnc || false} onChange={e => handleFieldChange('treatmentGivenSection', 'hhfnc', e.target.checked)} className="w-4 h-4 accent-teal-600" disabled={readOnly} />
              <span className="text-sm text-[var(--nfi-text)]">HHFNC</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.treatmentGivenSection?.o2 || false} onChange={e => handleFieldChange('treatmentGivenSection', 'o2', e.target.checked)} className="w-4 h-4 accent-teal-600" disabled={readOnly} />
              <span className="text-sm text-[var(--nfi-text)]">O2</span>
            </label>
          </div>
          {treatmentHasCombinedHhfncO2 && (
            <p className="text-xs text-[var(--nfi-text-light)]">Combined support recorded as HHFNC + O2.</p>
          )}

          <div className="grid grid-cols-3 gap-4">
            <NfiField
              label="IV Antibiotics"
              required
              type="select"
              selectProps={{
                value: toYesNoValue(formData.treatmentGivenSection?.ivAntibiotics),
                onChange: e => handleFieldChange('treatmentGivenSection', 'ivAntibiotics', fromYesNoValue(e.currentTarget.value)),
                disabled: readOnly,
                children: yesNoOptions,
              }}
            />
            <NfiField
              label="Ionotropes"
              required
              type="select"
              selectProps={{
                value: toYesNoValue(formData.treatmentGivenSection?.ionotropes),
                onChange: e => handleFieldChange('treatmentGivenSection', 'ionotropes', fromYesNoValue(e.currentTarget.value)),
                disabled: readOnly,
                children: yesNoOptions,
              }}
            />
            <NfiField
              label="TPN"
              required
              type="select"
              selectProps={{
                value: toYesNoValue(formData.treatmentGivenSection?.tpn),
                onChange: e => handleFieldChange('treatmentGivenSection', 'tpn', fromYesNoValue(e.currentTarget.value)),
                disabled: readOnly,
                children: yesNoOptions,
              }}
            />
          </div>

          <NfiField
            label="Others If Any"
            type="textarea"
            textareaProps={{
              value: formData.treatmentGivenSection?.othersIfAny || '',
              onChange: e => handleFieldChange('treatmentGivenSection', 'othersIfAny', e.target.value),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Current Status"
        sectionId="currentStatusSection"
        status={getSectionMetrics('currentStatusSection').status}
        completionPercent={getSectionMetrics('currentStatusSection').progress.pct}
        onSave={() => handleSectionSave('currentStatusSection')}
        errors={sectionErrors.currentStatusSection || {}}
        isDirty={!readOnly && dirtyFields.has('currentStatusSection')}
      >
        <div className="grid grid-cols-3 gap-4">
          <NfiField
            label="DOL"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.currentStatusSection?.dayOfLife ?? '',
              onChange: e => handleFieldChange('currentStatusSection', 'dayOfLife', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Today's Weight (kg)"
            required
            type="input"
            inputProps={{
              type: 'number',
              step: '0.01',
              value: formData.currentStatusSection?.currentWeight ?? '',
              onChange: e => handleFieldChange('currentStatusSection', 'currentWeight', parseBirthWeightInput(e.target.value)),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="CGA (weeks)"
            required
            type="input"
            inputProps={{
              type: 'number',
              value: formData.currentStatusSection?.correctedGestationalAge ?? '',
              onChange: e => handleFieldChange('currentStatusSection', 'correctedGestationalAge', parseIntegerInput(e.target.value)),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Ongoing Treatment"
        sectionId="feedingRespirationSection"
        status={getSectionMetrics('feedingRespirationSection').status}
        completionPercent={getSectionMetrics('feedingRespirationSection').progress.pct}
        onSave={() => handleSectionSave('feedingRespirationSection')}
        errors={sectionErrors.feedingRespirationSection || {}}
        isDirty={!readOnly && dirtyFields.has('feedingRespirationSection')}
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-[var(--nfi-text)]">Respiration</p>
          <div className="grid grid-cols-2 gap-4">
            <NfiField label="Mechanical Ventilation" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingMechanicalVentilation), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingMechanicalVentilation', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="CPAP" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingCpap), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingCpap', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="HFNC / HHFNC" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingHhfnc), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingHhfnc', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="O2" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingO2), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingO2', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
          </div>
          {ongoingHasCombinedHhfncO2 && (
            <p className="text-xs text-[var(--nfi-text-light)]">Ongoing respiration support can be documented as HHFNC + O2 together.</p>
          )}

          <p className="text-sm font-medium text-[var(--nfi-text)]">Feeding</p>
          <div className="grid grid-cols-2 gap-4">
            <NfiField label="NPO" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingNpo), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingNpo', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="OG" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingOg), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingOg', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="PALADA" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingPalada), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingPalada', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="DBF" required type="select" selectProps={{ value: toYesNoValue(formData.feedingRespirationSection?.ongoingDbf), onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingDbf', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
          </div>

          <NfiField
            label="Others"
            type="textarea"
            textareaProps={{
              value: formData.feedingRespirationSection?.ongoingOtherNotes || '',
              onChange: e => handleFieldChange('feedingRespirationSection', 'ongoingOtherNotes', e.target.value),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Discharge Plan & Investigations"
        sectionId="dischargePlanInvestigationsSection"
        status={getSectionMetrics('dischargePlanInvestigationsSection').status}
        completionPercent={getSectionMetrics('dischargePlanInvestigationsSection').progress.pct}
        onSave={() => handleSectionSave('dischargePlanInvestigationsSection')}
        errors={sectionErrors.dischargePlanInvestigationsSection || {}}
        isDirty={!readOnly && dirtyFields.has('dischargePlanInvestigationsSection')}
      >
        <div className="space-y-4">
          <NfiField
            label="Plan of Discharge"
            required
            type="textarea"
            textareaProps={{
              value: formData.dischargePlanInvestigationsSection?.planOfDischarge || '',
              onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'planOfDischarge', e.target.value),
              disabled: readOnly,
            }}
          />
          <div className="grid grid-cols-2 gap-4">
            <NfiField label="Labs Attached" required type="select" selectProps={{ value: toYesNoValue(formData.dischargePlanInvestigationsSection?.investigationsLabs), onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsLabs', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="X Ray Attached" required type="select" selectProps={{ value: toYesNoValue(formData.dischargePlanInvestigationsSection?.investigationsXRay), onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsXRay', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="Scans Attached" required type="select" selectProps={{ value: toYesNoValue(formData.dischargePlanInvestigationsSection?.investigationsScans), onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsScans', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
            <NfiField label="Others Attached" required type="select" selectProps={{ value: toYesNoValue(formData.dischargePlanInvestigationsSection?.investigationsOthers), onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsOthers', fromYesNoValue(e.currentTarget.value)), disabled: readOnly, children: yesNoOptions }} />
          </div>
          <NfiField
            label="Other Investigations Details"
            type="textarea"
            textareaProps={{
              value: formData.dischargePlanInvestigationsSection?.investigationsOthersNotes || '',
              onChange: e => handleFieldChange('dischargePlanInvestigationsSection', 'investigationsOthersNotes', e.target.value),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>

      <IntakeSectionAccordion
        title="Remarks & Signature"
        sectionId="remarksSignatureSection"
        status={getSectionMetrics('remarksSignatureSection').status}
        completionPercent={getSectionMetrics('remarksSignatureSection').progress.pct}
        onSave={() => handleSectionSave('remarksSignatureSection')}
        errors={sectionErrors.remarksSignatureSection || {}}
        isDirty={!readOnly && dirtyFields.has('remarksSignatureSection')}
      >
        <div className="space-y-4">
          <NfiField
            label="Remarks if any"
            type="textarea"
            textareaProps={{
              value: formData.remarksSignatureSection?.remarks || '',
              onChange: e => handleFieldChange('remarksSignatureSection', 'remarks', e.target.value),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Signature (File/Image Reference)"
            required
            type="input"
            inputProps={{
              type: 'text',
              placeholder: 'e.g., interim_sign.png',
              value: formData.remarksSignatureSection?.signatureRef || '',
              onChange: e => handleFieldChange('remarksSignatureSection', 'signatureRef', e.target.value),
              disabled: readOnly,
            }}
          />
          <NfiField
            label="Signed Date"
            type="input"
            inputProps={{
              type: 'date',
              value: formData.remarksSignatureSection?.signedAt || '',
              onChange: e => handleFieldChange('remarksSignatureSection', 'signedAt', e.target.value),
              disabled: readOnly,
            }}
          />
        </div>
      </IntakeSectionAccordion>
    </div>
  );
}
