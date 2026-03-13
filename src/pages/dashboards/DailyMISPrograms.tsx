import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import { getAuthState } from '../../utils/auth';
import { filterCasesForAuth } from '../../utils/roleAccess';
import {
  DAILY_MIS_DEMO_ROWS,
  MIS_KPI_LABELS,
  MIS_DEMO_DATE,
  MIS_DEMO_LAST_REFRESH,
  calculateConversionRatio,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDate,
  formatMISDateTime,
  isDemoDailyDate,
  sameDay,
  toCSV,
  type DailyProgramRow,
} from '../../utils/misReporting';
import type { CaseWithDetails } from '../../data/providers/DataProvider';

export function DailyMISPrograms() {
  const navigate = useNavigate();
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
        showToast('Failed to load Daily MIS - Programs', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [authScopeKey, provider, showToast]);

  const filteredCases = useMemo(
    () => cases.filter((item) => sameDay(item.lastActionAt || item.updatedAt || item.intakeDate, selectedDate)),
    [cases, selectedDate],
  );

  const liveRows = useMemo<DailyProgramRow[]>(() => {
    const grouped = new Map<string, DailyProgramRow>();
    filteredCases.forEach((item) => {
      const key = item.processType || 'General';
      const current = grouped.get(key) || {
        programLabel: key === 'NON_BRC' ? 'Other Programs' : `${key} Program`,
        totalEnquires: 0,
        approvedCases: 0,
        rejectedCases: 0,
        pendingCases: 0,
        approvedValue: 0,
      };
      current.totalEnquires += 1;
      if (item.caseStatus === 'Approved' || item.caseStatus === 'Closed') current.approvedCases += 1;
      else if (item.caseStatus === 'Rejected') current.rejectedCases += 1;
      else current.pendingCases += 1;
      current.approvedValue += item.approvedAmount || 0;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.totalEnquires - a.totalEnquires);
  }, [filteredCases]);

  const rows = useMemo(
    () => (liveRows.length > 0 ? liveRows : isDemoDailyDate(selectedDate) ? DAILY_MIS_DEMO_ROWS : []),
    [liveRows, selectedDate],
  );

  const summary = useMemo(() => {
    const totalEnquires = rows.reduce((sum, row) => sum + row.totalEnquires, 0);
    const approvedCases = rows.reduce((sum, row) => sum + row.approvedCases, 0);
    const rejectedCases = rows.reduce((sum, row) => sum + row.rejectedCases, 0);
    return {
      totalEnquires,
      approvedCases,
      rejectedCases,
      conversionRatio: calculateConversionRatio(approvedCases, totalEnquires),
    };
  }, [rows]);

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
          ['Program', MIS_KPI_LABELS.totalEnquires, MIS_KPI_LABELS.approvedCases, MIS_KPI_LABELS.rejectedCases, MIS_KPI_LABELS.conversionRatio, 'Pending Cases', 'Approved Value'],
          rows.map((row) => [
            row.programLabel,
            row.totalEnquires,
            row.approvedCases,
            row.rejectedCases,
            `${calculateConversionRatio(row.approvedCases, row.totalEnquires)}%`,
            row.pendingCases,
            row.approvedValue,
          ]),
        ),
        `Daily_MIS_Programs_${formatDownloadTimestamp()}`,
      );
      showToast('Download started', 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting Daily MIS Programs:', error);
      showToast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to Reports">
            <ArrowLeft size={20} className="text-[var(--nfi-text)]" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Daily MIS - Programs</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Daily operational MIS with case-event counts, pending workload, and lightweight funding visibility.</p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              />
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Data as of</p>
                <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">{formatMISDate(selectedDate)}</p>
              <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)] mt-2">
                <RefreshCw size={14} />
                Last refresh: {formatMISDateTime(rows.length > 0 && liveRows.length === 0 ? MIS_DEMO_LAST_REFRESH : lastRefresh)}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export / Download'}
              </button>
            </div>
          </div>
        </NfiCard>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MisMetricCard label={MIS_KPI_LABELS.totalEnquires} value={summary.totalEnquires} />
          <MisMetricCard label={MIS_KPI_LABELS.approvedCases} value={summary.approvedCases} />
          <MisMetricCard label={MIS_KPI_LABELS.rejectedCases} value={summary.rejectedCases} />
          <MisMetricCard label={MIS_KPI_LABELS.conversionRatio} value={`${summary.conversionRatio}%`} />
        </div>

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Operational Grid</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">Counts are tied to case activity on the selected date and grouped into daily program buckets.</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading data...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-[var(--nfi-text-secondary)]">No daily program activity found for the selected date.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Program Bucket</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.totalEnquires}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.approvedCases}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.rejectedCases}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.conversionRatio}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Pending Cases</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.programLabel} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.programLabel}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.totalEnquires}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.approvedCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.rejectedCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{calculateConversionRatio(row.approvedCases, row.totalEnquires)}%</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.pendingCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.approvedValue)}</td>
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

function MisMetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <NfiCard className="bg-white border border-[var(--nfi-border)]">
      <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">{label}</p>
      <p className="text-3xl font-bold text-[var(--nfi-text)] mt-2">{value}</p>
    </NfiCard>
  );
}
