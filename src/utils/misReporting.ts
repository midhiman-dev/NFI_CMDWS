import type { ReportRun, UserRole } from '../types';
import { formatDateFriendly, formatDateTimeFriendly } from './dateFormat';

export const MIS_KPI_LABELS = {
  totalEnquires: 'Total Enquires',
  approvedCases: 'Approved Cases',
  rejectedCases: 'Rejected Cases',
  conversionRatio: 'Conversion Ratio',
} as const;

export const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const;

export const FISCAL_YEAR_OPTIONS = ['2024-25', '2023-24', '2022-23'] as const;

export const MIS_DEMO_DATE = '2024-12-15';
export const MIS_DEMO_FISCAL_YEAR = '2024-25';
export const MIS_DEMO_MONTH = '12';
export const MIS_DEMO_LAST_REFRESH = '2024-12-16T15:35:00';

export interface MisReportSurface {
  path: string;
  code: string;
  title: string;
  subtitle: string;
  cadence: string;
  roles: UserRole[];
}

export interface DailyProgramRow {
  programLabel: string;
  totalEnquires: number;
  approvedCases: number;
  rejectedCases: number;
  pendingCases: number;
  approvedValue: number;
}

export interface LeadershipRow {
  orgUnit: string;
  totalEnquires: number;
  approvedCases: number;
  rejectedCases: number;
  approvedValue: number;
}

export interface AccountsLedgerRow {
  date: string;
  voucherId: string;
  caseRef: string;
  account: string;
  type: string;
  amount: number;
  status: string;
  remarks: string;
}

export interface HospitalRow {
  hospitalName: string;
  totalEnquires: number;
  approvedCases: number;
  rejectedCases: number;
  approvedValue: number;
}

export const MIS_REPORT_SURFACES: MisReportSurface[] = [
  {
    path: '/reports/daily-mis-programs',
    code: 'DAILY_MIS_PROGRAMS',
    title: 'Daily MIS - Programs',
    subtitle: 'Daily operational view with case event counts, conversions, and lightweight program rollups.',
    cadence: 'Daily',
    roles: ['accounts', 'leadership', 'admin'],
  },
  {
    path: '/reports/leadership-monthly',
    code: 'MONTHLY_MIS_LEADERSHIP',
    title: 'Monthly MIS - Leadership Team',
    subtitle: 'Donor-safe monthly rollup with organisation-level MIS KPIs and export-ready monthly framing.',
    cadence: 'Monthly',
    roles: ['leadership', 'admin'],
  },
  {
    path: '/reports/accounts-mis-daily',
    code: 'ACCOUNTS_MIS',
    title: 'Accounts MIS',
    subtitle: 'Daily finance snapshot with voucher-style ledger rows and cash movement summaries.',
    cadence: 'Daily',
    roles: ['accounts', 'admin'],
  },
  {
    path: '/reports/hospital-mis-monthly',
    code: 'HOSPITAL_MIS_MONTHLY',
    title: 'Hospital MIS - Monthly',
    subtitle: 'Hospital-wise monthly scorecard using the agreed core MIS case KPIs and totals as on date.',
    cadence: 'Monthly',
    roles: ['accounts', 'leadership', 'admin'],
  },
];

export const DAILY_MIS_DEMO_ROWS: DailyProgramRow[] = [
  { programLabel: 'BRC Program', totalEnquires: 18, approvedCases: 12, rejectedCases: 2, pendingCases: 4, approvedValue: 540000 },
  { programLabel: 'BRRC Program', totalEnquires: 11, approvedCases: 8, rejectedCases: 1, pendingCases: 2, approvedValue: 325000 },
  { programLabel: 'BGRC Program', totalEnquires: 9, approvedCases: 6, rejectedCases: 1, pendingCases: 2, approvedValue: 210000 },
  { programLabel: 'BCRC Program', totalEnquires: 7, approvedCases: 5, rejectedCases: 1, pendingCases: 1, approvedValue: 265000 },
];

export const LEADERSHIP_MIS_DEMO_ROWS: LeadershipRow[] = [
  { orgUnit: 'Ahmedabad Region', totalEnquires: 46, approvedCases: 33, rejectedCases: 5, approvedValue: 1425000 },
  { orgUnit: 'Surat Region', totalEnquires: 39, approvedCases: 29, rejectedCases: 4, approvedValue: 1180000 },
  { orgUnit: 'Vadodara Region', totalEnquires: 31, approvedCases: 22, rejectedCases: 3, approvedValue: 910000 },
  { orgUnit: 'Rajkot Region', totalEnquires: 24, approvedCases: 17, rejectedCases: 2, approvedValue: 675000 },
];

export const HOSPITAL_MIS_DEMO_ROWS: HospitalRow[] = [
  { hospitalName: 'City Medical Center', totalEnquires: 21, approvedCases: 15, rejectedCases: 2, approvedValue: 640000 },
  { hospitalName: 'District Women and Child Hospital', totalEnquires: 18, approvedCases: 13, rejectedCases: 2, approvedValue: 515000 },
  { hospitalName: 'Sharda Children Hospital', totalEnquires: 14, approvedCases: 10, rejectedCases: 1, approvedValue: 405000 },
  { hospitalName: 'Sunrise NICU Institute', totalEnquires: 11, approvedCases: 8, rejectedCases: 1, approvedValue: 355000 },
];

export const ACCOUNTS_MIS_DEMO_ROWS: AccountsLedgerRow[] = [
  { date: MIS_DEMO_DATE, voucherId: 'VCH-241215-01', caseRef: 'NFI/BRC/2024/0189', account: 'BRC Fund', type: 'Approval Voucher', amount: 125000, status: 'Released', remarks: 'City Medical Center / Approved' },
  { date: MIS_DEMO_DATE, voucherId: 'VCH-241215-02', caseRef: 'NFI/BRRC/2024/0117', account: 'BRRC Fund', type: 'Approval Voucher', amount: 98000, status: 'Released', remarks: 'District Women and Child Hospital / Approved' },
  { date: MIS_DEMO_DATE, voucherId: 'VCH-241215-03', caseRef: 'NFI/BGRC/2024/0046', account: 'BGRC Fund', type: 'Approval Voucher', amount: 45000, status: 'Released', remarks: 'Sharda Children Hospital / Approved' },
  { date: MIS_DEMO_DATE, voucherId: 'VCH-241215-04', caseRef: 'NFI/BRC/2024/0194', account: 'BRC Fund', type: 'Pending Finance Review', amount: 0, status: 'Pending', remarks: 'Sunrise NICU Institute / Under Review' },
  { date: MIS_DEMO_DATE, voucherId: 'VCH-241215-05', caseRef: 'NFI/BCRC/2024/0079', account: 'BCRC Fund', type: 'Reversal Entry', amount: -22000, status: 'Reversed', remarks: 'Rejected case adjustment' },
];

export function calculateConversionRatio(approvedCases: number, totalEnquires: number): number {
  if (totalEnquires <= 0) return 0;
  return Number(((approvedCases / totalEnquires) * 100).toFixed(1));
}

export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 100000) {
    return `Rs ${(amount / 100000).toFixed(1)}L`;
  }
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

export function formatDownloadTimestamp(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}${min}`;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function toCSV(headers: string[], rows: Array<Array<string | number>>): string {
  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}

export function formatDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatMISDate(value: string | Date | null | undefined): string {
  return formatDateFriendly(value);
}

export function formatMISDateTime(value: string | Date | null | undefined): string {
  return formatDateTimeFriendly(value);
}

export function toFiscalYearLabel(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  const nextYearShort = String((year + 1) % 100).padStart(2, '0');
  return `${year}-${nextYearShort}`;
}

export function sameDay(dateString: string, selectedDate: string): boolean {
  return dateString.split('T')[0] === selectedDate;
}

export function sameMonth(dateString: string, fiscalYear: string, month: string): boolean {
  const date = new Date(dateString);
  return toFiscalYearLabel(dateString) === fiscalYear && date.getMonth() + 1 === Number(month);
}

export function latestDateValue(values: string[]): string {
  return values
    .map((value) => value.split('T')[0])
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || formatDateInputValue(new Date());
}

export function latestTimestamp(runs: ReportRun[]): string | null {
  if (runs.length === 0) return null;
  const latest = [...runs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  return latest.generatedAt || latest.updatedAt || null;
}

export function isDemoLeadershipPeriod(fiscalYear: string, month: string): boolean {
  return fiscalYear === MIS_DEMO_FISCAL_YEAR && month === MIS_DEMO_MONTH;
}

export function isDemoDailyDate(date: string): boolean {
  return date === MIS_DEMO_DATE;
}
