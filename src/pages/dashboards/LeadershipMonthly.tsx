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
  FISCAL_YEAR_OPTIONS,
  LEADERSHIP_MIS_DEMO_ROWS,
  MIS_KPI_LABELS,
  MIS_DEMO_FISCAL_YEAR,
  MIS_DEMO_LAST_REFRESH,
  MIS_DEMO_MONTH,
  MONTH_OPTIONS,
  calculateConversionRatio,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDateTime,
  isDemoLeadershipPeriod,
  sameMonth,
  toCSV,
  type LeadershipRow,
} from '../../utils/misReporting';
import type { CaseWithDetails } from '../../data/providers/DataProvider';

export function LeadershipMonthly() {
  const navigate = useNavigate();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const authState = getAuthState();
  const authScopeKey = `${authState.activeRole || 'none'}:${authState.activeUser?.userId || 'anon'}:${authState.activeUser?.hospitalId || 'all'}`;
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [selectedFY, setSelectedFY] = useState<string>(MIS_DEMO_FISCAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<string>(MIS_DEMO_MONTH);
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
        console.error('Error loading Leadership MIS:', error);
        showToast('Failed to load Monthly MIS - Leadership Team', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [authScopeKey, provider, showToast]);

  const filteredCases = useMemo(
    () => cases.filter((item) => sameMonth(item.intakeDate, selectedFY, selectedMonth)),
    [cases, selectedFY, selectedMonth],
  );

  const liveRows = useMemo<LeadershipRow[]>(() => {
    const grouped = new Map<string, LeadershipRow>();
    filteredCases.forEach((item) => {
      const key = item.hospitalName || 'Unassigned Unit';
      const current = grouped.get(key) || {
        orgUnit: key,
        totalEnquires: 0,
        approvedCases: 0,
        rejectedCases: 0,
        approvedValue: 0,
      };
      current.totalEnquires += 1;
      if (item.caseStatus === 'Approved' || item.caseStatus === 'Closed') current.approvedCases += 1;
      if (item.caseStatus === 'Rejected') current.rejectedCases += 1;
      current.approvedValue += item.approvedAmount || 0;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.totalEnquires - a.totalEnquires);
  }, [filteredCases]);

  const rows = useMemo(
    () => (liveRows.length > 0 ? liveRows : isDemoLeadershipPeriod(selectedFY, selectedMonth) ? LEADERSHIP_MIS_DEMO_ROWS : []),
    [liveRows, selectedFY, selectedMonth],
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
        templateId: 'leadership-monthly',
        templateCode: 'MONTHLY_MIS_LEADERSHIP',
        templateName: 'Monthly MIS - Leadership Team',
        filters: {
          fiscalYear: selectedFY,
          month: Number(selectedMonth),
        },
        dataAsOf: new Date(`${selectedFY.slice(0, 4)}-${selectedMonth.padStart(2, '0')}-01`),
      });
      downloadCSV(
        toCSV(
          ['District / Org Unit', MIS_KPI_LABELS.totalEnquires, MIS_KPI_LABELS.approvedCases, MIS_KPI_LABELS.rejectedCases, MIS_KPI_LABELS.conversionRatio, 'Approved Value'],
          rows.map((row) => [
            row.orgUnit,
            row.totalEnquires,
            row.approvedCases,
            row.rejectedCases,
            `${calculateConversionRatio(row.approvedCases, row.totalEnquires)}%`,
            row.approvedValue,
          ]),
        ),
        `Leadership_Monthly_MIS_${formatDownloadTimestamp()}`,
      );
      showToast('Download started', 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting Leadership MIS:', error);
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Monthly MIS - Leadership Team</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Donor-safe monthly rollup with aggregate-only KPIs for leadership review.</p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Fiscal Year</label>
              <select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]">
                {FISCAL_YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">Month</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]">
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Data as of</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">
                {MONTH_OPTIONS.find((option) => option.value === selectedMonth)?.label} {selectedFY}
              </p>
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
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Monthly Rollup Grid</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">Aggregate-only monthly MIS intended for leadership review and donor-safe exports.</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading data...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-[var(--nfi-text-secondary)]">No monthly rollup data is available for the selected period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">District / Org Unit</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.totalEnquires}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.approvedCases}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.rejectedCases}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.conversionRatio}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.orgUnit} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.orgUnit}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.totalEnquires}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.approvedCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.rejectedCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{calculateConversionRatio(row.approvedCases, row.totalEnquires)}%</td>
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
