import type { FollowupMilestone } from '../types';

export const FOLLOWUP_MILESTONE_ORDER = [3, 6, 9, 12, 18, 24] as const;

export type FollowupMilestoneMonth = (typeof FOLLOWUP_MILESTONE_ORDER)[number];
export type FollowupResponseValue = 'Yes' | 'No' | 'Not Checked / Not Known';

export interface FollowupQuestionDefinition {
  metricKey: string;
  label: string;
}

export interface FollowupQuestionnaireDefinition {
  milestoneMonths: FollowupMilestoneMonth;
  milestoneLabel: string;
  shortLabel: string;
  sectionTitle: string;
  questions: FollowupQuestionDefinition[];
}

export const FOLLOWUP_RESPONSE_OPTIONS: readonly FollowupResponseValue[] = ['Yes', 'No', 'Not Checked / Not Known'] as const;

export const FOLLOWUP_REMARK_FIELDS = [
  { metricKey: 'doctorRemarks', label: 'Doctor remarks' },
  { metricKey: 'parentWorries', label: 'Any worries of the parent' },
  { metricKey: 'contactWorries', label: 'Any worries noted during contact' },
] as const;

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
      { metricKey: 'smilesAtMother', label: 'Smiles at mother' },
      { metricKey: 'turnsHeadAtLoudSound', label: 'Turns head at loud sound' },
      { metricKey: 'eyesFollowMovement', label: 'Eyes follow movement of person / object' },
      { metricKey: 'vaccinesUpdated', label: 'Vaccines updated' },
      { metricKey: 'influenzaVaccineYear1', label: 'Influenza vaccine taken for Year 1' },
      { metricKey: 'growthIncreasing', label: 'Height / Weight / Head Circumference increasing' },
    ],
  },
  6: {
    milestoneMonths: 6,
    milestoneLabel: '6 Months Follow-up',
    shortLabel: '6 Months',
    sectionTitle: 'Development & Growth at 6 Months',
    questions: [
      { metricKey: 'headSteadyControlled', label: 'Head steady / controlled' },
      { metricKey: 'rollsBackToStomach', label: 'Rolls from back to stomach' },
      { metricKey: 'transfersObjectHandToHand', label: 'Transfers object from hand to hand' },
      { metricKey: 'vaccinesUpdated', label: 'Vaccines updated' },
      { metricKey: 'growthIncreasing', label: 'Height / Weight / Head Circumference increasing' },
    ],
  },
  9: {
    milestoneMonths: 9,
    milestoneLabel: '9 Months Follow-up',
    shortLabel: '9 Months',
    sectionTitle: 'Development & Growth at 9 Months',
    questions: [
      { metricKey: 'sitsAndStandsWithSupport', label: 'Able to sit and stand with support' },
      { metricKey: 'picksObjectsWithThumbFinger', label: 'Picks spoon / object with thumb and finger' },
      { metricKey: 'throwsObjects', label: 'Throws balls / objects' },
      { metricKey: 'vaccinesUpdated', label: 'Vaccines updated' },
      { metricKey: 'growthIncreasing', label: 'Height / Weight / Head Circumference increasing' },
    ],
  },
  12: {
    milestoneMonths: 12,
    milestoneLabel: '12 Months Follow-up',
    shortLabel: '12 Months',
    sectionTitle: 'Development & Growth at 12 Months',
    questions: [
      { metricKey: 'babblesAndResponds', label: 'Babbles and responds' },
      { metricKey: 'walksWithHelp', label: 'Walks with help' },
      { metricKey: 'vaccinesUpdated', label: 'Vaccines updated' },
      { metricKey: 'growthIncreasing', label: 'Height / Weight / Head Circumference increasing' },
      { metricKey: 'eyesightHearingChecked', label: 'Eyesight and hearing checked' },
    ],
  },
  18: {
    milestoneMonths: 18,
    milestoneLabel: '18 Months Follow-up',
    shortLabel: '18 Months',
    sectionTitle: 'Development & Growth at 18 Months',
    questions: [
      { metricKey: 'walks', label: 'Walks' },
      { metricKey: 'speaksTwoToThreeWords', label: 'Able to speak 2 to 3 words' },
      { metricKey: 'walksUpTheStairs', label: 'Walks up the stairs' },
      { metricKey: 'walksBackwards', label: 'Walks backwards' },
      { metricKey: 'identifiesObjects', label: 'Identifies objects' },
      { metricKey: 'doctorVisitDone', label: 'Doctor visit done' },
      { metricKey: 'vaccinesUpdated', label: 'Vaccines updated' },
      { metricKey: 'influenzaVaccineYear2', label: 'Influenza vaccine taken for Year 2' },
      { metricKey: 'growthIncreasing', label: 'Height / Weight / Head Circumference increasing' },
    ],
  },
  24: {
    milestoneMonths: 24,
    milestoneLabel: '24 Months Follow-up',
    shortLabel: '24 Months',
    sectionTitle: 'Development & Growth at 24 Months',
    questions: [
      { metricKey: 'indicatesToiletNeed', label: 'Can indicate need to visit toilet' },
      { metricKey: 'jumpsInPlace', label: 'Jumps in place' },
      { metricKey: 'brushesTeethWithHelp', label: 'Brushes teeth with help' },
      { metricKey: 'differentiatesBigAndSmall', label: 'Differentiates between big and small' },
      { metricKey: 'genderIdentification', label: 'Gender identification' },
      { metricKey: 'doctorVisitDone', label: 'Doctor visit done' },
      { metricKey: 'vaccinesUpdated', label: 'Vaccines updated' },
      { metricKey: 'growthIncreasing', label: 'Height / Weight / Head Circumference increasing' },
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
