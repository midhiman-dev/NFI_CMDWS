import { parseNumberInput } from './fieldValue';

export const APGAR_MIN = 0;
export const APGAR_MAX = 10;

export function parseIntegerInput(rawValue: string): number | undefined {
  return parseNumberInput(rawValue, value => parseInt(value, 10));
}

export function parseCurrencyInput(rawValue: string): number | undefined {
  return parseNumberInput(rawValue, value => parseInt(value, 10));
}

export function parseBirthWeightInput(rawValue: string): number | undefined {
  return parseNumberInput(rawValue, value => parseFloat(value));
}

export function parseApgarInput(rawValue: string): number | undefined {
  const parsed = parseIntegerInput(rawValue);
  if (parsed === undefined) return undefined;
  if (parsed < APGAR_MIN || parsed > APGAR_MAX) return undefined;
  return parsed;
}

export function toInbornOutbornValue(value?: boolean): '' | 'inborn' | 'outborn' {
  if (value === true) return 'inborn';
  if (value === false) return 'outborn';
  return '';
}

export function fromInbornOutbornValue(value: string): boolean | undefined {
  if (value === 'inborn') return true;
  if (value === 'outborn') return false;
  return undefined;
}

export function toYesNoValue(value?: boolean): '' | 'yes' | 'no' {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
}

export function fromYesNoValue(value: string): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}
