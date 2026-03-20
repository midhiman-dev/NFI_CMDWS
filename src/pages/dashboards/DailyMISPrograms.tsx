import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import { getAuthState } from '../../utils/auth';
import { filterCasesForAuth } from '../../utils/roleAccess';
import {
  DAILY_MIS_DEMO_ROWS,
  MIS_DEMO_DATE,
  MIS_DEMO_LAST_REFRESH,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDateTime,
  getDailyMisStatusSummary,
  getMonthDateRange,
  getMonthLabel,
  isDemoDailyDate,
  sameMonth,
  toCSV,
  type DailyMisCaseRow,
} from '../../utils/misReporting';
import type { CaseWithDetails } from '../../data/providers/DataProvider';

function mapCaseStatusToDailyMisStatus(caseStatus: CaseWithDetails['caseStatus']): DailyMisCaseRow['status'] {
  if (caseStatus === 'Approved' || caseStatus === 'Closed') return 'Approved';
  if (caseStatus === 'Rejected') return 'Rejected';
  if (caseStatus === 'Submitted' || caseStatus === 'Under_Verification' || caseStatus === 'Returned') return 'Documentation';
  return 'Enquiry';
}

function formatBabyName(caseItem: CaseWithDetails) {
  return caseItem.childName || (caseItem.motherName ? `Baby of ${caseItem.motherName}` : caseItem.caseRef);
}

export function DailyMISPrograms() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const authState = getAuthState();
  const authScopeKey = `${authState.activeRole || 'none'}:${authState.activeUser?.userId || 'anon'}:${authState.activeUser?.hospitalId || 'all'}`;
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(MIS_DEMO_DATE);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        const allCases = await provider.listCases();
        const scopedCases = filterCasesForAuth(authState, allCases);
        setCases(scopedCases);
        setLastRefresh(new Date().toISOString());
      } catch (error) {
        console.error('Error loading Daily MIS Programs:', error);
        showToast(t('reports.loadFailed', { defaultValue: 'Failed to load Daily MIS - Programs' }), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [authScopeKey, provider, showToast]);

  const selected = new Date(selectedDate);
  const selectedYear = selected.getFullYear();
  const selectedMonth = selected.getMonth() + 1;
  const selectedFiscalYear = `${selectedMonth >= 4 ? selectedYear : selectedYear - 1}-${String(((selectedMonth >= 4 ? selectedYear : selectedYear - 1) + 1) % 100).padStart(2, '0')}`;

  const liveRows = useMemo<DailyMisCaseRow[]>(() => {
    return cases
      .filter((item) => sameMonth(item.lastActionAt || item.updatedAt || item.intakeDate, selectedFiscalYear, String(selectedMonth)))
      .map((item) => {
        const relevantDate = item.lastActionAt || item.updatedAt || item.intakeDate;
        return {
          rowId: item.caseId,
          date: relevantDate.split('T')[0],
          babyName: formatBabyName(item),
          hospitalName: item.hospitalName || 'Unknown Hospital',
          status: mapCaseStatusToDailyMisStatus(item.caseStatus),
          sponsorAmount: item.approvedAmount || 0,
          activeDays: [new Date(relevantDate).getDate()],
        };
      });
  }, [cases, selectedFiscalYear, selectedMonth]);

  const rows = useMemo(
    () => (liveRows.length > 0 ? liveRows : isDemoDailyDate(selectedDate) ? DAILY_MIS_DEMO_ROWS : []),
    [liveRows, selectedDate],
  );

  const summaryRows = useMemo(() => getDailyMisStatusSummary(rows), [rows]);
  const monthDays = useMemo(() => getMonthDateRange(selectedYear, selectedMonth), [selectedMonth, selectedYear]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'daily-mis-programs',
        templateCode: 'DAILY_MIS_PROGRAMS',
        templateName: 'Daily MIS - Programs',
        filters: { date: selectedDate },
        dataAsOf: new Date(selectedDate),
      });

      downloadCSV(
        toCSV(
          ['Sl.No', 'Date', 'Baby Name', 'Hospital Name', 'Status', 'Sponsor amount', ...monthDays.map((day) => day.toISOString().split('T')[0])],
          rows.map((row, index) => [
            index + 1,
            row.date,
            row.babyName,
            row.hospitalName,
            row.status,
            row.sponsorAmount,
            ...monthDays.map((day) => (row.activeDays.includes(day.getDate()) ? 'Marked' : '')),
          ]),
        ),
        `Daily_MIS_Programs_${formatDownloadTimestamp()}`,
      );
      showToast(t('reports.downloadStarted', { defaultValue: 'Download started' }), 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting Daily MIS Programs:', error);
      showToast(t('reports.exportFailed', { defaultValue: 'Failed to export report' }), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title={t('reports.backToReports', { defaultValue: 'Back to Reports' })}>
            <ArrowLeft size={20} className="text-[var(--nfi-text)]" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{t('reports.surfaces.DAILY_MIS_PROGRAMS.title', { defaultValue: 'Daily MIS - Programs' })}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              Daily MIS layout aligned to the source template: status summary at top and a selected-month day grid below.
            </p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('common.date')}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              />
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Selected month</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">{getMonthLabel(selectedMonth)} {selectedYear}</p>
              <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)] mt-2">
                <RefreshCw size={14} />
                {t('common.lastRefresh')}: {formatMISDateTime(rows.length > 0 && liveRows.length === 0 ? MIS_DEMO_LAST_REFRESH : lastRefresh)}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {exporting ? t('common.exporting', { defaultValue: 'Exporting...' }) : t('common.exportDownload', { defaultValue: 'Export / Download' })}
              </button>
            </div>
          </div>
        </NfiCard>

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Status Summary</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
              Uses the source template order: Approved, Rejected, Documentation, Enquiry.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Count</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.status} className="border-b border-[var(--nfi-border)]">
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{row.status}</td>
                    <td className="py-3 px-4 text-right text-[var(--nfi-text)]">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NfiCard>

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Daily MIS - Programs (Month View)</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
              Fixed case columns are followed by day markers for the selected month, matching the intended template structure.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">{t('common.loadingData')}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-[var(--nfi-text-secondary)]">No daily MIS rows are available for the selected month.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1400px]">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Sl.No</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Baby Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Hospital Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Sponsor amount</th>
                    {monthDays.map((day) => (
                      <th key={day.toISOString()} className="text-center py-3 px-2 font-semibold text-[var(--nfi-text)]">
                        {day.getDate()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.rowId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{index + 1}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.date}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.babyName}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.hospitalName}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.status}</td>
                      <td className="py-3 px-4 text-right text-[var(--nfi-text)]">{formatCurrencyCompact(row.sponsorAmount)}</td>
                      {monthDays.map((day) => (
                        <td key={`${row.rowId}-${day.toISOString()}`} className="py-3 px-2 text-center">
                          {row.activeDays.includes(day.getDate()) ? (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-medium text-blue-700">
                              {row.status.charAt(0)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}
