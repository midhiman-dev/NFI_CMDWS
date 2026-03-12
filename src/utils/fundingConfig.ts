export const FUNDING_PROGRAM_OPTIONS = [
  'Core NICU Support',
  'Emergency Support',
  'Growth Follow-up',
  'Other',
] as const;

export const FUNDING_CAMPAIGN_OPTIONS = [
  'TBC',
  'SRT',
  'TBA',
  'TBD',
] as const;

export function toCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `INR ${value.toLocaleString()}`;
}

