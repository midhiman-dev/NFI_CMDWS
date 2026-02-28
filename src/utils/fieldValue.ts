export function isEmptyNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return true;
    }
    return Number.isNaN(Number(trimmed));
  }

  return true;
}

export function isPresentNumber(value: unknown): boolean {
  return !isEmptyNumber(value);
}

export function isPresentText(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export function isPresentFieldValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return isPresentNumber(value);
  }

  if (typeof value === 'string') {
    return isPresentText(value);
  }

  return value !== null && value !== undefined;
}

export function parseNumberInput(
  rawValue: string,
  parser: (value: string) => number = Number
): number | undefined {
  if (rawValue.trim() === '') {
    return undefined;
  }

  const parsed = parser(rawValue);
  return Number.isNaN(parsed) ? undefined : parsed;
}
