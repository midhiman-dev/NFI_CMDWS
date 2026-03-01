function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

export function parseFlexibleDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;

  const str = value.trim();
  if (!str) return null;

  const ddmmyyyy = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(str);
  return isValidDate(d) ? d : null;
}

export function formatDateDMY(value: string | Date | null | undefined): string {
  const d = parseFlexibleDate(value);
  if (!d) return '\u2014';
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatDateTimeDMY(value: string | Date | null | undefined): string {
  const d = parseFlexibleDate(value);
  if (!d) return '\u2014';
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
