import type { DocumentCategory, DocumentRequirementTemplate, ProcessType } from '../types';

type TemplateSpec = {
  category: DocumentCategory;
  docType: string;
  mandatoryFlag: boolean;
  conditionNotes?: string;
};

const BUILT_IN_TEMPLATE_SPECS: TemplateSpec[] = [
  { category: 'GENERAL', docType: 'Aadhaar Card - Mother', mandatoryFlag: true },
  { category: 'GENERAL', docType: 'Aadhaar Card - Father', mandatoryFlag: true },
  { category: 'GENERAL', docType: 'Baby Photo in NICU', mandatoryFlag: true },
  { category: 'GENERAL', docType: 'Parents with Baby in NICU / Hospital', mandatoryFlag: true },
  {
    category: 'GENERAL',
    docType: 'Consent Form',
    mandatoryFlag: false,
    conditionNotes: 'Signed/scanned consent form.',
  },
  {
    category: 'GENERAL',
    docType: 'Signed Fund Application Copy (Optional)',
    mandatoryFlag: false,
    conditionNotes: 'Supporting signed/scanned copy. Optional when structured intake is complete.',
  },
  {
    category: 'FINANCE',
    docType: 'Father Bank Statement',
    mandatoryFlag: false,
    conditionNotes: 'Primary financial proof. Upload any one of Father Bank Statement, Income Certificate, or Talati/Govt Economic Card.',
  },
  { category: 'FINANCE', docType: 'Mother Bank Statement (Optional)', mandatoryFlag: false },
  {
    category: 'FINANCE',
    docType: 'Income Certificate',
    mandatoryFlag: false,
    conditionNotes: 'Primary financial proof. Upload any one of Father Bank Statement, Income Certificate, or Talati/Govt Economic Card.',
  },
  {
    category: 'FINANCE',
    docType: 'Talati/Govt Economic Card',
    mandatoryFlag: false,
    conditionNotes: 'Primary financial proof. Upload any one of Father Bank Statement, Income Certificate, or Talati/Govt Economic Card.',
  },
  { category: 'FINANCE', docType: 'BPL Card (Optional Supporting)', mandatoryFlag: false },
  { category: 'MEDICAL', docType: 'Lab Report', mandatoryFlag: true },
  { category: 'MEDICAL', docType: 'Internal Case Papers / Doctor Notes', mandatoryFlag: true },
  { category: 'MEDICAL', docType: 'Investigation Reports (All)', mandatoryFlag: true },
  {
    category: 'MEDICAL',
    docType: 'Pregnancy / Birth / Initial Treatment Records from Other Hospitals',
    mandatoryFlag: false,
    conditionNotes: 'Upload when outborn or prior outside-hospital treatment records are available.',
  },
  {
    category: 'MEDICAL',
    docType: 'Signed Interim Summary Copy (Optional)',
    mandatoryFlag: false,
    conditionNotes: 'Supporting signed/scanned copy. Optional when structured intake is complete.',
  },
  {
    category: 'FINAL',
    docType: 'Final Bill',
    mandatoryFlag: false,
    conditionNotes: 'Post-discharge document. Not required for initial case submission.',
  },
  {
    category: 'FINAL',
    docType: 'Payment Requisition',
    mandatoryFlag: false,
    conditionNotes: 'Post-discharge document. Not required for initial case submission.',
  },
  {
    category: 'FINAL',
    docType: 'Discharge Summary / Report',
    mandatoryFlag: false,
    conditionNotes: 'Post-discharge document. Not required for initial case submission.',
  },
  { category: 'FINAL', docType: 'Post-Discharge Baby Photo', mandatoryFlag: false },
  { category: 'FINAL', docType: 'Post-Discharge Parents with Baby Photo', mandatoryFlag: false },
  {
    category: 'FINAL',
    docType: 'Testimonial Transcript / Supporting Document (Optional)',
    mandatoryFlag: false,
    conditionNotes: 'Upload a PDF transcript or supporting document if available. No testimonial video is stored in the prototype.',
  },
];

const BUILT_IN_PROCESS_TYPES: ProcessType[] = ['BRC', 'BRRC', 'BGRC', 'BCRC', 'NON_BRC'];

export function getBuiltInDocumentTemplates(): DocumentRequirementTemplate[] {
  const templates: DocumentRequirementTemplate[] = [];

  for (const processType of BUILT_IN_PROCESS_TYPES) {
    for (const spec of BUILT_IN_TEMPLATE_SPECS) {
      templates.push({
        templateId: `tpl-${processType}-${spec.category}-${spec.docType}`,
        processType,
        category: spec.category,
        docType: spec.docType,
        mandatoryFlag: spec.mandatoryFlag,
        conditionNotes: spec.conditionNotes,
      });
    }
  }

  return templates;
}

