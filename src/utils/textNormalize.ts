import { CASE_SUBTITLE_SEPARATOR } from '../constants/ui';

export function normalizeSeparator(text: string): string {
  return text
    .replace(/â€¢|•|&bull;|&#8226;/g, CASE_SUBTITLE_SEPARATOR)
    .replace(/\s+-\s+-\s+/g, CASE_SUBTITLE_SEPARATOR);
}

