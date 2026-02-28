import { isPresentFieldValue } from './fieldValue';

export interface DerivedMaternalFields {
  maritalStatus?: string;
  motherAge?: number;
  yearsMarried?: number;
}

export function parseDateFlexible(value: string | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  const isoDateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})T/.exec(trimmed);
  if (isoDateTimeMatch) {
    const year = Number(isoDateTimeMatch[1]);
    const month = Number(isoDateTimeMatch[2]);
    const day = Number(isoDateTimeMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year = Number(displayMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  // Normalize to a calendar date to avoid timezone-induced day shifts.
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function diffFullYears(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  const dayDiff = to.getDate() - from.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }

  return Math.max(0, years);
}

export function deriveMaternalFields(
  motherDob: string | undefined,
  marriageDate: string | undefined,
  asOfDate: Date
): DerivedMaternalFields {
  const motherDobDate = parseDateFlexible(motherDob);
  const marriageDateParsed = parseDateFlexible(marriageDate);

  const derived: DerivedMaternalFields = {};

  if (motherDobDate) {
    derived.motherAge = diffFullYears(motherDobDate, asOfDate);
  }

  if (marriageDateParsed) {
    derived.yearsMarried = diffFullYears(marriageDateParsed, asOfDate);
    derived.maritalStatus = 'Married';
  }

  return derived;
}

export function isEmptyDerivedValue(value: unknown): boolean {
  return !isPresentFieldValue(value);
}
