import type { FollowupMetricValue, FollowupMilestone, FollowupMilestoneStatus } from '../types';

export const FOLLOWUP_MILESTONE_ORDER = [3, 6, 9, 12, 18, 24] as const;

export type FollowupMilestoneMonth = (typeof FOLLOWUP_MILESTONE_ORDER)[number];
export type FollowupResponseValue = 'Yes' | 'No' | 'Not Checked / Not Known';
export type FollowupDraftState = 'In Progress' | 'Completed';

export interface FollowupQuestionDefinition {
  metricKey: string;
  label: string;
  required?: boolean;
  noteMetricKey?: string;
}

export interface FollowupSectionDefinition {
  sectionKey: string;
  title: string;
  description?: string;
  questionMetricKeys: string[];
}

export interface FollowupQuestionnaireDefinition {
  milestoneMonths: FollowupMilestoneMonth;
  milestoneLabel: string;
  shortLabel: string;
  sectionTitle: string;
  questions: FollowupQuestionDefinition[];
  sections: FollowupSectionDefinition[];
}

export interface FollowupMilestoneSnapshot {
  milestoneId: string;
  caseId: string;
  milestoneMonths: FollowupMilestoneMonth;
  dueDate: string;
  followupDate?: string;
  status: FollowupMilestoneStatus;
  notes?: string;
  summary?: string;
  answeredCount: number;
  questionCount: number;
  completionPercent: number;
  completedAt?: string;
  completedBy?: string;
  keyObservations?: string;
  redFlags?: string;
  escalationNote?: string;
  createdAt: string;
  updatedAt: string;
  buttonLabel: string;
}

export interface FollowupSectionProgress {
  sectionKey: string;
  title: string;
  answeredCount: number;
  totalQuestions: number;
  completionPercent: number;
}

const question = (metricKey: string, label: string): FollowupQuestionDefinition => ({
  metricKey,
  label,
  required: true,
  noteMetricKey: `${metricKey}Note`,
});

export const FOLLOWUP_RESPONSE_OPTIONS: readonly FollowupResponseValue[] = ['Yes', 'No', 'Not Checked / Not Known'] as const;

export const FOLLOWUP_REMARK_FIELDS = [
  { metricKey: 'doctorRemarks', label: 'Doctor remarks' },
  { metricKey: 'parentWorries', label: 'Any worries of the parent' },
  { metricKey: 'contactWorries', label: 'Any worries noted during contact' },
] as const;

export const FOLLOWUP_META_KEYS = {
  questionnaireStatus: '__questionnaireStatus',
  followupDate: '__followupDate',
  summary: '__summary',
  keyObservations: '__keyObservations',
  redFlags: '__redFlags',
  escalationNote: '__escalationNote',
  completedAt: '__completedAt',
  completedBy: '__completedBy',
  updatedAt: '__updatedAt',
  updatedBy: '__updatedBy',
} as const;

export const BENI_PROGRAM_OPS_FIELDS = [
  'BENI team member allotted',
  'SPOC name',
  'SPOC number',
  'SPOC contacted',
  'Contact 1 (NICU)',
  'Contact 2 (Home)',
  'Voice note / WhatsApp certificate received at discharge date',
  'Hamper sent date',
] as const;

export const FOLLOWUP_QUESTIONNAIRES: Record<FollowupMilestoneMonth, FollowupQuestionnaireDefinition> = {
  3: {
    milestoneMonths: 3,
    milestoneLabel: '3 Months Follow-up',
    shortLabel: '3 Months',
    sectionTitle: 'Development & Growth at 3 Months',
    questions: [
      question('smilesAtMother', 'Smiles at mother'),
      question('turnsHeadAtLoudSound', 'Turns head at loud sound'),
      question('eyesFollowMovement', 'Eyes follow movement of person / object'),
      question('vaccinesUpdated', 'Vaccines updated'),
      question('influenzaVaccineYear1', 'Influenza vaccine taken for Year 1'),
      question('growthIncreasing', 'Height / Weight / Head Circumference increasing'),
    ],
    sections: [
      {
        sectionKey: 'development_response',
        title: 'Development & Response',
        description: 'Early social response, sound response, and visual tracking from the source questionnaire.',
        questionMetricKeys: ['smilesAtMother', 'turnsHeadAtLoudSound', 'eyesFollowMovement'],
      },
      {
        sectionKey: 'health_growth',
        title: 'Health, Vaccines & Growth',
        questionMetricKeys: ['vaccinesUpdated', 'influenzaVaccineYear1', 'growthIncreasing'],
      },
    ],
  },
  6: {
    milestoneMonths: 6,
    milestoneLabel: '6 Months Follow-up',
    shortLabel: '6 Months',
    sectionTitle: 'Development & Growth at 6 Months',
    questions: [
      question('headSteadyControlled', 'Head steady / controlled'),
      question('rollsBackToStomach', 'Rolls from back to stomach'),
      question('transfersObjectHandToHand', 'Transfers object from hand to hand'),
      question('vaccinesUpdated', 'Vaccines updated'),
      question('growthIncreasing', 'Height / Weight / Head Circumference increasing'),
    ],
    sections: [
      {
        sectionKey: 'movement_control',
        title: 'Movement & Control',
        questionMetricKeys: ['headSteadyControlled', 'rollsBackToStomach', 'transfersObjectHandToHand'],
      },
      {
        sectionKey: 'health_growth',
        title: 'Health, Vaccines & Growth',
        questionMetricKeys: ['vaccinesUpdated', 'growthIncreasing'],
      },
    ],
  },
  9: {
    milestoneMonths: 9,
    milestoneLabel: '9 Months Follow-up',
    shortLabel: '9 Months',
    sectionTitle: 'Development & Growth at 9 Months',
    questions: [
      question('sitsAndStandsWithSupport', 'Able to sit and stand with support'),
      question('picksObjectsWithThumbFinger', 'Picks spoon / object with thumb and finger'),
      question('throwsObjects', 'Throws balls / objects'),
      question('vaccinesUpdated', 'Vaccines updated'),
      question('growthIncreasing', 'Height / Weight / Head Circumference increasing'),
    ],
    sections: [
      {
        sectionKey: 'movement_fine_motor',
        title: 'Movement & Fine Motor',
        questionMetricKeys: ['sitsAndStandsWithSupport', 'picksObjectsWithThumbFinger', 'throwsObjects'],
      },
      {
        sectionKey: 'health_growth',
        title: 'Health, Vaccines & Growth',
        questionMetricKeys: ['vaccinesUpdated', 'growthIncreasing'],
      },
    ],
  },
  12: {
    milestoneMonths: 12,
    milestoneLabel: '12 Months Follow-up',
    shortLabel: '12 Months',
    sectionTitle: 'Development & Growth at 12 Months',
    questions: [
      question('babblesAndResponds', 'Babbles and responds'),
      question('walksWithHelp', 'Walks with help'),
      question('vaccinesUpdated', 'Vaccines updated'),
      question('growthIncreasing', 'Height / Weight / Head Circumference increasing'),
      question('eyesightHearingChecked', 'Eyesight and hearing checked'),
    ],
    sections: [
      {
        sectionKey: 'communication_movement',
        title: 'Communication & Movement',
        questionMetricKeys: ['babblesAndResponds', 'walksWithHelp'],
      },
      {
        sectionKey: 'health_growth',
        title: 'Health, Growth & Checks',
        questionMetricKeys: ['vaccinesUpdated', 'growthIncreasing', 'eyesightHearingChecked'],
      },
    ],
  },
  18: {
    milestoneMonths: 18,
    milestoneLabel: '18 Months Follow-up',
    shortLabel: '18 Months',
    sectionTitle: 'Development & Growth at 18 Months',
    questions: [
      question('walks', 'Walks'),
      question('speaksTwoToThreeWords', 'Able to speak 2 to 3 words'),
      question('walksUpTheStairs', 'Walks up the stairs'),
      question('walksBackwards', 'Walks backwards'),
      question('identifiesObjects', 'Identifies objects'),
      question('doctorVisitDone', 'Doctor visit done'),
      question('vaccinesUpdated', 'Vaccines updated'),
      question('influenzaVaccineYear2', 'Influenza vaccine taken for Year 2'),
      question('growthIncreasing', 'Height / Weight / Head Circumference increasing'),
    ],
    sections: [
      {
        sectionKey: 'movement_coordination',
        title: 'Movement & Coordination',
        questionMetricKeys: ['walks', 'walksUpTheStairs', 'walksBackwards'],
      },
      {
        sectionKey: 'speech_recognition',
        title: 'Speech & Recognition',
        questionMetricKeys: ['speaksTwoToThreeWords', 'identifiesObjects'],
      },
      {
        sectionKey: 'clinical_growth',
        title: 'Doctor Review, Vaccines & Growth',
        questionMetricKeys: ['doctorVisitDone', 'vaccinesUpdated', 'influenzaVaccineYear2', 'growthIncreasing'],
      },
    ],
  },
  24: {
    milestoneMonths: 24,
    milestoneLabel: '24 Months Follow-up',
    shortLabel: '24 Months',
    sectionTitle: 'Development & Growth at 24 Months',
    questions: [
      question('indicatesToiletNeed', 'Can indicate need to visit toilet'),
      question('jumpsInPlace', 'Jumps in place'),
      question('brushesTeethWithHelp', 'Brushes teeth with help'),
      question('differentiatesBigAndSmall', 'Differentiates between big and small'),
      question('genderIdentification', 'Gender identification'),
      question('doctorVisitDone', 'Doctor visit done'),
      question('vaccinesUpdated', 'Vaccines updated'),
      question('growthIncreasing', 'Height / Weight / Head Circumference increasing'),
    ],
    sections: [
      {
        sectionKey: 'independence_movement',
        title: 'Independence & Movement',
        questionMetricKeys: ['indicatesToiletNeed', 'jumpsInPlace', 'brushesTeethWithHelp'],
      },
      {
        sectionKey: 'recognition_learning',
        title: 'Recognition & Learning',
        questionMetricKeys: ['differentiatesBigAndSmall', 'genderIdentification'],
      },
      {
        sectionKey: 'clinical_growth',
        title: 'Doctor Review, Vaccines & Growth',
        questionMetricKeys: ['doctorVisitDone', 'vaccinesUpdated', 'growthIncreasing'],
      },
    ],
  },
};

export function getFollowupQuestionnaire(milestoneMonths: number): FollowupQuestionnaireDefinition {
  return FOLLOWUP_QUESTIONNAIRES[milestoneMonths as FollowupMilestoneMonth] || FOLLOWUP_QUESTIONNAIRES[3];
}

export function getFollowupMilestoneLabel(milestoneMonths: number): string {
  return getFollowupQuestionnaire(milestoneMonths).milestoneLabel;
}

export function sortMilestonesBySourceOrder<T extends Pick<FollowupMilestone, 'milestoneMonths'>>(milestones: T[]): T[] {
  const orderMap = new Map(FOLLOWUP_MILESTONE_ORDER.map((months, index) => [months, index]));
  return [...milestones].sort((a, b) => (orderMap.get(a.milestoneMonths) ?? 99) - (orderMap.get(b.milestoneMonths) ?? 99));
}

export function isFollowupResponseValue(value?: string | null): value is FollowupResponseValue {
  return value === 'Yes' || value === 'No' || value === 'Not Checked / Not Known';
}

export function computeFollowupDueDate(anchorDate: string, milestoneMonths: FollowupMilestoneMonth): string {
  const baseDate = new Date(anchorDate);
  const dueDate = new Date(baseDate);
  dueDate.setMonth(dueDate.getMonth() + milestoneMonths);
  return dueDate.toISOString().split('T')[0];
}

export function getQuestionAnswerMetricKeys(milestoneMonths: number): string[] {
  return getFollowupQuestionnaire(milestoneMonths).questions.map((questionItem) => questionItem.metricKey);
}

export function getQuestionNoteMetricKeys(milestoneMonths: number): string[] {
  return getFollowupQuestionnaire(milestoneMonths).questions.map((questionItem) => questionItem.noteMetricKey).filter(Boolean) as string[];
}

export function getAllMilestoneMetricKeys(milestoneMonths: number): string[] {
  return [
    ...getQuestionAnswerMetricKeys(milestoneMonths),
    ...getQuestionNoteMetricKeys(milestoneMonths),
    ...FOLLOWUP_REMARK_FIELDS.map((field) => field.metricKey),
    ...Object.values(FOLLOWUP_META_KEYS),
  ];
}

export function getMetricValueText(values: FollowupMetricValue[], metricKey: string): string {
  return values.find((value) => value.metricKey === metricKey)?.valueText?.trim() || '';
}

export function buildFollowupMetricIndex(values: FollowupMetricValue[]): Record<string, FollowupMetricValue> {
  return values.reduce<Record<string, FollowupMetricValue>>((acc, value) => {
    acc[value.metricKey] = value;
    return acc;
  }, {});
}

export function getFollowupQuestionResponse(values: FollowupMetricValue[], metricKey: string): FollowupResponseValue | '' {
  const response = getMetricValueText(values, metricKey);
  return isFollowupResponseValue(response) ? response : '';
}

export function getFollowupQuestionNote(values: FollowupMetricValue[], metricKey: string): string {
  const questionnaire = Object.values(FOLLOWUP_QUESTIONNAIRES).find((item) =>
    item.questions.some((questionItem) => questionItem.metricKey === metricKey),
  );
  const questionItem = questionnaire?.questions.find((item) => item.metricKey === metricKey);
  return questionItem?.noteMetricKey ? getMetricValueText(values, questionItem.noteMetricKey) : '';
}

export function getSectionProgress(milestoneMonths: number, values: FollowupMetricValue[]): FollowupSectionProgress[] {
  const questionnaire = getFollowupQuestionnaire(milestoneMonths);
  return questionnaire.sections.map((section) => {
    const answeredCount = section.questionMetricKeys.filter((metricKey) => !!getFollowupQuestionResponse(values, metricKey)).length;
    return {
      sectionKey: section.sectionKey,
      title: section.title,
      answeredCount,
      totalQuestions: section.questionMetricKeys.length,
      completionPercent: section.questionMetricKeys.length
        ? Math.round((answeredCount / section.questionMetricKeys.length) * 100)
        : 0,
    };
  });
}

function getNormalizedDateOnly(value?: string): string | undefined {
  if (!value) return undefined;
  return value.includes('T') ? value.split('T')[0] : value;
}

function getFirstMeaningfulSummary(questionnaire: FollowupQuestionnaireDefinition, values: FollowupMetricValue[]): string | undefined {
  const summary = getMetricValueText(values, FOLLOWUP_META_KEYS.summary);
  if (summary) return summary;

  const redFlags = getMetricValueText(values, FOLLOWUP_META_KEYS.redFlags);
  if (redFlags) return redFlags;

  const keyObservations = getMetricValueText(values, FOLLOWUP_META_KEYS.keyObservations);
  if (keyObservations) return keyObservations;

  for (const field of FOLLOWUP_REMARK_FIELDS) {
    const text = getMetricValueText(values, field.metricKey);
    if (text) return text;
  }

  for (const questionItem of questionnaire.questions) {
    const response = getFollowupQuestionResponse(values, questionItem.metricKey);
    if (response === 'No') {
      return `Needs attention: ${questionItem.label}`;
    }
    if (response === 'Not Checked / Not Known') {
      return `Not checked: ${questionItem.label}`;
    }
  }

  const yesCount = questionnaire.questions.filter((questionItem) => getFollowupQuestionResponse(values, questionItem.metricKey) === 'Yes').length;
  if (yesCount > 0) {
    return `${yesCount} of ${questionnaire.questions.length} milestone checks recorded as Yes.`;
  }

  return undefined;
}

export function deriveFollowupMilestoneSnapshot(milestone: FollowupMilestone, values: FollowupMetricValue[]): FollowupMilestoneSnapshot {
  const questionnaire = getFollowupQuestionnaire(milestone.milestoneMonths);
  const answeredCount = questionnaire.questions.filter((questionItem) => !!getFollowupQuestionResponse(values, questionItem.metricKey)).length;
  const questionCount = questionnaire.questions.length;
  const completionPercent = questionCount ? Math.round((answeredCount / questionCount) * 100) : 0;
  const followupDate = getNormalizedDateOnly(getMetricValueText(values, FOLLOWUP_META_KEYS.followupDate)) || getNormalizedDateOnly(milestone.followupDate);
  const dueDate = getNormalizedDateOnly(milestone.dueDate) || milestone.dueDate;
  const dueReached = dueDate <= new Date().toISOString().split('T')[0];
  const savedStatus = getMetricValueText(values, FOLLOWUP_META_KEYS.questionnaireStatus);

  let status: FollowupMilestoneStatus = 'Upcoming';
  if (savedStatus === 'Completed' || followupDate) {
    status = 'Completed';
  } else if (
    answeredCount > 0 ||
    FOLLOWUP_REMARK_FIELDS.some((field) => !!getMetricValueText(values, field.metricKey)) ||
    !!getMetricValueText(values, FOLLOWUP_META_KEYS.keyObservations) ||
    !!getMetricValueText(values, FOLLOWUP_META_KEYS.redFlags) ||
    !!getMetricValueText(values, FOLLOWUP_META_KEYS.escalationNote) ||
    !!getMetricValueText(values, FOLLOWUP_META_KEYS.summary)
  ) {
    status = 'In Progress';
  } else if (dueReached) {
    status = 'Due';
  }

  const summary = getFirstMeaningfulSummary(questionnaire, values);
  const notes = getMetricValueText(values, 'doctorRemarks') || milestone.notes;

  return {
    milestoneId: milestone.milestoneId,
    caseId: milestone.caseId,
    milestoneMonths: milestone.milestoneMonths,
    dueDate,
    followupDate,
    status,
    notes,
    summary,
    answeredCount,
    questionCount,
    completionPercent,
    completedAt: getNormalizedDateOnly(getMetricValueText(values, FOLLOWUP_META_KEYS.completedAt)) || milestone.completedAt,
    completedBy: getMetricValueText(values, FOLLOWUP_META_KEYS.completedBy) || milestone.completedBy,
    keyObservations: getMetricValueText(values, FOLLOWUP_META_KEYS.keyObservations) || milestone.keyObservations,
    redFlags: getMetricValueText(values, FOLLOWUP_META_KEYS.redFlags) || milestone.redFlags,
    escalationNote: getMetricValueText(values, FOLLOWUP_META_KEYS.escalationNote) || milestone.escalationNote,
    createdAt: milestone.createdAt,
    updatedAt: getMetricValueText(values, FOLLOWUP_META_KEYS.updatedAt) || milestone.updatedAt,
    buttonLabel:
      status === 'Completed'
        ? 'Reopen Questionnaire'
        : status === 'In Progress'
          ? 'Continue Questionnaire'
          : 'Open Questionnaire',
  };
}
