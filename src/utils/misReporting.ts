import type { ReportRun, UserRole } from '../types';
import { formatDateFriendly, formatDateTimeFriendly } from './dateFormat';

export const MIS_KPI_LABELS = {
  totalEnquires: 'Number of Enquiries',
  approvedCases: 'Number of Approval',
  rejectedCases: 'Number of Rejections',
  conversionRatio: 'Conversion Rate (% AvR)',
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
export const FISCAL_MONTH_ORDER = ['4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

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

export interface DailyMisStatusSummaryRow {
  status: 'Approved' | 'Rejected' | 'Documentation' | 'Enquiry';
  count: number;
}

export interface DailyMisCaseRow {
  rowId: string;
  date: string;
  babyName: string;
  hospitalName: string;
  status: DailyMisStatusSummaryRow['status'];
  sponsorAmount: number;
  activeDays: number[];
}

export interface LeadershipMonthlyRow {
  month: string;
  beneficiaryEnquiries: number;
  beneficiaryApproved: number;
  partnerHospitalIdentified: number;
  partnerHospitalStatus: string;
  donationIndividuals: number;
  donationCSR: number;
  donationFamilyFoundation: number;
  donationCfNFI: number;
  donationCampaigns: number;
  donationTotal: number;
  programCost: number;
  opsCost: number;
  ratio: string;
}

export interface AccountsMisRow {
  date: string;
  babiesCompletedTillDate: number;
  babiesCompletedCurrentMonth: number;
  inquiries: number;
  rejected: number;
  inPipeline: number;
  partnerCompleted: number;
  partnerInPipeline: number;
  fundsRaisedCurrentMonth: number;
  fundsRaisedDaily: number;
  bankAsOnDate: number;
  fdAsOnDate: number;
  totalFunds: number;
  committedBabies: number;
  committedAmount: number;
  totalFundsAvailable: number;
  programSpend: number;
  operationsSpend: number;
  ratio: string;
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
    subtitle: 'Status summary plus the month-wise day-grid structure used in the MIS template.',
    cadence: 'Daily',
    roles: ['accounts', 'leadership', 'admin'],
  },
  {
    path: '/reports/leadership-monthly',
    code: 'MONTHLY_MIS_LEADERSHIP',
    title: 'Monthly MIS - Leadership Team',
    subtitle: 'NFI monthly performance dashboard grouped by beneficiary, partner hospitals, donations, and cost ratio.',
    cadence: 'Monthly',
    roles: ['leadership', 'admin'],
  },
  {
    path: '/reports/accounts-mis-daily',
    code: 'ACCOUNTS_MIS',
    title: 'Accounts MIS',
    subtitle: 'Month-wise finance and operations snapshot with daily rows and grouped funds columns.',
    cadence: 'Monthly',
    roles: ['accounts', 'admin'],
  },
  {
    path: '/reports/hospital-mis-monthly',
    code: 'HOSPITAL_MIS_MONTHLY',
    title: 'Hospital MIS - Monthly',
    subtitle: 'Hospital-wise monthly scorecard using the agreed monthly enquiry, approval, rejection, and conversion structure.',
    cadence: 'Monthly',
    roles: ['accounts', 'leadership', 'admin'],
  },
];

export const DAILY_MIS_DEMO_ROWS: DailyMisCaseRow[] = [
  {
    rowId: 'daily-1',
    date: '2024-12-03',
    babyName: 'Baby of Anita Das',
    hospitalName: 'City Medical Center',
    status: 'Approved',
    sponsorAmount: 125000,
    activeDays: [3, 5, 8, 12],
  },
  {
    rowId: 'daily-2',
    date: '2024-12-07',
    babyName: 'Baby of Lakshmi Iyer',
    hospitalName: 'District Women and Child Hospital',
    status: 'Documentation',
    sponsorAmount: 98000,
    activeDays: [7, 9, 10],
  },
  {
    rowId: 'daily-3',
    date: '2024-12-11',
    babyName: 'Baby of Meera Rao',
    hospitalName: 'Sharda Children Hospital',
    status: 'Rejected',
    sponsorAmount: 0,
    activeDays: [11, 14],
  },
  {
    rowId: 'daily-4',
    date: '2024-12-15',
    babyName: 'Baby of Kavya Shah',
    hospitalName: 'Sunrise NICU Institute',
    status: 'Enquiry',
    sponsorAmount: 65000,
    activeDays: [15, 18, 21, 24],
  },
];

export const LEADERSHIP_MIS_DEMO_ROWS: LeadershipMonthlyRow[] = [
  { month: 'April', beneficiaryEnquiries: 42, beneficiaryApproved: 28, partnerHospitalIdentified: 12, partnerHospitalStatus: 'Active', donationIndividuals: 680000, donationCSR: 450000, donationFamilyFoundation: 225000, donationCfNFI: 160000, donationCampaigns: 90000, donationTotal: 1605000, programCost: 1280000, opsCost: 245000, ratio: '5.2:1' },
  { month: 'May', beneficiaryEnquiries: 46, beneficiaryApproved: 31, partnerHospitalIdentified: 13, partnerHospitalStatus: 'Active', donationIndividuals: 710000, donationCSR: 500000, donationFamilyFoundation: 240000, donationCfNFI: 175000, donationCampaigns: 110000, donationTotal: 1735000, programCost: 1365000, opsCost: 258000, ratio: '5.3:1' },
  { month: 'June', beneficiaryEnquiries: 44, beneficiaryApproved: 29, partnerHospitalIdentified: 13, partnerHospitalStatus: 'Active', donationIndividuals: 690000, donationCSR: 520000, donationFamilyFoundation: 210000, donationCfNFI: 170000, donationCampaigns: 95000, donationTotal: 1685000, programCost: 1320000, opsCost: 252000, ratio: '5.2:1' },
  { month: 'July', beneficiaryEnquiries: 49, beneficiaryApproved: 33, partnerHospitalIdentified: 14, partnerHospitalStatus: 'Active', donationIndividuals: 735000, donationCSR: 540000, donationFamilyFoundation: 260000, donationCfNFI: 185000, donationCampaigns: 120000, donationTotal: 1840000, programCost: 1440000, opsCost: 266000, ratio: '5.4:1' },
  { month: 'August', beneficiaryEnquiries: 52, beneficiaryApproved: 36, partnerHospitalIdentified: 15, partnerHospitalStatus: 'Active', donationIndividuals: 760000, donationCSR: 575000, donationFamilyFoundation: 275000, donationCfNFI: 190000, donationCampaigns: 130000, donationTotal: 1930000, programCost: 1515000, opsCost: 279000, ratio: '5.4:1' },
  { month: 'September', beneficiaryEnquiries: 47, beneficiaryApproved: 32, partnerHospitalIdentified: 15, partnerHospitalStatus: 'Active', donationIndividuals: 720000, donationCSR: 550000, donationFamilyFoundation: 255000, donationCfNFI: 182000, donationCampaigns: 118000, donationTotal: 1825000, programCost: 1420000, opsCost: 268000, ratio: '5.3:1' },
  { month: 'October', beneficiaryEnquiries: 50, beneficiaryApproved: 35, partnerHospitalIdentified: 16, partnerHospitalStatus: 'Active', donationIndividuals: 745000, donationCSR: 585000, donationFamilyFoundation: 265000, donationCfNFI: 195000, donationCampaigns: 126000, donationTotal: 1916000, programCost: 1490000, opsCost: 281000, ratio: '5.3:1' },
  { month: 'November', beneficiaryEnquiries: 45, beneficiaryApproved: 30, partnerHospitalIdentified: 16, partnerHospitalStatus: 'Active', donationIndividuals: 700000, donationCSR: 530000, donationFamilyFoundation: 248000, donationCfNFI: 178000, donationCampaigns: 112000, donationTotal: 1768000, programCost: 1385000, opsCost: 264000, ratio: '5.2:1' },
  { month: 'December', beneficiaryEnquiries: 48, beneficiaryApproved: 34, partnerHospitalIdentified: 16, partnerHospitalStatus: 'Active', donationIndividuals: 730000, donationCSR: 560000, donationFamilyFoundation: 258000, donationCfNFI: 188000, donationCampaigns: 121000, donationTotal: 1857000, programCost: 1450000, opsCost: 272000, ratio: '5.3:1' },
  { month: 'Total', beneficiaryEnquiries: 423, beneficiaryApproved: 288, partnerHospitalIdentified: 16, partnerHospitalStatus: 'As on date', donationIndividuals: 6470000, donationCSR: 4810000, donationFamilyFoundation: 2236000, donationCfNFI: 1623000, donationCampaigns: 1022000, donationTotal: 16161000, programCost: 12665000, opsCost: 2385000, ratio: '5.3:1' },
];

export const HOSPITAL_MIS_DEMO_ROWS: HospitalRow[] = [
  { hospitalName: 'City Medical Center', totalEnquires: 21, approvedCases: 15, rejectedCases: 2, approvedValue: 640000 },
  { hospitalName: 'District Women and Child Hospital', totalEnquires: 18, approvedCases: 13, rejectedCases: 2, approvedValue: 515000 },
  { hospitalName: 'Sharda Children Hospital', totalEnquires: 14, approvedCases: 10, rejectedCases: 1, approvedValue: 405000 },
  { hospitalName: 'Sunrise NICU Institute', totalEnquires: 11, approvedCases: 8, rejectedCases: 1, approvedValue: 355000 },
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

export function getMonthLabel(month: string | number): string {
  return MONTH_OPTIONS.find((option) => option.value === String(month))?.label || String(month);
}

export function getMonthDateRange(year: number, month: number): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1));
}

export function getFiscalYearMonthRows(): LeadershipMonthlyRow[] {
  return LEADERSHIP_MIS_DEMO_ROWS;
}

export function getDailyMisStatusSummary(rows: DailyMisCaseRow[]): DailyMisStatusSummaryRow[] {
  const counts: Record<DailyMisStatusSummaryRow['status'], number> = {
    Approved: 0,
    Rejected: 0,
    Documentation: 0,
    Enquiry: 0,
  };

  rows.forEach((row) => {
    counts[row.status] += 1;
  });

  return Object.entries(counts).map(([status, count]) => ({
    status: status as DailyMisStatusSummaryRow['status'],
    count,
  }));
}

export function buildAccountsMisDemoRows(year: number, month: number): AccountsMisRow[] {
  const dates = getMonthDateRange(year, month);
  let bankRunning = 2450000;
  let fdRunning = 900000;
  let totalAvailableRunning = 2580000;

  return dates.map((date, index) => {
    const day = index + 1;
    const fundsRaisedDaily = day % 5 === 0 ? 95000 : day % 3 === 0 ? 65000 : 30000;
    const committedAmount = 420000 + index * 18000;
    const programSpend = 980000 + index * 24000;
    const operationsSpend = 182000 + index * 4500;

    bankRunning += fundsRaisedDaily - 18000;
    fdRunning += day % 9 === 0 ? 10000 : 0;
    totalAvailableRunning += fundsRaisedDaily - 12000;

    return {
      date: date.toISOString().split('T')[0],
      babiesCompletedTillDate: 110 + index,
      babiesCompletedCurrentMonth: 3 + Math.floor(index / 4),
      inquiries: 12 + (index % 6),
      rejected: 1 + (index % 3 === 0 ? 1 : 0),
      inPipeline: 5 + (index % 4),
      partnerCompleted: 14 + Math.floor(index / 7),
      partnerInPipeline: 3 + (index % 2),
      fundsRaisedCurrentMonth: 520000 + index * 65000,
      fundsRaisedDaily,
      bankAsOnDate: bankRunning,
      fdAsOnDate: fdRunning,
      totalFunds: bankRunning + fdRunning,
      committedBabies: 7 + Math.floor(index / 5),
      committedAmount,
      totalFundsAvailable: totalAvailableRunning,
      programSpend,
      operationsSpend,
      ratio: `${(programSpend / Math.max(operationsSpend, 1)).toFixed(1)}:1`,
    };
  });
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

export function isDemoLeadershipPeriod(fiscalYear: string, month?: string): boolean {
  if (month) {
    return fiscalYear === MIS_DEMO_FISCAL_YEAR && month === MIS_DEMO_MONTH;
  }
  return fiscalYear === MIS_DEMO_FISCAL_YEAR;
}

export function isDemoDailyDate(date: string): boolean {
  return date === MIS_DEMO_DATE;
}
